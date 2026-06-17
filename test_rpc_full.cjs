const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    // Find a brazil league with predictions
    const { data: pred } = await supabase
        .from('brazil_predictions')
        .select('match_id, league_id, user_id, home_score, away_score')
        .limit(1).single();
    
    if (!pred) { console.log('No predictions found'); return; }
    
    console.log('Prediction found:');
    console.log('  league_id in DB:', pred.league_id);
    console.log('  match_id in DB:', pred.match_id);
    
    // Verify the league exists in brazil_leagues
    const { data: league } = await supabase
        .from('brazil_leagues')
        .select('id, name')
        .eq('id', pred.league_id)
        .single();
    
    console.log('League in DB:', league);
    
    // Call RPC with exact same IDs
    const { data, error } = await supabase.rpc('get_match_detailed_stats', {
        p_league_id: pred.league_id,
        p_match_id: pred.match_id,
        p_is_brazil: true
    });
    
    console.log('RPC Error:', error);
    console.log('RPC stats:', data?.stats);
    console.log('RPC predictions count:', data?.predictions?.length);
}
test();
