const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    const { data: leagues, error } = await supabase.from('brazil_leagues').select('id, name');
    console.log(`Encontrei ${leagues.length} ligas do Brasil.`);
    for (const l of leagues) {
        const { count } = await supabase.from('brazil_predictions').select('*', { count: 'exact', head: true }).eq('league_id', l.id);
        console.log(`Liga ${l.id} (${l.name}): ${count} palpites registrados.`);
    }
}
test();
