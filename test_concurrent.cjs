const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    const matchId = '2a316d8a-6b47-49ec-a52d-8a2b53bdbe0c'; // Need a valid match ID
    const { data: m } = await supabase.from('matches').select('id, home_score, away_score, status').limit(1).single();
    if (!m) return console.log('No match found');
    console.log('Found match:', m.id);
    
    // Simulate concurrent updates with SCORE changes
    console.log('Starting concurrent updates...');
    const p1 = supabase.from('matches').update({ status: 'IN_PROGRESS', home_score: 1, away_score: 0 }).eq('id', m.id);
    const p2 = supabase.from('matches').update({ status: 'FINISHED', home_score: 1, away_score: 1 }).eq('id', m.id);
    
    const [r1, r2] = await Promise.all([p1, p2]);
    console.log('R1 Error:', r1.error);
    console.log('R2 Error:', r2.error);
}
test();
