const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: d1, error: e1 } = await supabase.from('league_rankings').select('*').limit(1);
    console.log('league_rankings:', d1 ? Object.keys(d1[0] || {}) : e1);

    const { data: d2, error: e2 } = await supabase.from('brazil_league_rankings').select('*').limit(1);
    console.log('brazil_league_rankings:', d2 ? Object.keys(d2[0] || {}) : e2);
}
test();
