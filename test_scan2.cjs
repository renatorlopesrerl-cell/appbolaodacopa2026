const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);
async function test() {
    // Get all matches
    const { data: matches } = await supabase.from('matches').select('id, status');
    
    // Get all predictions in brazil_predictions
    const { data: preds } = await supabase.from('brazil_predictions').select('match_id');
    
    let finishedPreds = 0;
    let upcomingPreds = 0;
    let lockedPreds = 0;
    
    for (const p of preds) {
        const match = matches.find(m => m.id === p.match_id);
        if (match) {
            if (match.status === 'FINISHED') finishedPreds++;
            else if (match.status === 'IN_PROGRESS') lockedPreds++;
            else upcomingPreds++;
        }
    }
    console.log(`Total brazil_predictions: ${preds.length}`);
    console.log(`Finished: ${finishedPreds}, InProgress: ${lockedPreds}, Upcoming: ${upcomingPreds}`);
}
test();
