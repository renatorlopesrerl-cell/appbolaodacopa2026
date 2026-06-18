require('dotenv').config({ path: './.dev.vars' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testUserUpdate() {
  const matchId = 'm-1'; // A valid match ID from initial matches
  const adminEmail = 'renato.c@gmail.com'; // assuming this is the admin

  // Let's first get a user token or just login if we can, 
  // actually wait, let's just get the user profile to see if they are admin
  
  const { data: users, error } = await supabase.from('profiles').select('*').limit(5);
  console.log('Profiles:', users);

}

testUserUpdate();
