import { getUserClient, jsonResponse, errorResponse, getSupabaseClient, extractTokens, processBulkNotifications } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data, waitUntil } = context;
    try {
        // middleware handles admin check
        const userClient = getSupabaseClient(env);

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { id } = body;

            if (!id) throw new Error("Match ID required");

            // SECURITY: Whitelist allowed fields — never pass raw body to the DB
            const { status, home_score, away_score, phase, date, location, group, reminder_30m_sent } = body;
            const safeUpdates: Record<string, any> = {};
            if (status !== undefined)           safeUpdates.status = status;
            if (home_score !== undefined)        safeUpdates.home_score = home_score;
            if (away_score !== undefined)        safeUpdates.away_score = away_score;
            if (phase !== undefined)             safeUpdates.phase = phase;
            if (date !== undefined)              safeUpdates.date = date;
            if (location !== undefined)          safeUpdates.location = location;
            if (group !== undefined)             safeUpdates.group = group;
            if (reminder_30m_sent !== undefined) safeUpdates.reminder_30m_sent = reminder_30m_sent;

            if (Object.keys(safeUpdates).length === 0) throw new Error("No valid fields to update");

            // 1. Get previous status to detect changes
            const { data: oldMatch } = await userClient.from('matches').select('status, home_team_id, away_team_id').eq('id', id).single();

            const { error } = await userClient.from('matches').update(safeUpdates).eq('id', id);
            if (error) throw error;

            // 2. Trigger Push Notifications on status change
            if (oldMatch && safeUpdates.status && safeUpdates.status !== oldMatch.status) {
                const home = oldMatch.home_team_id;
                const away = oldMatch.away_team_id;

                let title = "";
                let bodyText = "";

                if (safeUpdates.status === 'IN_PROGRESS') {
                    title = "Jogo Iniciado! ⚽";
                    bodyText = `A partida entre ${home} x ${away} começou!`;
                } else if (safeUpdates.status === 'FINISHED') {
                    title = "Fim de Jogo! 🏁";
                    bodyText = `Resultado final: ${home} ${safeUpdates.home_score ?? ''} x ${safeUpdates.away_score ?? ''} ${away}`;
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
                                const wantsStart = safeUpdates.status === 'IN_PROGRESS' && settings.matchStart !== false;
                                const wantsEnd = safeUpdates.status === 'FINISHED' && settings.matchEnd !== false;
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

            const authHeader = request.headers.get('Authorization');
            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
