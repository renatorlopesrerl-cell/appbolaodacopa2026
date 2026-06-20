const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.dev.vars' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking user_fcm_tokens table...");
  const { data, error, count } = await supabase
    .from('user_fcm_tokens')
    .select('user_id, token, device_type, last_seen', { count: 'exact' });

  if (error) {
    console.error("Error fetching tokens:", error);
    return;
  }

  console.log(`Total rows in user_fcm_tokens: ${count}`);
  
  // Group by device_type
  const counts = {};
  data.forEach(r => {
    const dt = r.device_type || 'undefined';
    counts[dt] = (counts[dt] || 0) + 1;
  });
  console.log("Token counts by device type:", counts);

  // Show first 5 web tokens if any
  const webTokens = data.filter(r => r.device_type === 'web');
  console.log(`\nWeb tokens count: ${webTokens.length}`);
  if (webTokens.length > 0) {
    console.log("First 5 web tokens:", webTokens.slice(0, 5));
  }

  // Show profiles with fcm_token
  console.log("\nChecking fcm_tokens in profiles...");
  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, fcm_token')
    .not('fcm_token', 'is', null)
    .neq('fcm_token', '');

  if (pErr) {
    console.error("Error fetching profiles:", pErr);
  } else {
    console.log(`Profiles with non-empty fcm_token: ${profiles.length}`);
    console.log("First 5 profile fcm_tokens:", profiles.slice(0, 5));
  }
}

check();
