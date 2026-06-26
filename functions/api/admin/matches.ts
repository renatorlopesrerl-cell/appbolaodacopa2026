import { getUserClient, jsonResponse, errorResponse, getSupabaseClient } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data } = context;
    try {
        // middleware handles admin check
        const userClient = getSupabaseClient(env);

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { id } = body;

            if (!id) throw new Error("Match ID required");

            // SECURITY: Whitelist allowed fields — never pass raw body to the DB
            const { status, home_score, away_score, phase, date, location, group, reminder_30m_sent, home_team_id, away_team_id } = body;
            const safeUpdates: Record<string, any> = {};
            if (status !== undefined)           safeUpdates.status = status;
            if (home_score !== undefined)        safeUpdates.home_score = home_score;
            if (away_score !== undefined)        safeUpdates.away_score = away_score;
            if (phase !== undefined)             safeUpdates.phase = phase;
            if (date !== undefined)              safeUpdates.date = date;
            if (location !== undefined)          safeUpdates.location = location;
            if (group !== undefined)             safeUpdates.group = group;
            if (reminder_30m_sent !== undefined) safeUpdates.reminder_30m_sent = reminder_30m_sent;
            if (home_team_id !== undefined)      safeUpdates.home_team_id = home_team_id;
            if (away_team_id !== undefined)      safeUpdates.away_team_id = away_team_id;

            if (Object.keys(safeUpdates).length === 0) throw new Error("No valid fields to update");

            const { error } = await userClient.from('matches').update(safeUpdates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        console.error("Match Update Error:", e, "Message:", e.message, "Code:", e.code, "Details:", e.details);
        return errorResponse(e);
    }
}
