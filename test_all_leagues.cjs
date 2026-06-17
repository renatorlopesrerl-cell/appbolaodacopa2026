const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    // Get ALL brazil leagues and test RPC for each with m-C1 (the finished Brazil match)
    const { data: leagues } = await supabase.from('brazil_leagues').select('id, name');
    
    console.log(`Testing ${leagues.length} leagues with match m-C1...`);
    
    for (const league of leagues) {
        const { data, error } = await supabase.rpc('get_match_detailed_stats', {
            p_league_id: league.id,
            p_match_id: 'm-C1',
            p_is_brazil: true
        });
        
        const predCount = data?.predictions?.length ?? 0;
        const errorMsg = error ? error.message : null;
        
        console.log(`Liga: ${league.name.padEnd(30)} | Preds: ${String(predCount).padStart(3)} | Error: ${errorMsg || 'none'}`);
    }
}
test();
