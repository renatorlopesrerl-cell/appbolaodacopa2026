const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.rpc('run_sql', { sql: `
        SELECT tgname, pg_get_triggerdef(oid) 
        FROM pg_trigger 
        WHERE tgrelid = 'matches'::regclass;
    ` });
    if (error) console.error('RPC failed:', error);
    else console.log(data);
}
check();
