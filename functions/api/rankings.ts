import { getUserClient, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    try {
        if (request.method !== 'GET') {
            return new Response("Method not allowed", { status: 405 });
        }

        const url = new URL(request.url);
        const leagueId = url.searchParams.get('leagueId');
        const period = url.searchParams.get('period') || 'total';

        if (!leagueId) {
            return new Response("League ID required", { status: 400 });
        }

        const userClient = getUserClient(env, request);

        // Fetch pre-calculated rankings, joining with user profiles for instant UI rendering
        const { data, error } = await userClient
            .from('league_rankings')
            .select('*, profiles(name, avatar, is_pro)')
            .eq('league_id', leagueId)
            .eq('period', period)
            .order('total_points', { ascending: false })
            .order('exact_scores', { ascending: false })
            .order('winner_and_diff_count', { ascending: false })
            .order('winner_and_winner_goals_count', { ascending: false })
            .order('draw_count', { ascending: false })
            .order('only_winner_count', { ascending: false });

        if (error) throw error;

        return jsonResponse(data || []);

    } catch (e: any) {
        return errorResponse(e);
    }
}
