const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data: p } = await supabase.from('predictions').select('match_id, league_id').limit(1).single();
    if (p) {
        console.log('Testing...');
        const { data, error } = await supabase.rpc('get_match_detailed_stats', {
            p_league_id: p.league_id,
            p_match_id: p.match_id,
            p_is_brazil: false
        });
        console.log('Result:', JSON.stringify(data, null, 2));
    }
}
test();
