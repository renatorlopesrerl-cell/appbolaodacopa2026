
import { getUserClient, withRetry, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    try {
        const url = new URL(request.url);
        const authUser = (request as any).user;
        const userClient = getUserClient(env, request);

        if (request.method === 'GET') {
            const data = await withRetry(async () => {
                return await userClient.from('leagues').select('*');
            });

            // Filter out leagues with '[EXCLUÍDA]' in name
            const cleanLeagues = (data as any[])?.filter(l => !l.name.includes('[EXCLUÍDA]')) || [];
            return jsonResponse(cleanLeagues);
        }

        if (request.method === 'POST') {
            const body = await request.json();
            const { error } = await userClient.from('leagues').insert([body]);
            if (error) throw error;
            return jsonResponse({ success: true }, 201);
        }

        if (request.method === 'PUT') {
            const body = await request.json() as any;
            const { id, ...updates } = body;
            if (!id) return errorResponse(new Error("League ID required"), 400);

            // Verify Ownership
            const { data: league, error: fetchError } = await userClient.from('leagues').select('admin_id').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);
            if (league.admin_id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await userClient.from('leagues').update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        if (request.method === 'DELETE') {
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
