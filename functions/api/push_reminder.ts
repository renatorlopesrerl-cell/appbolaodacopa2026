import { jsonResponse, errorResponse, getSupabaseClient, extractTokens, processBulkNotifications } from './_shared';

/**
 * Master Maintenance Worker (Match Starter + Notifications)
 * This worker handles THREE things:
 * 1. Starts matches (sets status to IN_PROGRESS and scores to 0x0)
 * 2. Sends "Match Started" notifications
 * 3. Sends "Prediction Reminders" (30 min before)
 */
export const onRequest = async (context: any) => {
    const { request, env, waitUntil } = context;
    const url = new URL(request.url);
    const secretFromUrl = url.searchParams.get('secret');

    let secret = secretFromUrl;
    if (request.method === 'POST') {
        try {
            const body = await request.json() as any;
            secret = body.secret || secret;
        } catch (e) { }
    }

    const WEBHOOK_SECRET = env.WEBHOOK_SECRET;
    if (!WEBHOOK_SECRET) {
        console.error('[push_reminder] WEBHOOK_SECRET not configured in environment variables!');
        return errorResponse(new Error('Webhook not configured'), 500);
    }
    if (secret !== WEBHOOK_SECRET) {
        return errorResponse(new Error("Unauthorized"), 401);
    }

    try {
        const supabase = getSupabaseClient(env);
        const results = {
            matchesStarted: 0,
            notificationsQueued: 0,
            remindersQueued: 0
        };

        const now = new Date().toISOString();

        // Arrays to hold all background jobs
        const backgroundTasks: Promise<void>[] = [];

        // --- 1. START MATCHES AUTOMATICALLY (Internal Logic) ---
        const { data: toStart } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id')
            .eq('status', 'SCHEDULED')
            .lte('date', now);

        if (toStart && toStart.length > 0) {
            // Load profiles and tokens once if needed
            const { data: users } = await supabase.from('profiles').select('id, notification_settings, fcm_token');
            const { data: tokenRows } = await supabase.from('user_fcm_tokens').select('user_id, token');
            
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

                    if (users) {
                        const title = "Jogo Iniciado! ⚽";
                        const bodyText = `A partida entre ${match.home_team_id} x ${match.away_team_id} começou!`;

                        const userIdsToNotify = users
                            .filter((u: any) => (u.notification_settings?.matchStart ?? true) !== false)
                            .map((u: any) => u.id);

                        const tokensToNotify = extractTokens(userIdsToNotify, users, tokenRows);

                        if (tokensToNotify.length > 0) {
                            // Enqueue background task
                            backgroundTasks.push(processBulkNotifications(env, tokensToNotify, title, bodyText, { url: '/table' }));
                            results.notificationsQueued += tokensToNotify.length;
                        }
                    }
                }
            }
        }

        // --- 3. PREDICTION REMINDERS (30m before kickoff) ---
        const nowObj = new Date();
        const windowStart = new Date(nowObj.getTime() + 28 * 60 * 1000).toISOString();
        const windowEnd = new Date(nowObj.getTime() + 30 * 60 * 1000).toISOString();

        const { data: upcomingMatches } = await supabase
            .from('matches')
            .select('id, home_team_id, away_team_id')
            .eq('status', 'SCHEDULED')
            .eq('reminder_30m_sent', false)
            .gte('date', windowStart)
            .lte('date', windowEnd);

        if (upcomingMatches && upcomingMatches.length > 0) {
            const { data: users } = await supabase.from('profiles').select('id, notification_settings, fcm_token');
            const { data: tokenRows } = await supabase.from('user_fcm_tokens').select('user_id, token');

            if (users) {
                const userIdsToNotify = users
                    .filter((u: any) => (u.notification_settings?.predictionReminder ?? true) !== false)
                    .map((u: any) => u.id);

                const tokensToNotify = extractTokens(userIdsToNotify, users, tokenRows);

                if (tokensToNotify.length > 0) {
                    for (const match of upcomingMatches) {
                        const matchLabel = `${match.home_team_id} x ${match.away_team_id}`;
                        const title = "Lembrete de Palpite ⏳";
                        const bodyText = `O jogo ${matchLabel} vai começar em 30 minutos. Revise ou faça seu palpite!`;

                        // Mark as sent in DB
                        await supabase.from('matches').update({ reminder_30m_sent: true }).eq('id', match.id);

                        backgroundTasks.push(processBulkNotifications(env, tokensToNotify, title, bodyText, { url: '/leagues' }));
                        results.remindersQueued += tokensToNotify.length;
                    }
                } else {
                    for (const match of upcomingMatches) {
                        await supabase.from('matches').update({ reminder_30m_sent: true }).eq('id', match.id);
                    }
                }
            }
        }

        if (backgroundTasks.length > 0) {
            // Processa todas as tarefas assíncronas em plano de fundo sem bloquear a resposta do webhook
            waitUntil(Promise.all(backgroundTasks).catch(e => console.error("Error in background tasks", e)));
        }

        return jsonResponse({ success: true, results });

    } catch (e: any) {
        console.error("Master Maintenance Worker Error:", e);
        return errorResponse(e);
    }
}
