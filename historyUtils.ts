import { Match, Phase } from './types';

export function getHistoryForTeam(
    teamId: string, 
    currentMatchId: string, 
    allMatches: Match[], 
    dbHistory: any[]
): any[] {
    // 1. Find the current match
    const currentMatch = allMatches.find(m => m.id === currentMatchId);
    if (!currentMatch) return dbHistory.filter(h => h.team_id === teamId);

    // 2. Find all matches played by this team BEFORE the current match in the World Cup
    const teamCupMatches = allMatches.filter(m => 
        (m.homeTeamId === teamId || m.awayTeamId === teamId) && 
        new Date(m.date).getTime() < new Date(currentMatch.date).getTime() &&
        m.id !== currentMatchId
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 3. Format Cup Matches to look like dbHistory
    const formattedCupMatches = teamCupMatches.map((m) => {
        const isHome = m.homeTeamId === teamId;
        
        let result = '';
        if (m.homeScore !== null && m.awayScore !== null) {
            if (m.homeScore > m.awayScore) result = isHome ? 'Vitória' : 'Derrota';
            else if (m.homeScore < m.awayScore) result = isHome ? 'Derrota' : 'Vitória';
            else result = 'Empate';
        }

        const scoreStr = m.homeScore !== null ? `${m.homeScore} x ${m.awayScore}` : ' x ';
        
        return {
            id: `cup-${m.id}`,
            team_id: teamId,
            date: m.date,
            competition: 'Copa do Mundo 2026',
            match_str: `${m.homeTeamId} ${scoreStr} ${m.awayTeamId}`,
            result: result,
            isCupMatch: true
        };
    });

    // 4. Determine how many dbHistory matches to keep
    const phase = currentMatch.phase;
    const isSemiOrFinal = phase === Phase.SEMI || phase === Phase.FINAL;

    if (isSemiOrFinal) {
        return formattedCupMatches.reverse();
    } else {
        const dbMatchesForTeam = dbHistory
            .filter(h => h.team_id === teamId)
            .sort((a, b) => a.match_order - b.match_order);

        const neededFromDb = Math.max(0, 6 - formattedCupMatches.length);
        const keptDbMatches = dbMatchesForTeam.slice(0, neededFromDb);

        return [...formattedCupMatches.reverse(), ...keptDbMatches];
    }
}
