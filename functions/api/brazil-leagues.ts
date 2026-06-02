
import { getUserClient, withRetry, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const url = new URL(request.url);
        const authUser = data.user;
        const userClient = getUserClient(env, request);

        if (request.method === 'GET') {
            const searchCode = url.searchParams.get('code');
            if (searchCode) {
                const data = await withRetry(async () => {
                    return await userClient.from('brazil_leagues').select('*').eq('league_code', searchCode.toUpperCase());
                });
                const cleanLeagues = (data as any[])?.filter(l => !l.name.includes('[EXCLUÍDA]')) || [];
                return jsonResponse(cleanLeagues);
            }

            const data = await withRetry(async () => {
                // Check if user is admin via profiles table
                const { data: profile } = await userClient
                    .from('profiles')
                    .select('is_admin')
                    .eq('id', authUser.id)
                    .single();
                
                const isAdmin = profile?.is_admin || false;

                let query = userClient.from('brazil_leagues').select('*');
                
                // If user is not admin, only fetch public leagues + their own participated/pending leagues
                if (!isAdmin) {
                    query = query.or(`admin_id.eq.${authUser.id},participants.cs.{${authUser.id}},pending_requests.cs.{${authUser.id}},is_private.eq.false`);
                }
                
                return await query.limit(5000);
            });

            // Filter out leagues with '[EXCLUÍDA]' in name
            const cleanLeagues = (data as any[])?.filter(l => !l.name.includes('[EXCLUÍDA]')) || [];
            return jsonResponse(cleanLeagues);
        }

        if (request.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) return errorResponse(new Error("League ID required"), 400);

            // Verify Ownership
            const { data: league, error: fetchError } = await userClient.from('brazil_leagues').select('admin_id, name').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);
            if (league.admin_id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            // Soft Delete: Rename and clear lists
            const { error } = await userClient.from('brazil_leagues').update({
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
