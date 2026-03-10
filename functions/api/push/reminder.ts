
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

        // Find matches starting in the next 25-35 minutes
        const now = new Date();
        const windowStart = new Date(now.getTime() + 25 * 60 * 1000).toISOString();
        const windowEnd = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

        const { data: upcomingMatches, error: matchError } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id, date')
            .eq('status', 'SCHEDULED')
            .gte('date', windowStart)
            .lte('date', windowEnd);

        if (matchError) {
            console.error("Error fetching upcoming matches:", matchError);
            return errorResponse(matchError);
        }

        if (!upcomingMatches || upcomingMatches.length === 0) {
            return jsonResponse({ success: true, message: "No matches in reminder window", sent: 0 });
        }

        // Get all users with push tokens who want prediction reminders
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, notification_settings')
            .not('fcm_token', 'is', null);

        if (!profiles || profiles.length === 0) {
            return jsonResponse({ success: true, message: "No profiles with tokens", sent: 0 });
        }

        // Filter profiles that want prediction reminders
        const wantsReminder = profiles.filter(p => {
            const settings = p.notification_settings || {};
            return settings.predictionReminder !== false;
        });

        if (wantsReminder.length === 0) {
            return jsonResponse({ success: true, message: "No users want reminders", sent: 0 });
        }

        // Get all predictions for these matches
        const matchIds = upcomingMatches.map(m => m.id);
        const userIds = wantsReminder.map(p => p.id);

        const { data: existingPredictions } = await supabase
            .from('predictions')
            .select('user_id, match_id')
            .in('match_id', matchIds)
            .in('user_id', userIds);

        // Build a set of "userId:matchId" for quick lookup
        const predictionSet = new Set(
            (existingPredictions || []).map(p => `${p.user_id}:${p.match_id}`)
        );

        let sentCount = 0;
        const tasks: Promise<any>[] = [];

        for (const match of upcomingMatches) {
            const matchLabel = `${match.home_team_id} x ${match.away_team_id}`;

            for (const profile of wantsReminder) {
                const key = `${profile.id}:${match.id}`;
                if (!predictionSet.has(key)) {
                    // User doesn't have a prediction for this match in any league
                    tasks.push(
                        sendPushNotificationToUser(
                            env,
                            profile.id,
                            "Lembrete de Palpite ⏳",
                            `Faltam 30 min! Faça seu palpite para ${matchLabel}`,
                            { url: '/table' }
                        ).catch(err => console.error(`Reminder push failed for ${profile.id}:`, err))
                    );
                    sentCount++;
                }
            }
        }

        await Promise.all(tasks);

        return jsonResponse({
            success: true,
            message: `Reminders sent`,
            matches: upcomingMatches.length,
            sent: sentCount
        });

    } catch (e: any) {
        console.error("Reminder Error:", e);
        return errorResponse(e);
    }
}
