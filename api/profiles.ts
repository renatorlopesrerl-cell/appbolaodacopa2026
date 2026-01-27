import { supabase, withRetry, jsonResponse, errorResponse, requireAuth, getUserClient } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        const authUser = await requireAuth(req);
        const userClient = getUserClient(req);

        if (req.method === 'GET') {
            const url = new URL(req.url);
            const id = url.searchParams.get('id');

            if (id) {
                const { data, error } = await userClient.from('profiles').select('*').eq('id', id).single();
                if (error) return errorResponse(error, 404);
                return jsonResponse(data);
            }

            // Default: List all (respecting RLS)
            const data = await withRetry(async () => {
                return await userClient.from('profiles').select('*');
            });
            return jsonResponse(data);
        }

        if (req.method === 'POST') {
            const body = await req.json();

            // Ensure user only updates their own profile (Rule 5 & 10)
            if (body.id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await userClient.from('profiles').upsert(body);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}

