import { getSupabaseClient, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const url = new URL(request.url);
        const authUser = data.user;
        
        const matchId = url.searchParams.get('matchId');
        const leagueId = url.searchParams.get('leagueId');
        const leagueType = url.searchParams.get('leagueType') || 'standard';
        
        if (!matchId || !leagueId) {
            return new Response(JSON.stringify({ error: "Missing matchId or leagueId" }), { status: 400 });
        }
        const supabase = getSupabaseClient(env);

        if (leagueType === 'brasileirao') {
            const { data: league, error: leagueErr } = await supabase
                .from('brasileirao_leagues')
                .select('participants')
                .eq('id', leagueId)
                .single();
            if (leagueErr || !league) {
                return new Response(JSON.stringify({ error: 'Liga não encontrada' }), { status: 404 });
            }
            if (!league.participants.includes(authUser.id)) {
                return new Response(JSON.stringify({ error: 'Proibido: usuário não é participante' }), { status: 403 });
            }

            const chunkSize = 100;
            const preds: any[] = [];
            let predsErr = null;
            
            for (let i = 0; i < league.participants.length; i += chunkSize) {
                const chunk = league.participants.slice(i, i + chunkSize);
                const { data: chunkPreds, error } = await supabase
                    .from('brasileirao_predictions')
                    .select('user_id, home_score, away_score, points')
                    .eq('match_id', matchId)
                    .eq('league_id', leagueId)
                    .in('user_id', chunk);
                if (error) { predsErr = error; break; }
                if (chunkPreds) preds.push(...chunkPreds);
            }

            if (predsErr || preds.length === 0) {
                 return jsonResponse({
                     stats: { total: 0, home_wins: 0, draws: 0, away_wins: 0 },
                     predictions: []
                 });
            }

            let homeWins = 0, draws = 0, awayWins = 0;
            preds.forEach((p: any) => {
                const h = Number(p.home_score);
                const a = Number(p.away_score);
                if (h > a) homeWins++;
                else if (a > h) awayWins++;
                else draws++;
            });

            return jsonResponse({
                stats: {
                    total: preds.length,
                    home_wins: homeWins,
                    draws: draws,
                    away_wins: awayWins
                },
                predictions: preds
            });
        }
        
        return new Response(JSON.stringify({ error: "Use RPC for standard leagues" }), { status: 400 });
        
    } catch (e: any) {
        return errorResponse(e);
    }
}
