import { getUserClient, jsonResponse, errorResponse, getSupabaseClient, extractTokens, processBulkNotifications } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data, waitUntil } = context;
    try {
        // middleware handles admin check
        const userClient = getUserClient(env, request);

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { id, ...updates } = body;

            if (!id) throw new Error("Match ID required");

            // 1. Get previous status to detect changes
            const { data: oldMatch } = await userClient.from('matches').select('status, home_team_id, away_team_id').eq('id', id).single();

            const { error } = await userClient.from('matches').update(updates).eq('id', id);
            if (error) throw error;

            // 2. Trigger Push Notifications on status change
            if (oldMatch && updates.status && updates.status !== oldMatch.status) {
                const home = oldMatch.home_team_id;
                const away = oldMatch.away_team_id;

                let title = "";
                let bodyText = "";

                if (updates.status === 'IN_PROGRESS') {
                    title = "Jogo Iniciado! ⚽";
                    bodyText = `A partida entre ${home} x ${away} começou!`;
                } else if (updates.status === 'FINISHED') {
                    title = "Fim de Jogo! 🏁";
                    bodyText = `Resultado final: ${home} ${updates.home_score} x ${updates.away_score} ${away}`;
                }

                if (title) {
                    const supabase = getSupabaseClient(env);
                    
                    // Fetch profiles and tokens for bulk push
                    const { data: users } = await supabase.from('profiles').select('id, notification_settings, fcm_token');
                    const { data: tokenRows } = await supabase.from('user_fcm_tokens').select('user_id, token');

                    if (users) {
                        const userIdsToNotify = users
                            .filter((u: any) => {
                                const settings = u.notification_settings || {};
                                const wantsStart = updates.status === 'IN_PROGRESS' && settings.matchStart !== false;
                                const wantsEnd = updates.status === 'FINISHED' && settings.matchEnd !== false;
                                return wantsStart || wantsEnd;
                            })
                            .map((u: any) => u.id);

                        const tokensToNotify = extractTokens(userIdsToNotify, users, tokenRows);

                        if (tokensToNotify.length > 0) {
                            // Run the bulk notification in the background
                            waitUntil(processBulkNotifications(env, tokensToNotify, title, bodyText, { url: '/table' }));
                        }
                    }
                }
            }

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
