const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    // Liga com mais palpites: bl-1777848026511 (Palpiteiros BR): 107 palpites
    const leagueId = 'bl-1777848026511';
    
    // Pegar um jogo que tem palpites nessa liga
    const { data: pred } = await supabase.from('brazil_predictions').select('match_id, league_id').eq('league_id', leagueId).limit(1).single();
    if (!pred) { console.log('Sem palpites'); return; }
    
    console.log('Testando liga:', leagueId, '/ jogo:', pred.match_id);
    
    // Chamar a RPC
    const { data, error } = await supabase.rpc('get_match_detailed_stats', {
        p_league_id: pred.league_id,
        p_match_id: pred.match_id,
        p_is_brazil: true
    });
    
    console.log('Erro:', error);
    console.log('Stats:', data?.stats);
    console.log('Palpites (primeiros 3):', data?.predictions?.slice(0, 3));
}
test();
