
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from '../_shared';

/**
 * Webhook for Supabase (Native UI Webhook compatible)
 */
export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    if (request.method !== 'POST') return jsonResponse({ error: "Method not allowed" }, 405);

    try {
        const body = await request.json() as any;

        // Supabase Native Webhook sends several types of payloads.
        // We detect if it's coming from the UI (type/record) or our old custom system.
        const type = body.type; // INSERT, UPDATE, league_invite, etc.
        const record = body.record || body.payload;
        const old_record = body.old_record;

        // Security Check - Supports both 'secret' in body and 'x-webhook-secret' header
        const WEBHOOK_SECRET = env.WEBHOOK_SECRET || "bolao2026_secure_webhook_key";
        const incomingSecret = body.secret || request.headers.get('x-webhook-secret');

        if (incomingSecret !== WEBHOOK_SECRET) {
            console.error("Webhook Unauthorized: Invalid Secret");
            return errorResponse(new Error("Unauthorized Webhook"), 401);
        }

        const supabase = getSupabaseClient(env);

        // 1. LEAGUE EVENTS (Custom triggers)
        if (type === 'league_invite') {
            const { league_id, email, league_name, league_type = 'standard' } = record;
            const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).single();
            if (profile) {
                const url = league_type === 'brazil' ? `/brazil-league/${league_id}` : `/league/${league_id}`;
                await sendPushNotificationToUser(env, profile.id, "Novo Convite! 🏆", `Você foi convidado para participar da liga: ${league_name}`, { url });
            }
        }

        if (type === 'league_request') {
            const { league_id, league_name, user_name, admin_id, league_type = 'standard' } = record;
            if (admin_id) {
                const url = league_type === 'brazil' ? `/brazil-league/${league_id}` : `/league/${league_id}`;
                await sendPushNotificationToUser(env, admin_id, "Nova Solicitação! 📩", `${user_name} quer entrar na liga: ${league_name}`, { url });
            }
        }

        if (type === 'league_approval') {
            const { league_id, league_name, user_id, league_type = 'standard' } = record;
            if (user_id) {
                const url = league_type === 'brazil' ? `/brazil-league/${league_id}` : `/league/${league_id}`;
                await sendPushNotificationToUser(env, user_id, "Solicitação Aprovada! ✅", `Você agora participa da liga: ${league_name}`, { url });
            }
        }

        // 2. MATCH EVENTS (Native Table Updates)
        if (body.table === 'matches' || type === 'match_update') {
            const status = record.status;
            const oldStatus = old_record?.status;
            const home = record.home_team_id;
            const away = record.away_team_id;
            const homeScore = record.home_score;
            const awayScore = record.away_score;

            let title = "";
            let bodyText = "";

            // LOGIC: Only notify when status CHANGES to a target state
            if (status === 'IN_PROGRESS' && oldStatus !== 'IN_PROGRESS') {
                title = "Jogo Iniciado! ⚽";
                bodyText = `A partida entre ${home} x ${away} começou!`;
            } else if (status === 'FINISHED' && oldStatus !== 'FINISHED') {
                title = "Fim de Jogo! 🏁";
                bodyText = `Resultado final: ${home} ${homeScore} x ${awayScore} ${away}`;
            }

            if (title) {
                console.log(`[Webhook] BROADCAST: ${title} for ${home} x ${away}`);
                const { data: profiles } = await supabase.from('profiles').select('id, notification_settings');

                if (profiles) {
                    const filtered = profiles.filter(p => {
                        const settings = p.notification_settings || {};
                        if (status === 'IN_PROGRESS') return settings.matchStart !== false;
                        if (status === 'FINISHED') return settings.matchEnd !== false;
                        return false;
                    });

                    const tasks = filtered.map(profile =>
                        sendPushNotificationToUser(env, profile.id, title, bodyText, { url: '/table' })
                    );

                    const results = await Promise.allSettled(tasks);
                    const successful = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
                    console.log(`[Webhook] BROADCAST FINISHED. Success: ${successful}/${filtered.length}`);
                }
            }
        }

        return jsonResponse({ success: true, message: "Webhook processed" });

    } catch (e: any) {
        console.error("Webhook Critical Error:", e);
        return errorResponse(e);
    }
}
