const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const { data, error } = await supabase.rpc('get_match_detailed_stats', {
        p_league_id: 'YW2Mde', // Palpiteiros BR (107 preds)
        p_match_id: 'm-C1',
        p_is_brazil: true
    });
    
    if (error) {
        console.log('ERROR:', error);
        return;
    }
    
    console.log('RPC full response keys:', Object.keys(data || {}));
    console.log('Predictions count:', data?.predictions?.length);
    console.log('First prediction:', JSON.stringify(data?.predictions?.[0]));
    // Show all top-level fields
    const { predictions, ...rest } = data || {};
    console.log('Non-predictions fields:', JSON.stringify(rest, null, 2));
}
test();
