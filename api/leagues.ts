import { supabase, withRetry, jsonResponse, errorResponse, requireAuth, requireAdmin, getUserClient } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url);
        const authUser = await requireAuth(req);
        const userClient = getUserClient(req); // Respect RLS

        if (req.method === 'GET') {
            const data = await withRetry(async () => {
                return await userClient.from('leagues').select('*');
            });

            const cleanLeagues = (data as any[])?.filter(l => !l.name.includes('[EXCLUÍDA]')) || [];
            return jsonResponse(cleanLeagues);
        }

        if (req.method === 'POST') {
            const body = await req.json();
            const { error } = await userClient.from('leagues').insert([body]);
            if (error) throw error;
            return jsonResponse({ success: true }, 201);
        }

        if (req.method === 'PUT') {
            const body = await req.json();
            const { id, ...updates } = body;
            if (!id) return errorResponse(new Error("League ID required"), 400);

            // Verify Ownership (using userClient respects RLS, but double check admin_id manual check is safer)
            const { data: league, error: fetchError } = await userClient.from('leagues').select('admin_id').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);
            if (league.admin_id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await userClient.from('leagues').update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        if (req.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) return errorResponse(new Error("League ID required"), 400);

            const { data: league, error: fetchError } = await userClient.from('leagues').select('admin_id, name').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);
            if (league.admin_id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await userClient.from('leagues').update({
                name: `${league.name} [EXCLUÍDA]`,
                participants: [],
                pending_requests: []
            }).eq('id', id);

            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}


