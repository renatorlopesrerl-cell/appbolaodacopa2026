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

        return jsonResponse({ 
            success: topicSuccess, 
            topicResult
        });

    } catch (e: any) {
        console.error('Error on send-mass-push:', e);
        return errorResponse(e);
    }
};
