import { supabase, withRetry, jsonResponse, errorResponse, requireAuth, getUserClient } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        await requireAuth(req);
        const userClient = getUserClient(req);

        if (req.method === 'GET') {
            const data = await withRetry(async () => {
                return await userClient.from('matches').select('*').order('date', { ascending: true });
            });
            return jsonResponse(data || []);
        }
        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}

