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
