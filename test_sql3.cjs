const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data: p } = await supabase.from('predictions').select('match_id, league_id').limit(1).single();
    if (p) {
        console.log('Testing...');
        const { data, error } = await supabase.rpc('execute_sql', {
            sql_string: `
                SELECT json_build_object(
                  'stats', (
                    SELECT json_build_object(
                      'total', count(*)
                    )
                    FROM predictions
                    WHERE league_id = '${p.league_id}' AND match_id = '${p.match_id}'
                  )
                ) as res;
            `
        });
        console.log('Result:', error || JSON.stringify(data, null, 2));
    }
}
test();
