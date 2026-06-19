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
        const { title, message, urlData } = body;

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
                    topic: 'todos_palpiteiros',
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

        // 2. Enviar via Tokens para Web PWA (Fallback)
        let webSuccess = false;
        let webResult = null;
        try {
            // Buscar tokens web
            const { data: webTokens } = await supabase
                .from('user_fcm_tokens')
                .select('token')
                .eq('device_type', 'web');

            if (webTokens && webTokens.length > 0) {
                const tokens = [...new Set(webTokens.map((t: any) => t.token))];
                console.log(`Fallback Web: enviando para ${tokens.length} tokens web`);
                webResult = await processBulkNotifications(env, tokens, title, message, urlData);
                webSuccess = webResult?.success || false;
            } else {
                webSuccess = true; // No web users, so it's a success
                webResult = { message: 'Nenhum token web encontrado' };
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
