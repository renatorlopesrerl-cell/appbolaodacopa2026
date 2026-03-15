
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from './_shared';

/**
 * Unified Push Worker (Reminder + Start Match Detection)
 * This worker checks for matches starting soon (Reminders) 
 * AND matches that just started (Start Notifications).
 */
export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    // Allows both POST (for safety) and GET (bypasses some Cloudflare WAF 403 blocks)
    const url = new URL(request.url);
    const secretFromUrl = url.searchParams.get('secret');
    
    let secret = secretFromUrl;
    if (request.method === 'POST') {
        try {
            const body = await request.json() as any;
            secret = body.secret || secret;
        } catch (e) {}
    }

    // Security Check
    const WEBHOOK_SECRET = env.WEBHOOK_SECRET || "bolao2026_secure_webhook_key";
    if (secret !== WEBHOOK_SECRET) {
        return errorResponse(new Error("Unauthorized"), 401);
    }

    try {
        const supabase = getSupabaseClient(env);
        const results = {
            matchesNotified: 0,
            remindersSent: 0
        };

        const now = new Date();

        // --- 1. DETECT RECENTLY STARTED MATCHES (To send Match Started Push) ---
        // We look for matches in status 'IN_PROGRESS' that started in the last 10 minutes
        const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
        const { data: startedMatches } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id, notification_sent')
            .eq('status', 'IN_PROGRESS')
            .gte('date', tenMinsAgo)
            .is('notification_sent', null); // IMPORTANT: Prevents duplicate notifications

        if (startedMatches && startedMatches.length > 0) {
            const { data: users } = await supabase.from('profiles').select('id, notification_settings');
            
            if (users) {
                for (const match of startedMatches) {
                    const title = "Jogo Iniciado! ⚽";
                    const bodyText = `A partida entre ${match.home_team_id} x ${match.away_team_id} começou! Placar: 0x0`;
                    
                    const tasks = users
                        .filter(u => (u.notification_settings?.matchStart ?? true) !== false)
                        .map(u => sendPushNotificationToUser(env, u.id, title, bodyText, { url: '/table' }));
                    
                    await Promise.allSettled(tasks);
                    
                    // Mark as notified in DB to avoid double pushes from this script
                    await supabase.from('matches').update({ notification_sent: true }).eq('id', match.id);
                    results.matchesNotified++;
                }
            }
        }

        // --- 2. PREDICTION REMINDERS (30m before kickoff) ---
        const windowStart = new Date(now.getTime() + 20 * 60 * 1000).toISOString();
        const windowEnd = new Date(now.getTime() + 40 * 60 * 1000).toISOString();

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
        console.error("Unified Push Worker Error:", e);
        return errorResponse(e);
    }
}
