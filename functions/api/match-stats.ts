import { getSupabaseClient, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const url = new URL(request.url);
        const authUser = data.user;
        
        // 1. Get query parameters
        const matchId = url.searchParams.get('matchId');
        const leagueId = url.searchParams.get('leagueId');
        const leagueType = url.searchParams.get('leagueType') || 'standard'; // 'standard' | 'brazil'
        
        if (!matchId || !leagueId) {
            return new Response(JSON.stringify({ error: "Missing matchId or leagueId" }), { status: 400 });
        }
        // 2. Instantiate the Supabase client
        // O Supabase usa a Service Role Key se configurada, ou Anon Key
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
                    .select('user_id, home_score, away_score, created_at')
                    .eq('match_id', matchId)
                    .eq('league_id', leagueId)
                    .in('user_id', chunk);
                if (error) { predsErr = error; break; }
                if (chunkPreds) preds.push(...chunkPreds);
            }

            if (predsErr || preds.length === 0) {
                 return jsonResponse({
                     totalPreds: 0, mostPredictedScore: null, homeWinPct: 0, drawPct: 0, awayWinPct: 0, predictedUserIds: [], predictionTimestamps: {}
                 });
            }

            let homeWins = 0, draws = 0, awayWins = 0;
            const scoreCount: Record<string, number> = {};
            const predictionTimestamps: Record<string, string> = {};
            preds.forEach((p: any) => {
                predictionTimestamps[p.user_id] = p.created_at;
                const h = Number(p.home_score);
                const a = Number(p.away_score);
                if (h > a) homeWins++;
                else if (a > h) awayWins++;
                else draws++;
                const key = `${h}-${a}`;
                scoreCount[key] = (scoreCount[key] || 0) + 1;
            });

            const total = preds.length;
            let mostScore = null;
            let maxCount = 0;
            Object.entries(scoreCount).forEach(([key, count]) => {
                if (count > maxCount) { maxCount = count; mostScore = key; }
                else if (count === maxCount && mostScore) {
                    const [hA, aA] = mostScore.split('-').map(Number);
                    const [hB, aB] = key.split('-').map(Number);
                    if (hB + aB < hA + aA || (hB + aB === hA + aA && hB > hA)) {
                        mostScore = key;
                    }
                }
            });

            const homeWinPct = Math.round((homeWins / total) * 100);
            const awayWinPct = Math.round((awayWins / total) * 100);
            const drawPct = 100 - homeWinPct - awayWinPct;

            return jsonResponse({
                totalPreds: total,
                mostPredictedScore: mostScore,
                homeWinPct,
                drawPct,
                awayWinPct,
                predictedUserIds: preds.map((p: any) => p.user_id),
                predictionTimestamps
            });
        }
        
        // 3. Chamar a função RPC que calcula as estatísticas diretamente no banco
        // A função get_match_stats roda como SECURITY DEFINER, bypassando o RLS
        // e garante a validação do usuário internamente.
        const { data: stats, error: rpcError } = await supabase.rpc('get_match_stats', {
            p_match_id: matchId,
            p_league_id: leagueId,
            p_league_type: leagueType,
            p_user_id: authUser.id
        });

        if (rpcError) {
            console.error("RPC get_match_stats error:", rpcError);
            return new Response(JSON.stringify({ error: rpcError.message }), { status: 500 });
        }

        if (stats && stats.error) {
             const status = stats.error.includes('Proibido') ? 403 : (stats.error.includes('não encontrada') ? 404 : 400);
             return new Response(JSON.stringify({ error: stats.error }), { status });
        }

        return jsonResponse(stats);
        
    } catch (e: any) {
        return errorResponse(e);
    }
}
