// Script para verificar o cache do localStorage no navegador
// Copie e cole no console do navegador (F12) enquanto estiver na página da liga
const cache = localStorage.getItem('cache_matches');
if (!cache) { console.log('No cache_matches found'); } 
else {
    const matches = JSON.parse(cache);
    const brazilMatches = matches.filter(m => m.homeTeamId === 'Brasil' || m.awayTeamId === 'Brasil');
    console.table(brazilMatches.map(m => ({
        id: m.id,
        home: m.homeTeamId,
        away: m.awayTeamId,
        status: m.status,
        homeScore: m.homeScore,
        awayScore: m.awayScore
    })));
}
