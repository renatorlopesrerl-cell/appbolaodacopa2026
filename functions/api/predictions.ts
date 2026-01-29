
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
                ...u,
                user_id: authUser.id
            }));

            const { error } = await userClient.from('predictions').upsert(sanitizedUpdates, { onConflict: 'user_id,match_id,league_id' });
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
