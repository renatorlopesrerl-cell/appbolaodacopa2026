
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from '../_shared';

/**
 * Maintenance & Reminder Worker
 * Called by pg_cron every 5 minutes.
 * 1. Automatically transitions matches to IN_PROGRESS when time is reached.
 * 2. Sends "Match Started" push notifications.
 * 3. Sends "Prediction Reminder" push notifications 30m before kickoff.
 */
export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    if (request.method !== 'POST') return new Response("Method not allowed", { status: 405 });

    try {
        const body = await request.json() as any;
        const { secret } = body;

        // Security Check
        const WEBHOOK_SECRET = env.WEBHOOK_SECRET || "bolao2026_secure_webhook_key";
        if (secret !== WEBHOOK_SECRET) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const supabase = getSupabaseClient(env);
        const nowUtc = new Date().toISOString();
        const results = {
            startedMatches: 0,
            remindersSent: 0,
            errors: [] as string[]
        };

        // --- 1. AUTO-START MATCHES & NOTIFY ---
        const { data: matchesToStart, error: startError } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id, date')
            .eq('status', 'SCHEDULED')
            .lte('date', nowUtc);

        if (startError) {
            console.error("Error fetching matches to start:", startError);
            results.errors.push(`Fetch Start Error: ${startError.message}`);
        } else if (matchesToStart && matchesToStart.length > 0) {
            for (const match of matchesToStart) {
                // Update Status to IN_PROGRESS
                const { error: updateError } = await supabase
                    .from('matches')
                    .update({ status: 'IN_PROGRESS' })
                    .eq('id', match.id);

                if (updateError) {
                    results.errors.push(`Failed to start match ${match.id}: ${updateError.message}`);
                    continue;
                }
                
                results.startedMatches++;

                // Notify Users that match has started
                const title = "Jogo Iniciado! ⚽";
                const bodyText = `A partida entre ${match.home_team_id} x ${match.away_team_id} começou!`;
                
                // Fetch profiles with registered tokens who want start notifications
                const { data: profiles } = await supabase
                    .from('user_fcm_tokens')
                    .select('user_id')
                    .not('token', 'is', null);

                if (profiles && profiles.length > 0) {
                    // Unique user IDs
                    const userIds = [...new Set(profiles.map(p => p.user_id))];
                    
                    // Fetch settings for these users
                    const { data: userSettings } = await supabase
                        .from('profiles')
                        .select('id, notification_settings')
                        .in('id', userIds);

                    if (userSettings) {
                        const tasks = userSettings
                            .filter(p => (p.notification_settings?.matchStart ?? true) !== false)
                            .map(p => sendPushNotificationToUser(env, p.id, title, bodyText, { url: '/table' }));
                        await Promise.allSettled(tasks);
                    }
                }
            }
        }

        // --- 2. PREDICTION REMINDERS ---
        const windowStart = new Date(Date.now() + 25 * 60 * 1000).toISOString();
        const windowEnd = new Date(Date.now() + 35 * 60 * 1000).toISOString();

        const { data: upcomingMatches, error: matchError } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id, date')
            .eq('status', 'SCHEDULED')
            .gte('date', windowStart)
            .lte('date', windowEnd);

        if (matchError) {
            console.error("Error fetching upcoming matches:", matchError);
            results.errors.push(`Fetch Reminder Error: ${matchError.message}`);
        } else if (upcomingMatches && upcomingMatches.length > 0) {
            // Find all unique users with tokens
            const { data: tokenUsers } = await supabase
                .from('user_fcm_tokens')
                .select('user_id');

            if (tokenUsers && tokenUsers.length > 0) {
                const userIds = [...new Set(tokenUsers.map(p => p.user_id))];
                const { data: userSettings } = await supabase
                    .from('profiles')
                    .select('id, notification_settings')
                    .in('id', userIds);

                if (userSettings) {
                    const wantsReminder = userSettings.filter(p => (p.notification_settings?.predictionReminder ?? true) !== false);
                    
                    for (const match of upcomingMatches) {
                        const matchLabel = `${match.home_team_id} x ${match.away_team_id}`;
                        const tasks = wantsReminder.map(p => 
                            sendPushNotificationToUser(
                                env, 
                                p.id, 
                                "Lembrete de Palpite ⏳", 
                                `O jogo ${matchLabel} vai começar em 30 minutos. Revise ou faça seu palpite!`,
                                { url: '/table' }
                            ).then(res => { if (res.success) results.remindersSent++; })
                        );
                        await Promise.allSettled(tasks);
                    }
                }
            }
        }

        return jsonResponse({
            success: true,
            timestamp: nowUtc,
            results
        });

    } catch (e: any) {
        console.error("Maintenance Error:", e);
        return errorResponse(e);
    }
}
