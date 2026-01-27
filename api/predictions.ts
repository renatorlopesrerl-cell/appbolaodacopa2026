import { supabase, withRetry, jsonResponse, errorResponse, requireAuth, getUserClient } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        const authUser = await requireAuth(req);
        const userClient = getUserClient(req);

        if (req.method === 'GET') {
            const data = await withRetry(async () => {
                return await userClient.from('predictions').select('*');
            });
            return jsonResponse(data || []);
        }

        if (req.method === 'POST') {
            const body = await req.json();
            const updates = Array.isArray(body) ? body : [body];

            // Validation: Ensure user only submits for themselves (Rule 10)
            const sanitizedUpdates = updates.map(u => ({
                ...u,
                user_id: authUser.id // Force matching auth user
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

