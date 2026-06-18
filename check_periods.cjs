const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: d1, error: e1 } = await supabase.from('league_rankings').select('period').limit(10);
    console.log('periods:', new Set((d1 || []).map(r => r.period)));
}
test();
