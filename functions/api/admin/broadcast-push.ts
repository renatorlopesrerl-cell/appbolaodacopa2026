import { jsonResponse, errorResponse, getSupabaseClient, getAccessToken } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data } = context;

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
        const { action, title, message, tokens } = body;

        // Env check (FCM v1)
        const hasV1Keys = env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY;
        if (!hasV1Keys) {
            return jsonResponse({
                success: false,
                message: "ERRO: Credenciais FCM v1 não configuradas no Cloudflare."
            }, 500);
        }

        // Action: Obter todos os tokens para o frontend orquestrar os lotes
        if (action === 'get_tokens') {
            const fetchAll = async (table: string, column: string) => {
                let allRows: any[] = [];
                let hasMore = true;
                let page = 0;
                const PAGE_SIZE = 1000;
                while (hasMore) {
                    const { data, error } = await supabase
                        .from(table)
                        .select(column)
                        .order(column)
                        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
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

            const tokenRows = await fetchAll('user_fcm_tokens', 'token');
            let allTokens = [...new Set((tokenRows || []).map((r: any) => r.token).filter((t: string) => t && t.trim() !== ''))];

            const profileRows = await fetchAll('profiles', 'fcm_token');
            if (profileRows) {
                profileRows.forEach((p: any) => {
                    if (p.fcm_token && p.fcm_token.trim() !== '' && !allTokens.includes(p.fcm_token)) {
                        allTokens.push(p.fcm_token);
                    }
                });
            }

            return jsonResponse({ 
                success: true, 
                tokens: allTokens 
            });
        }

        // Action: Enviar um lote específico de tokens (limitado a 40 para não estourar o limite de 50 subrequests do Cloudflare Pages)
        if (action === 'send_chunk') {
            if (!title || !message || !tokens || !Array.isArray(tokens)) {
                return jsonResponse({ error: 'Title, message e array de tokens são obrigatórios para send_chunk' }, 400);
            }

            if (tokens.length > 40) {
                return jsonResponse({ error: 'Limite de 40 tokens por requisição excedido.' }, 400);
            }

            await processBroadcastSync(env, tokens, title, message);
            
            return jsonResponse({ 
                success: true, 
                message: `Lote de ${tokens.length} enviado com sucesso.` 
            });
        }

        return jsonResponse({ error: 'Ação inválida' }, 400);

    } catch (e: any) {
        return errorResponse(e);
    }
}

async function processBroadcastSync(env: any, tokens: string[], title: string, body: string) {
    try {
        const accessToken = await getAccessToken(env);
        const projectId = (env.FCM_PROJECT_ID || "batepapobase").trim();
        
        const promises = tokens.map(token => {
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

        await Promise.all(promises);
    } catch (error) {
        console.error(`[Broadcast Push] Erro crítico no envio do lote:`, error);
        throw error;
    }
}
