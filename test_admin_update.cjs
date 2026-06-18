const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' }); // has SUPABASE_SERVICE_ROLE_KEY?

async function test() {
    const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    const matchId = '2a316d8a-6b47-49ec-a52d-8a2b53bdbe0c'; // M1
    const { data: m } = await supabase.from('matches').select('id, status').limit(1).single();
    if (!m) return console.log('No match');
    
    console.log('Updating match...', m.id);
    const { data, error } = await supabase.from('matches').update({ status: 'FINISHED' }).eq('id', m.id);
    console.log('Result:', data);
    console.log('Error:', error);
}
test();
