
import { getUserClient, jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from '../_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
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
                    // Send to all users who have match notifications enabled
                    const supabase = getSupabaseClient(env);
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, notification_settings')
                        .not('fcm_token', 'is', null);

                    if (profiles) {
                        for (const profile of profiles) {
                            const settings = profile.notification_settings || {};
                            const wantsStart = updates.status === 'IN_PROGRESS' && settings.matchStart !== false;
                            const wantsEnd = updates.status === 'FINISHED' && settings.matchEnd !== false;

                            if (wantsStart || wantsEnd) {
                                sendPushNotificationToUser(env, profile.id, title, bodyText, { url: '/table' }).catch(() => { });
                            }
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
