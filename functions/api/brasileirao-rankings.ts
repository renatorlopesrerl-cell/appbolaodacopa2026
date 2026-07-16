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

        // Fetch pre-calculated rankings for Brasileirao mode
        const { data, error } = await userClient
            .from('brasileirao_league_rankings')
            .select('*')
            .eq('league_id', leagueId)
            .eq('period', period)
            .order('total_points', { ascending: false })
            .order('exact_scores', { ascending: false })
            .order('winner_and_diff_count', { ascending: false })
            .order('winner_and_winner_goals_count', { ascending: false })
            .order('draw_count', { ascending: false })
            .order('only_winner_count', { ascending: false });

        if (error) throw error;
        
        // Fetch profiles separately to avoid missing foreign key relation errors
        if (data && data.length > 0) {
            const userIds = [...new Set(data.map(d => d.user_id))];
            
            // Chunk requests to avoid URL too long errors on Supabase GET
            const chunkSize = 100;
            const profiles: any[] = [];
            
            for (let i = 0; i < userIds.length; i += chunkSize) {
                const chunk = userIds.slice(i, i + chunkSize);
                const { data: chunkProfiles } = await userClient
                    .from('profiles')
                    .select('id, name, avatar, is_pro')
                    .in('id', chunk);
                if (chunkProfiles) profiles.push(...chunkProfiles);
            }
                
            if (profiles && profiles.length > 0) {
                const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]));
                data.forEach(d => {
                    d.profiles = profileMap[d.user_id] || { name: 'Usuário', avatar: null, is_pro: false };
                });
            }
        }

        return jsonResponse(data || []);

    } catch (e: any) {
        return errorResponse(e);
    }
}
