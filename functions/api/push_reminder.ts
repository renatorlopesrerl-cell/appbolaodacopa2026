
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from './_shared';

/**
 * Master Maintenance Worker (Match Starter + Notifications)
 * This worker handles THREE things:
 * 1. Starts matches (sets status to IN_PROGRESS and scores to 0x0)
 * 2. Sends "Match Started" notifications
 * 3. Sends "Prediction Reminders" (30 min before)
 */
export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    const url = new URL(request.url);
    const secretFromUrl = url.searchParams.get('secret');
    
    let secret = secretFromUrl;
    if (request.method === 'POST') {
        try {
            const body = await request.json() as any;
            secret = body.secret || secret;
        } catch (e) {}
    }

    const WEBHOOK_SECRET = env.WEBHOOK_SECRET || "bolao2026_secure_webhook_key";
    if (secret !== WEBHOOK_SECRET) {
        return errorResponse(new Error("Unauthorized"), 401);
    }

    try {
        const supabase = getSupabaseClient(env);
        const results = {
            matchesStarted: 0,
            notificationsSent: 0,
            remindersSent: 0
        };

        const now = new Date().toISOString();

        // --- 1. START MATCHES AUTOMATICALLY (Internal Logic) ---
        // We look for matches that are past their start time but still 'SCHEDULED'
        // We update them to 'IN_PROGRESS' and set score to 0x0
        const { data: toStart } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id')
            .eq('status', 'SCHEDULED')
            .lte('date', now);

        if (toStart && toStart.length > 0) {
            for (const match of toStart) {
                // Update Match to IN_PROGRESS
                const { error: updateErr } = await supabase
                    .from('matches')
                    .update({ 
                        status: 'IN_PROGRESS', 
                        home_score: 0, 
                        away_score: 0 
                    })
                    .eq('id', match.id);

                if (!updateErr) {
                    results.matchesStarted++;
                    
                    // --- 2. SEND START NOTIFICATION IMMEDIATELY ---
                    const { data: users } = await supabase.from('profiles').select('id, notification_settings');
                    if (users) {
                        const title = "Jogo Iniciado! ⚽";
                        const bodyText = `A partida entre ${match.home_team_id} x ${match.away_team_id} começou! Placar: 0x0`;
                        
                        const tasks = users
                            .filter(u => (u.notification_settings?.matchStart ?? true) !== false)
                            .map(u => sendPushNotificationToUser(env, u.id, title, bodyText, { url: '/table' }));
                        
                        await Promise.allSettled(tasks);
                        
                        // Mark as notified
                        await supabase.from('matches').update({ notification_sent: true }).eq('id', match.id);
                        results.notificationsSent++;
                    }
                }
            }
        }

        // --- 3. PREDICTION REMINDERS (30m before kickoff) ---
        const nowObj = new Date();
        const windowStart = new Date(nowObj.getTime() + 20 * 60 * 1000).toISOString();
        const windowEnd = new Date(nowObj.getTime() + 40 * 60 * 1000).toISOString();

        const { data: upcomingMatches } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id')
            .eq('status', 'SCHEDULED')
            .gte('date', windowStart)
            .lte('date', windowEnd);

        if (upcomingMatches && upcomingMatches.length > 0) {
            const { data: users } = await supabase.from('profiles').select('id, notification_settings');
            if (users) {
                const wantsReminder = users.filter(u => (u.notification_settings?.predictionReminder ?? true) !== false);
                for (const match of upcomingMatches) {
                    const matchLabel = `${match.home_team_id} x ${match.away_team_id}`;
                    const tasks = wantsReminder.map(u => 
                        sendPushNotificationToUser(
                            env, 
                            u.id, 
                            "Lembrete de Palpite ⏳", 
                            `O jogo ${matchLabel} vai começar em 30 minutos. Faça seu palpite!`,
                            { url: '/table' }
                        ).then(res => { if (res.success) results.remindersSent++; })
                    );
                    await Promise.allSettled(tasks);
                }
            }
        }

        return jsonResponse({ success: true, results });

    } catch (e: any) {
        console.error("Master Maintenance Worker Error:", e);
        return errorResponse(e);
    }
}
