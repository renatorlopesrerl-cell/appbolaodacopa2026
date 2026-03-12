
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from '../_shared';

/**
 * Prediction Reminder Push Endpoint
 * Called by Supabase pg_cron or external CRON service every 5 minutes
 * Checks for matches starting in ~30 minutes and sends reminders
 * to users who haven't made predictions yet
 */
export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    if (request.method !== 'POST') return new Response("Method not allowed", { status: 405 });

    try {
        const body = await request.json() as any;
        const { secret } = body;

        // Security Check (same as webhook)
        const WEBHOOK_SECRET = env.WEBHOOK_SECRET || "bolao2026_secure_webhook_key";
        if (secret !== WEBHOOK_SECRET) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const supabase = getSupabaseClient(env);

        // Find matches starting in the next ~30 minutes (window of 27-32 to avoid multiple triggers if cron is every 5m)
        const now = new Date();
        const windowStart = new Date(now.getTime() + 27 * 60 * 1000).toISOString();
        const windowEnd = new Date(now.getTime() + 32 * 60 * 1000).toISOString();

        const { data: upcomingMatches, error: matchError } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id, date')
            .eq('status', 'SCHEDULED')
            .gte('date', windowStart)
            .lte('date', windowEnd);

        console.log(`Checking reminders for window: ${windowStart} to ${windowEnd}. Found: ${upcomingMatches?.length || 0}`);

        if (matchError) {
            console.error("Error fetching upcoming matches:", matchError);
            return errorResponse(matchError);
        }

        if (!upcomingMatches || upcomingMatches.length === 0) {
            return jsonResponse({
                success: true,
                message: "No matches in reminder window",
                window: { start: windowStart, end: windowEnd },
                sent: 0
            });
        }

        // Fetch profiles who have a token and want reminders
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, notification_settings')
            .not('fcm_token', 'is', null);

        if (!profiles || profiles.length === 0) {
            return jsonResponse({ success: true, message: "No profiles with tokens", sent: 0 });
        }

        const wantsReminder = profiles.filter(p => {
            const settings = p.notification_settings || {};
            return settings.predictionReminder !== false;
        });

        let sentCount = 0;
        const tasks: Promise<any>[] = [];

        for (const match of upcomingMatches) {
            const matchLabel = `${match.home_team_id} x ${match.away_team_id}`;

            for (const profile of wantsReminder) {
                tasks.push(
                    sendPushNotificationToUser(
                        env,
                        profile.id,
                        "Lembrete de Palpite ⏳",
                        `O jogo ${matchLabel} vai começar em 30 minutos. Revise ou faça seu palpite!`,
                        { url: '/table' }
                    ).then(res => {
                        if (res.success) sentCount++;
                        return res;
                    }).catch(err => {
                        console.error(`Reminder push failed for ${profile.id}:`, err);
                        return { success: false };
                    })
                );
            }
        }

        await Promise.all(tasks);

        return jsonResponse({
            success: true,
            message: `Process finished`,
            window: { start: windowStart, end: windowEnd },
            matches: upcomingMatches.map(m => `${m.home_team_id} x ${m.away_team_id}`),
            sent: sentCount
        });

    } catch (e: any) {
        console.error("Reminder Error:", e);
        return errorResponse(e);
    }
}
