require('dotenv').config({ path: './.dev.vars' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function testUpdate() {
  const matchId = 'm-1'; // A valid match ID from initial matches
  console.log('Testing update on match ID:', matchId);

  const safeUpdates = {
    home_score: 1,
    away_score: 0,
    status: 'IN_PROGRESS'
  };

  const { data, error } = await supabase.from('matches').update(safeUpdates).eq('id', matchId);

  if (error) {
    console.error('SUPABASE ERROR:', error);
  } else {
    console.log('Update successful:', data);
  }
}

testUpdate();
