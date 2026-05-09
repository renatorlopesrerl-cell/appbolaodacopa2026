
import { getSupabaseClient, jsonResponse, errorResponse } from '../_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    try {
        // middleware handles admin check, but we use service role to bypass RLS
        const adminClient = getSupabaseClient(env);

        const url = new URL(request.url);
        const leagueType = url.searchParams.get('type') || 'standard'; // 'standard' or 'brazil'
        const table = leagueType === 'brazil' ? 'brazil_leagues' : 'leagues';

        if (request.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) throw new Error("ID required");

            const { error } = await adminClient.from(table).delete().eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        if (request.method === 'PUT') {
            const body = await request.json() as any;
            const { id, ...updates } = body;
            if (!id) throw new Error("ID required");

            const { error } = await adminClient.from(table).update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}
