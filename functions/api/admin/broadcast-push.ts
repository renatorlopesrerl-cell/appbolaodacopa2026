import { jsonResponse, errorResponse, getSupabaseClient, getAccessToken } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data, waitUntil } = context;

    try {
        const authUser = data.user;
        if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

        // Somente Super Admin pode disparar broadcast
        const supabase = getSupabaseClient(env);
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', authUser.id)
            .single();

        if (!profile?.is_admin) {
            return errorResponse(new Error("Forbidden"), 403);
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const body = await request.json();
        const { title, message } = body;

        if (!title || !message) {
            return jsonResponse({ error: 'Title and message are required' }, 400);
        }

        // Env check (FCM v1)
        const hasV1Keys = env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY;
        if (!hasV1Keys) {
            return jsonResponse({
                success: false,
                message: "ERRO: Credenciais FCM v1 não configuradas no Cloudflare."
            }, 500);
        }

        // Get all unique FCM tokens
        const { data: tokenRows, error: tokenError } = await supabase
            .from('user_fcm_tokens')
            .select('token');

        if (tokenError) throw tokenError;

        let tokens = [...new Set((tokenRows || []).map((r: any) => r.token).filter((t: string) => t && t.trim() !== ''))];

        // Also get legacy tokens from profiles
        const { data: profileRows } = await supabase
            .from('profiles')
            .select('fcm_token');
        
        if (profileRows) {
            profileRows.forEach((p: any) => {
                if (p.fcm_token && p.fcm_token.trim() !== '' && !tokens.includes(p.fcm_token)) {
                    tokens.push(p.fcm_token);
                }
            });
        }

        if (tokens.length === 0) {
            return jsonResponse({ success: false, message: "Nenhum token encontrado no banco de dados." });
        }

        // Processamento em Background
        waitUntil(processBroadcast(env, tokens, title, message));

        return jsonResponse({ 
            success: true, 
            message: `Envio de notificação para ${tokens.length} dispositivos iniciado com sucesso.` 
        });

    } catch (e: any) {
        return errorResponse(e);
    }
}

async function processBroadcast(env: any, tokens: string[], title: string, body: string) {
    try {
        console.log(`[Broadcast Push] Iniciando envio para ${tokens.length} tokens.`);
        const accessToken = await getAccessToken(env);
        const projectId = (env.FCM_PROJECT_ID || "batepapobase").trim();
        
        const CHUNK_SIZE = 50; // Tamanho seguro para evitar bloqueio por concorrência excessiva
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
            const chunk = tokens.slice(i, i + CHUNK_SIZE);
            
            const promises = chunk.map(token => {
                return fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`
                    },
                    body: JSON.stringify({
                        message: {
                            token: token.trim(),
                            notification: { title, body },
                            data: { click_action: "FLUTTER_NOTIFICATION_CLICK" },
                            android: { priority: "high" },
                            webpush: {
                                headers: { Urgency: "high" },
                                notification: {
                                    title: title,
                                    body: body,
                                    icon: "https://bolaodacopa2026.app/favicon.png"
                                }
                            }
                        }
                    })
                }).then(res => res.json().then(data => ({ status: res.status, ok: res.ok, data })))
                  .catch(err => ({ status: 500, ok: false, error: err }));
            });

            const results = await Promise.all(promises);
            results.forEach(r => {
                if (r.ok) successCount++;
                else failCount++;
            });

            // Pequena pausa entre lotes para evitar throttling da API do Google
            if (i + CHUNK_SIZE < tokens.length) {
                await new Promise(res => setTimeout(res, 200));
            }
        }

        console.log(`[Broadcast Push] Finalizado. Sucessos: ${successCount}, Falhas: ${failCount}`);
    } catch (error) {
        console.error(`[Broadcast Push] Erro crítico no background process:`, error);
    }
}
