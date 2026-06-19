import { jsonResponse, errorResponse, getSupabaseClient, getAccessToken, processBulkNotifications } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data } = context;

    try {
        const authUser = data.user;
        if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

        // Somente Super Admin ou Admin de Partidas podem disparar
        const supabase = getSupabaseClient(env);
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, is_match_admin')
            .eq('id', authUser.id)
            .single();

        if (!profile?.is_admin && !profile?.is_match_admin) {
            return errorResponse(new Error("Forbidden"), 403);
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const body = await request.json();
        const { title, message, urlData, targetTopic } = body;

        const topicName = targetTopic || 'todos_palpiteiros';

        if (!title || !message) {
            return jsonResponse({ error: 'Title e message são obrigatórios' }, 400);
        }

        // 1. Enviar para Tópico Firebase (Aplicativos Android/iOS)
        let topicSuccess = false;
        let topicResult = null;
        try {
            const accessToken = await getAccessToken(env);
            const projectId = env.FCM_PROJECT_ID;
            const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
            
            const payload = {
                message: {
                    topic: topicName,
                    notification: {
                        title: title,
                        body: message
                    },
                    data: urlData || {}
                }
            };

            const response = await fetch(fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            topicResult = await response.json();
            if (response.ok) {
                topicSuccess = true;
                console.log('Sucesso ao enviar push para o tópico:', topicResult);
            } else {
                console.error('Erro ao enviar push para tópico Firebase:', topicResult);
            }
        } catch (err) {
            console.error('Falha crítica ao enviar push para tópico:', err);
        }

        // 2. Enviar via Tokens Individuais (Fallback para Web e Apps Desatualizados)
        let webSuccess = false;
        let webResult = null;
        try {
            const fetchAll = async (table: string, column: string, eqColumn?: string, eqValue?: string) => {
                let allRows: any[] = [];
                let hasMore = true;
                let page = 0;
                const PAGE_SIZE = 1000;
                while (hasMore) {
                    let query = supabase.from(table).select(column).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                    if (eqColumn && eqValue) {
                        query = query.eq(eqColumn, eqValue);
                    }
                    const { data, error } = await query;
                    if (error) throw error;
                    if (data && data.length > 0) {
                        allRows.push(...data);
                        page++;
                        if (data.length < PAGE_SIZE) hasMore = false;
                    } else {
                        hasMore = false;
                    }
                }
                return allRows;
            };

            // Fetch all profiles to apply preference filtering
            const profiles = await fetchAll('profiles', 'id, fcm_token, notification_settings');
            
            // Determine which setting to check based on the topic
            const allowedUserIds = new Set();
            const allowedProfileTokens = new Set();

            if (profiles) {
                profiles.forEach((p: any) => {
                    let allowed = true;
                    if (topicName === 'topic_prediction_reminder') {
                        allowed = p.notification_settings?.predictionReminder !== false;
                    } else if (topicName === 'topic_match_start') {
                        allowed = p.notification_settings?.matchStart !== false;
                    } else if (topicName === 'topic_match_end') {
                        allowed = p.notification_settings?.matchEnd !== false;
                    }
                    
                    if (allowed) {
                        allowedUserIds.add(p.id);
                        if (p.fcm_token && p.fcm_token.trim() !== '') {
                            allowedProfileTokens.add(p.fcm_token);
                        }
                    }
                });
            }

            const tokenRows = await fetchAll('user_fcm_tokens', 'token, user_id', 'device_type', 'web');
            
            // Only add tokens for users who are allowed
            let allTokens = [...new Set((tokenRows || [])
                .filter((r: any) => allowedUserIds.has(r.user_id) && r.token && r.token.trim() !== '')
                .map((r: any) => r.token))];

            // Add profile tokens that are allowed
            allowedProfileTokens.forEach((t: any) => {
                if (!allTokens.includes(t)) {
                    allTokens.push(t);
                }
            });

            if (allTokens.length > 0) {
                console.log(`Fallback Tokens: enviando para ${allTokens.length} tokens (Web + Legacy)`);
                // Enviar em lotes de 300 para não estourar o limite de CPU/Memória da Supabase Edge Function
                const CHUNK_SIZE = 300;
                const chunks = [];
                for (let i = 0; i < allTokens.length; i += CHUNK_SIZE) {
                    chunks.push(allTokens.slice(i, i + CHUNK_SIZE));
                }
                
                // Dispara os lotes em paralelo
                const results = await Promise.all(chunks.map(chunk => 
                    processBulkNotifications(env, chunk, title, message, urlData)
                ));
                
                webSuccess = results.some(r => r.success);
                webResult = { message: `Enviados ${chunks.length} lotes de até ${CHUNK_SIZE} tokens.` };
            } else {
                webSuccess = true;
                webResult = { message: 'Nenhum token encontrado para fallback' };
            }
        } catch (err) {
            console.error('Falha crítica ao processar push web:', err);
        }

        return jsonResponse({ 
            success: topicSuccess || webSuccess, 
            topicResult,
            webResult
        });

    } catch (e: any) {
        console.error('Error on send-mass-push:', e);
        return errorResponse(e);
    }
};
