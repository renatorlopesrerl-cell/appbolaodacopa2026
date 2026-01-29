
import { getUserClient, withRetry, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const userClient = getUserClient(env, request);
        const authUser = data.user;

        if (request.method === 'GET') {
            const data = await withRetry(async () => {
                return await userClient.from('predictions').select('*');
            });
            return jsonResponse(data || []);
        }

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const updates = Array.isArray(body) ? body : [body];

            const sanitizedUpdates = updates.map(u => ({
                user_id: authUser.id, // Force matching auth user
                match_id: u.match_id,
                league_id: u.league_id,
                home_score: typeof u.home_score === 'number' ? u.home_score : null,
                away_score: typeof u.away_score === 'number' ? u.away_score : null
                // Explicitly exclude 'points'
            })).filter(u => u.match_id && u.league_id && u.home_score !== null && u.away_score !== null);

            const { error } = await userClient.from('predictions').upsert(sanitizedUpdates, { onConflict: 'user_id,match_id,league_id' });
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
