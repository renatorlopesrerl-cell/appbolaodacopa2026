import { getUserClient, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const userClient = getUserClient(env, request);
        const authUser = data.user;

        if (!authUser) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        if (request.method === 'GET') {
            const url = new URL(request.url);
            const leagueId = url.searchParams.get('leagueId');
            const userId = url.searchParams.get('userId');
            const matchIds = url.searchParams.get('matchIds');

            const step = 1000;
            const allPredictions: any[] = [];
            let offset = 0;
            let keepFetching = true;

            while (keepFetching) {
                let query = userClient
                    .from('brazil_predictions')
                    .select('*')
                    .order('user_id')
                    .order('match_id')
                    .range(offset, offset + step - 1);
                
                if (leagueId) {
                    if (leagueId.includes(',')) {
                        query = query.in('league_id', leagueId.split(','));
                    } else {
                        query = query.eq('league_id', leagueId);
                    }
                }
                if (userId) query = query.eq('user_id', userId);
                
                if (matchIds) {
                    query = query.in('match_id', matchIds.split(','));
                }

                const { data: page, error: pageError } = await query;

                if (pageError) {
                    console.error('[brazil-predictions GET] Page fetch error:', pageError.message);
                    break;
                }

                if (!page || page.length === 0) {
                    keepFetching = false;
                } else {
                    allPredictions.push(...page);
                    offset += step;
                    if (page.length < step) keepFetching = false;
                }
            }

            return jsonResponse(allPredictions);
        }

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const updates = Array.isArray(body) ? body : [body];

            const sanitizedUpdates = updates.map(u => ({
                user_id: authUser.id, // Force matching auth user
                match_id: u.match_id,
                league_id: u.league_id,
                home_score: typeof u.home_score === 'number' ? u.home_score : null,
                away_score: typeof u.away_score === 'number' ? u.away_score : null,
                player_pick: u.player_pick || null
            })).filter(u => u.match_id && u.league_id && u.home_score !== null && u.away_score !== null);

            if (sanitizedUpdates.length === 0) {
                return jsonResponse({ success: true, message: 'Nenhum palpite válido para salvar' });
            }

            const { error } = await userClient.from('brazil_predictions').upsert(sanitizedUpdates, { onConflict: 'user_id,match_id,league_id' });
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        console.error('Error on brazil-predictions worker:', e);
        return errorResponse(e);
    }
}
