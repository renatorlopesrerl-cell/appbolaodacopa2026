import { supabase, withRetry, jsonResponse, errorResponse, requireAdmin, getUserClient } from '../_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        await requireAdmin(req);
        const userClient = getUserClient(req);

        if (req.method === 'POST') {
            const body = await req.json();
            const { id, ...updates } = body;

            if (!id) throw new Error("Match ID required");

            const { error } = await userClient.from('matches').update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}

