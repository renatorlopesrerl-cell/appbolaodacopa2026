const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
    console.log("Checking brazil_leagues settings for values > 1000...");
    const { data: leagues, error } = await supabase.from('brazil_leagues').select('id, name, settings');
    if (error) {
        console.error("Error fetching brazil_leagues:", error);
    } else {
        for (const l of leagues) {
            const s = l.settings || {};
            for (const k in s) {
                if (typeof s[k] === 'number' && s[k] > 1000) {
                    console.log(`FOUND IN BRAZIL LEAGUE: ID: ${l.id}, Name: ${l.name}, Key: ${k}, Value: ${s[k]}`);
                } else if (typeof s[k] === 'string' && parseFloat(s[k]) > 1000) {
                    console.log(`FOUND IN BRAZIL LEAGUE (string): ID: ${l.id}, Name: ${l.name}, Key: ${k}, Value: ${s[k]}`);
                }
            }
        }
    }

    console.log("\nChecking standard leagues settings for values > 1000...");
    const { data: stdLeagues, errorStd } = await supabase.from('leagues').select('id, name, settings');
    if (errorStd) {
        console.error("Error fetching standard leagues:", errorStd);
    } else {
        for (const l of stdLeagues) {
            const s = l.settings || {};
            for (const k in s) {
                if (typeof s[k] === 'number' && s[k] > 1000) {
                    console.log(`FOUND IN STANDARD LEAGUE: ID: ${l.id}, Name: ${l.name}, Key: ${k}, Value: ${s[k]}`);
                } else if (typeof s[k] === 'string' && parseFloat(s[k]) > 1000) {
                    console.log(`FOUND IN STANDARD LEAGUE (string): ID: ${l.id}, Name: ${l.name}, Key: ${k}, Value: ${s[k]}`);
                }
            }
        }
    }
}
test();
