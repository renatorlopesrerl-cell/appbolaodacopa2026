const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data: d1 } = await supabase.from('league_rankings').select('*');
    console.log('total rows:', d1.length);
    console.log('unique users:', new Set(d1.map(r => r.user_id)).size);
    console.log('periods for first user:', d1.filter(r => r.user_id === d1[0].user_id).map(r => r.period));
}
test();
