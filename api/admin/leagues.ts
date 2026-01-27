import { supabase, withRetry, jsonResponse, errorResponse, requireAdmin, getUserClient } from '../_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        await requireAdmin(req); // Enforce Admin
        const userClient = getUserClient(req);

        if (req.method === 'DELETE') {
            const url = new URL(req.url);
            const id = url.searchParams.get('id');
            if (!id) throw new Error("ID required");

            const { error } = await userClient.from('leagues').delete().eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}

