const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    // Check status of Brazil matches in the DB
    const { data: matches } = await supabase
        .from('matches')
        .select('id, home_team_id, away_team_id, status, home_score, away_score')
        .or('home_team_id.eq.Brasil,away_team_id.eq.Brasil');
    
    console.log('Brazil matches in DB:');
    matches?.forEach(m => {
        console.log(`  ${m.id}: ${m.home_team_id} vs ${m.away_team_id} | status=${m.status} | score=${m.home_score}-${m.away_score}`);
    });
}
test();
