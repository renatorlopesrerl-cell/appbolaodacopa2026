const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fixing corrupt rows in brazil_leagues...");
    const { data: bRes, error: bErr } = await supabase
        .from('brazil_leagues')
        .update({ settings: { exactScore: 10, winnerAndDiff: 7, winnerAndWinnerGoals: 6, draw: 6, winner: 5, goalscorer: 2 } })
        .eq('id', 'bl-1781349415302-654');
    
    if (bErr) {
        console.error("Error fixing Corinthians Brazil league:", bErr);
    } else {
        console.log("Corinthians Brazil league settings updated successfully!");
    }

    const { data: bRes2, error: bErr2 } = await supabase
        .from('brazil_leagues')
        .update({ settings: { exactScore: 10, winnerAndDiff: 7, winnerAndWinnerGoals: 6, draw: 6, winner: 5, goalscorer: 2 } })
        .eq('id', 'bl-1781789148005-515');
    
    if (bErr2) {
        console.error("Error fixing Flamengo Brazil league:", bErr2);
    } else {
        console.log("Flamengo Brazil league settings updated successfully!");
    }

    console.log("Fixing corrupt rows in standard leagues...");
    const { data: sRes, error: sErr } = await supabase
        .from('leagues')
        .update({ settings: { draw: 5, plan: "FREE", winner: 4, exactScore: 10, isUnlimited: false, winnerAndDiff: 6, manualScoringLock: false, topFinishersPoints: { third: 10, fourth: 5, champion: 20, runnerUp: 15 }, topFinishersEnabled: false, winnerAndWinnerGoals: 5 } })
        .eq('id', 'l-1779549140434');

    if (sErr) {
        console.error("Error fixing Jokaxin standard league:", sErr);
    } else {
        console.log("Jokaxin standard league settings updated successfully!");
    }
}
run();
