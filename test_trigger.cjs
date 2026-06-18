require('dotenv').config({ path: './.dev.vars' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testWithPrediction() {
  const matchId = 'm-1'; 
  
  // 1. Get an existing league or create one
  const { data: leagues } = await supabase.from('brazil_leagues').select('id').limit(1);
  if (!leagues || leagues.length === 0) {
    console.log("No brazil leagues found.");
    return;
  }
  const leagueId = leagues[0].id;

  // 2. Get a user
  const { data: users } = await supabase.from('profiles').select('id').limit(1);
  const userId = users[0].id;

  // 3. Insert a mock prediction
  await supabase.from('brazil_predictions').upsert({
    user_id: userId,
    match_id: matchId,
    league_id: leagueId,
    home_score: 1,
    away_score: 0
  });
  console.log('Prediction inserted.');

  // 4. Update the match to trigger the calculation
  const safeUpdates = {
    home_score: 2,
    away_score: 1,
  };

  const { data, error } = await supabase.from('matches').update(safeUpdates).eq('id', matchId);

  if (error) {
    console.error('SUPABASE ERROR:', error);
  } else {
    console.log('Update successful');
  }

  // Cleanup
  await supabase.from('brazil_predictions').delete().eq('user_id', userId).eq('match_id', matchId);
}

testWithPrediction();
