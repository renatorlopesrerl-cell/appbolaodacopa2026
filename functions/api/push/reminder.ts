
import { jsonResponse, errorResponse, sendPushNotificationToUser, getSupabaseClient } from '../_shared';

/**
 * Push Notification Worker
 * Only handles sending notifications. Match status is now handled by SQL.
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
        const results = {
            startedNotifications: 0,
            remindersSent: 0
        };

        // --- 1. NOTIFY RECENTLY STARTED MATCHES ---
        // We look for matches that are IN_PROGRESS but started very recently
        const recentWindow = new Date(Date.now() - 10 * 60 * 1000).toISOString(); 
        
        const { data: recentStarted } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id')
            .eq('status', 'IN_PROGRESS')
            .gte('date', recentWindow);

        if (recentStarted && recentStarted.length > 0) {
            // Fetch all users who want start notifications
            const { data: users } = await supabase.from('profiles').select('id, notification_settings');
            
            if (users) {
                for (const match of recentStarted) {
                    const title = "Jogo Iniciado! ⚽";
                    const bodyText = `A partida entre ${match.home_team_id} x ${match.away_team_id} começou!`;
                    
                    const tasks = users
                        .filter(u => (u.notification_settings?.matchStart ?? true) !== false)
                        .map(u => sendPushNotificationToUser(env, u.id, title, bodyText, { url: '/table' }));
                    
                    await Promise.allSettled(tasks);
                    results.startedNotifications += tasks.length;
                }
            }
        }

        // --- 2. PREDICTION REMINDERS (30m before) ---
        const windowStart = new Date(Date.now() + 20 * 60 * 1000).toISOString();
        const windowEnd = new Date(Date.now() + 40 * 60 * 1000).toISOString();

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
        console.error("Push Worker Error:", e);
        return errorResponse(e);
    }
}
