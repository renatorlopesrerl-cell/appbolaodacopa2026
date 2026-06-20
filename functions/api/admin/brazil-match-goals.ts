import { getSupabaseClient, jsonResponse, errorResponse } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env } = context;
    try {
        const userClient = getSupabaseClient(env);

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { matchId, playerName, goals } = body;

            if (!matchId || !playerName) {
                throw new Error("matchId and playerName are required");
            }

            const { error } = await userClient.from('brazil_match_goals').upsert(
                { match_id: matchId, player_name: playerName, goals },
                { onConflict: 'match_id,player_name' }
            );
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        if (request.method === 'DELETE') {
            const url = new URL(request.url);
            const matchId = url.searchParams.get('matchId');
            const playerName = url.searchParams.get('playerName');

            if (!matchId || !playerName) {
                throw new Error("matchId and playerName are required");
            }

            const { error } = await userClient
                .from('brazil_match_goals')
                .delete()
                .eq('match_id', matchId)
                .eq('player_name', playerName);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        console.error("Brazil Match Goals Error:", e);
        return errorResponse(e);
    }
}
