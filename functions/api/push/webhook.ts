
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from '../_shared';

/**
 * Webhook for Supabase Database Triggers
 * Receives events from PostgreSQL and sends pushes
 */
export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    if (request.method !== 'POST') return new Response("Method not allowed", { status: 405 });

    try {
        const body = await request.json() as any;
        const { type, payload, secret } = body;

        // Security Check
        const WEBHOOK_SECRET = env.WEBHOOK_SECRET || "bolao2026_secure_webhook_key";
        if (secret !== WEBHOOK_SECRET) {
            return errorResponse(new Error("Unauthorized Webhook"), 401);
        }

        const supabase = getSupabaseClient(env);

        if (type === 'league_invite') {
            // payload: { league_id, email, league_name }
            const { league_id, email, league_name } = payload;

            // Find user id by email
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', email)
                .single();

            if (profile) {
                await sendPushNotificationToUser(
                    env,
                    profile.id,
                    "Novo Convite! 🏆",
                    `Você foi convidado para participar da liga: ${league_name}`,
                    { url: `/league/${league_id}` }
                );
            }
        }

        if (type === 'league_request') {
            // payload: { league_id, league_name, user_name, admin_id }
            const { league_id, league_name, user_name, admin_id } = payload;

            await sendPushNotificationToUser(
                env,
                admin_id,
                "Nova Solicitação 🔔",
                `${user_name} quer entrar na liga: ${league_name}`,
                { url: `/league/${league_id}?tab=admin` }
            );
        }

        if (type === 'league_approval') {
            // payload: { league_id, league_name, user_id }
            const { league_id, league_name, user_id } = payload;

            await sendPushNotificationToUser(
                env,
                user_id,
                "Solicitação Aprovada! ✅",
                `Sua solicitação para entrar na liga "${league_name}" foi aprovada!`,
                { url: `/league/${league_id}` }
            );
        }

        if (type === 'match_update') {
            // payload: { match_id, home, away, status, home_score, away_score }
            const { home, away, status, home_score, away_score } = payload;

            let title = "";
            let bodyText = "";

            if (status === 'IN_PROGRESS') {
                title = "Jogo Iniciado! ⚽";
                bodyText = `A partida entre ${home} x ${away} começou!`;
            } else if (status === 'FINISHED') {
                title = "Fim de Jogo! 🏁";
                bodyText = `Resultado final: ${home} ${home_score} x ${away_score} ${away}`;
            }

            if (title) {
                // Fetch all profiles to check settings. 
                // The sendPushNotificationToUser function will handle finding the correct tokens (new table or old column).
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, notification_settings');

                if (profiles) {
                    // Send in parallel batches
                    const tasks = profiles
                        .filter(profile => {
                            const settings = profile.notification_settings || {};
                            const wantsStart = status === 'IN_PROGRESS' && settings.matchStart !== false;
                            const wantsEnd = status === 'FINISHED' && settings.matchEnd !== false;
                            return wantsStart || wantsEnd;
                        })
                        .map(profile => sendPushNotificationToUser(env, profile.id, title, bodyText, { url: '/table' }));

                    await Promise.allSettled(tasks);
                }
            }
        }

        return jsonResponse({ success: true, message: "Webhook processed" });

    } catch (e: any) {
        console.error("Webhook Error:", e);
        return errorResponse(e);
    }
}
