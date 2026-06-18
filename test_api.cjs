require('dotenv').config({ path: './.dev.vars' });

async function testApi() {
  const matchId = 'm-1'; // A valid match ID from initial matches

  const safeUpdates = {
    id: matchId,
    home_score: 1,
    away_score: 1,
    status: 'IN_PROGRESS'
  };

  // we can't test the production endpoint without auth headers because of middleware.
  // wait, the error is in production "POST https://bolaodacopa2026.app/api/admin/matches 500 (Internal Server Error)"
  console.log("We need to see what error the server is returning.");
}

testApi();
