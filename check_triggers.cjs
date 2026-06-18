require('dotenv').config({ path: './.dev.vars' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.rpc('run_sql', { sql: `SELECT tgname FROM pg_trigger WHERE tgrelid = 'matches'::regclass;` });
  console.log(data || error);
}
check();
