const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    console.log("Inspecting brazil_leagues settings fields...");
    const { data: leagues, error } = await supabase.from('brazil_leagues').select('id, name, settings');
    if (error) {
        console.error("Error:", error);
        return;
    }

    const keys = ['exactScore', 'winnerAndDiff', 'winnerAndWinnerGoals', 'draw', 'winner', 'goalscorer'];

    for (const l of leagues) {
        const s = l.settings || {};
        for (const k of keys) {
            const val = s[k];
            if (val === undefined || val === null) {
                console.log(`Brazil League ID: ${l.id} (${l.name}) has NULL/missing key: ${k}`);
                continue;
            }
            // Try casting to integer
            const num = Number(val);
            if (isNaN(num)) {
                console.log(`Brazil League ID: ${l.id} (${l.name}) has non-numeric value: Key ${k} = "${val}"`);
            } else if (!Number.isInteger(num)) {
                console.log(`Brazil League ID: ${l.id} (${l.name}) has non-integer value: Key ${k} = ${val}`);
            } else if (num < 0 || num > 1000000) {
                console.log(`Brazil League ID: ${l.id} (${l.name}) has out of bounds integer: Key ${k} = ${val}`);
            }
        }
    }
    console.log("Inspection complete.");
}
test();
