const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data } = await supabase.rpc('run_sql', { sql: `
        SELECT * FROM information_schema.table_constraints
        WHERE table_name = 'league_rankings';
    ` });
    console.log(data);
}
check();
