require('dotenv').config({ path: './.dev.vars' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: policies, error } = await supabase.from('pg_policies').select('*').eq('tablename', 'matches');
  console.log(policies || error);
}
check();
