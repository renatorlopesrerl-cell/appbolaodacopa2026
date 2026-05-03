const fs = require('fs');

let code = fs.readFileSync('pages/BrazilLeagueDetails.tsx', 'utf8').replace(/\r\n/g, '\n');

// The marker we are looking for is where the previous tab function ended
const marker = '                    </div>\n                )}\n            </div>\n        );';
const index = code.indexOf(marker);
if (index === -1) {
  console.error('Marker not found');
  process.exit(1);
}

// We want to skip the broken bits up to the MousePointerClick line
const endMarker = '<MousePointerClick size={16} /><span>Clique no participante para ver o histórico detalhado.</span>\n                </div>';
const endIndex = code.indexOf(endMarker, index);
if (endIndex === -1) {
  console.error('End marker not found');
  process.exit(1);
}

const before = code.substring(0, index + marker.length);
const after = code.substring(endIndex + endMarker.length);

const injected = `
    };

    const renderClassificacaoTab = () => {
        const groupsList = Object.keys(GROUPS_CONFIG);
        const hasHistoryFilters = histPhase !== 'all' || histGroup !== 'all' || histRound !== 'all';
        const clearHistoryFilters = () => { setHistPhase('all'); setHistGroup('all'); setHistRound('all'); };

        const leaderboard = league.participants.map(userId => {
            const user = users.find(u => u.id === userId) || { name: 'Unknown', id: userId, email: '', avatar: '' } as User;
            const userPreds = predictions.filter(p => p.userId === userId && p.leagueId === league.id);
            let totalPoints = 0, exactScores = 0, winnerAndDiffCount = 0, drawCount = 0, knockoutPoints = 0;
            
            userPreds.forEach(p => {
                const match = matches.find(m => m.id === p.matchId);
                let includeInSum = false;
                if (match) {
                    const mRound = getMatchRound(match);
                    if (leaderboardView === 'total') includeInSum = true;
                    else if (leaderboardView === '1' && match.phase === Phase.GROUP && mRound === 1) includeInSum = true;
                    else if (leaderboardView === '2' && match.phase === Phase.GROUP && mRound === 2) includeInSum = true;
                    else if (leaderboardView === '3' && match.phase === Phase.GROUP && mRound === 3) includeInSum = true;
                    else if (leaderboardView === 'group_phase' && match.phase === Phase.GROUP) includeInSum = true;
                    else if (leaderboardView === '16_avos' && match.phase === Phase.ROUND_32) includeInSum = true;
                    else if (leaderboardView === 'final_phase' && (match.phase === Phase.ROUND_16 || match.phase === Phase.QUARTER || match.phase === Phase.SEMI || match.phase === Phase.FINAL)) includeInSum = true;
                    else if (leaderboardView === 'knockout' && match.phase !== Phase.GROUP) includeInSum = true;
                }
                if (match && (match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && match.homeScore !== null && match.awayScore !== null) {
                    const points = calculatePoints(Number(p.homeScore), Number(p.awayScore), Number(match.homeScore), Number(match.awayScore), league.settings);
                    const goalscorerBonus = p.goalscorerPoints ?? 0;

                    // Stats for tie-breaking (Always calculate regardless of view filter)
                    if (match.phase !== Phase.GROUP) knockoutPoints += points;
                    if (points === league.settings.exactScore) exactScores++;
                    else if (points === league.settings.winnerAndDiff) winnerAndDiffCount++;
                    else if (points === league.settings.draw) drawCount++;

                    if (includeInSum) {
                        totalPoints += points + goalscorerBonus;
                    }
                }
            });
            return { user, totalPoints, exactScores, winnerAndDiffCount, drawCount, knockoutPoints };
        }).sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
            if (b.winnerAndDiffCount !== a.winnerAndDiffCount) return b.winnerAndDiffCount - a.winnerAndDiffCount;
            if (b.drawCount !== a.drawCount) return b.drawCount - a.drawCount;
            return b.knockoutPoints - a.knockoutPoints;
        });

        const filteredLeaderboard = leaderboard.filter(entry => entry.user.name.toLowerCase().includes(leaderboardSearch.toLowerCase()));
        
        const getHistory = (userId: string) => {
            const lockedMatches = matches.filter(m => isPredictionLocked(m.date, currentTime)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return lockedMatches.map(m => {
                const pred = predictions.find(p => p.matchId === m.id && p.userId === userId && p.leagueId === league.id);
                return { match: m, pred };
            });
        };
        
        const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
        const fullHistory = selectedUserId ? getHistory(selectedUserId) : [];
        const filteredHistory = fullHistory.filter(item => {
            if (histPhase !== 'all' && item.match.phase !== histPhase) return false;
            if (histGroup !== 'all' && (!item.match.group || item.match.group !== histGroup)) return false;
            if (histRound !== 'all') { if (item.match.phase !== Phase.GROUP) return false; const round = getMatchRound(item.match); if (round?.toString() !== histRound) return false; }
            return true;
        });

        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm min-h-[500px] relative overflow-hidden">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-3 text-xs md:text-sm font-medium border-b border-blue-100 dark:border-blue-800 flex items-center justify-center gap-2 text-center">
                    <MousePointerClick size={16} /><span>Clique no participante para ver o histórico detalhado.</span>
                </div>`;

fs.writeFileSync('pages/BrazilLeagueDetails.tsx', before + injected + after);
console.log('Fixed successfully');
