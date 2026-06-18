require('dotenv').config({ path: './.dev.vars' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStats() {
  const { count: uCount } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
  const { count: lCount } = await supabase.from('leagues').select('id', { count: 'exact', head: true });
  const { count: blCount } = await supabase.from('brazil_leagues').select('id', { count: 'exact', head: true });
  const { count: pCount } = await supabase.from('predictions').select('id', { count: 'exact', head: true });
  const { count: bpCount } = await supabase.from('brazil_predictions').select('id', { count: 'exact', head: true });
  
  console.log('Profiles:', uCount);
  console.log('Leagues:', lCount);
  console.log('Brazil Leagues:', blCount);
  console.log('Predictions:', pCount);
  console.log('Brazil Predictions:', bpCount);
}
checkStats();
