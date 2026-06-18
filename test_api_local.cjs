require('dotenv').config({ path: './.dev.vars' });

async function testApiLocally() {
  const matchId = 'm-1'; 
  
  const response = await fetch('http://localhost:8788/api/admin/matches', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer fake_token` // we need to mock this in matches.ts temporarily to bypass auth
    },
    body: JSON.stringify({
      id: matchId,
      home_score: 3,
      away_score: 0,
      status: 'IN_PROGRESS'
    })
  });
  
  const data = await response.json().catch(() => null);
  console.log("Status:", response.status);
  console.log("Data:", data);
}

testApiLocally();
