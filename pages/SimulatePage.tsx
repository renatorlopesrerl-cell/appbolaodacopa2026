import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { Match, MatchStatus, Phase, GroupStanding, Team } from '../types';
import { GROUPS_CONFIG, calculateStandings, getTeamFlag, INITIAL_MATCHES } from '../services/dataService';
import { api } from '../services/api';
import { Save, Upload, Download, RefreshCw, Trophy, ArrowRight, AlertTriangle, CheckCircle, Info, Loader2, Filter, ChevronDown, X, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';

// --- THIRD PLACE RANKING LOGIC (USER PROVIDED) ---
type ThirdPlaceTeam = {
    group: string;
    team: string; // Team ID
    points: number;
    goalDiff: number;
    goalsFor: number;
    fairPlay: number; // Placeholder, using 0 if not available
};

// Official Mapping for R32 3rd place slots
// Key: The "Game Number" concept from user instructions, mapped to match placeholders
// 1º E vs 3º ABCDF
// 1º I vs 3º CDFGH
// 1º D vs 3º BEFIJ
// 1º G vs 3º AEHIJ
// 1º A vs 3º CEFHI
// 1º L vs 3º EHIJK
// 1º B vs 3º EFGIJ
// 1º K vs 3º DEIJL

const R32_3RD_PLACE_RULES: Record<string, string[]> = {
    '1º Grupo E': ['A', 'B', 'C', 'D', 'F'],
    '1º Grupo I': ['C', 'D', 'F', 'G', 'H'],
    '1º Grupo D': ['B', 'E', 'F', 'I', 'J'],
    '1º Grupo G': ['A', 'E', 'H', 'I', 'J'],
    '1º Grupo A': ['C', 'E', 'F', 'H', 'I'],
    '1º Grupo L': ['E', 'H', 'I', 'J', 'K'],
    '1º Grupo B': ['E', 'F', 'G', 'I', 'J'],
    '1º Grupo K': ['D', 'E', 'I', 'J', 'L'],
};

export const SimulatePage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, leagues, addNotification, submitPredictions, matches } = useStore();
    const [savedButtonText, setSavedButtonText] = useState('Salvar');

    // State: Simulated Scores (matchId -> {home, away})
    const [simulatedScores, setSimulatedScores] = useState<Record<string, { home: number, away: number }>>({});
    const [loadingSim, setLoadingSim] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [showExportConfirm, setShowExportConfirm] = useState(false);
    const [exportLeagueId, setExportLeagueId] = useState<string>('');
    const [importLeagueId, setImportLeagueId] = useState<string>('');
    const [exportScope, setExportScope] = useState<'all' | 'group' | 'knockout'>('all');
    const [exportGroup, setExportGroup] = useState<string>('all');
    const [exportPhase, setExportPhase] = useState<string>('all');
    const [isProcessing, setIsProcessing] = useState(false);

    // Filter States for View
    const [filterPhase, setFilterPhase] = useState<string>('all');
    const [filterGroup, setFilterGroup] = useState<string>('all');

    const myLeagues = React.useMemo(() => {
        if (!currentUser) return [];
        return leagues.filter(l => l.participants.includes(currentUser.id));
    }, [leagues, currentUser]);

    // Load Simulation on Mount
    useEffect(() => {
        if (!currentUser) return;
        const loadSimulation = async () => {
            setLoadingSim(true);
            try {
                const data = await api.simulations.get(currentUser.id).catch(() => null);
                if (data && data.simulation_data) {
                    setSimulatedScores(data.simulation_data);
                }
            } catch (e) {
                console.error("Failed to load simulation", e);
            } finally {
                setLoadingSim(false);
            }
        };
        loadSimulation();
    }, [currentUser]);

    // Computed: Simulated Matches (Group Stage only first, then expanded)
    // We start with matches from store but override scores with simulatedScores
    // And status to FINISHED if scored.

    const computedMatches = useMemo(() => {
        // Use matches from store instead of INITIAL_MATCHES
        let currentMatches = matches.map(m => {
            const sim = simulatedScores[m.id];
            if (sim !== undefined) {
                return {
                    ...m,
                    homeScore: sim.home,
                    awayScore: sim.away,
                    status: (sim.home !== null && sim.away !== null) ? MatchStatus.FINISHED : m.status
                };
            }
            return m;
        });

        // 1. Calculate Group Standings based on currentMatches
        const standings = calculateStandings(currentMatches);

        // 2. Resolve Group Placeholders in Knockout Matches (e.g. "1º Grupo A")
        // We can do this by iterating through matches that have "Grupo" in team names
        currentMatches = currentMatches.map(m => {
            if (m.phase === Phase.GROUP) return m;

            let homeId = m.homeTeamId;
            let awayId = m.awayTeamId;

            // Resolve Home
            if (homeId.includes('Grupo')) {
                const parts = homeId.split(' '); // "1º", "Grupo", "A"
                if (parts.length === 3) {
                    const pos = parseInt(parts[0].replace('º', '')) - 1;
                    const group = parts[2];
                    if (standings[group] && standings[group][pos]) {
                        homeId = standings[group][pos].teamId;
                    }
                }
            }

            // Resolve Away (Standard "2º Grupo B" etc, NOT "3º ...")
            if (awayId.includes('Grupo') && !awayId.includes('/')) {
                const parts = awayId.split(' ');
                if (parts.length === 3) {
                    const pos = parseInt(parts[0].replace('º', '')) - 1;
                    const group = parts[2];
                    if (standings[group] && standings[group][pos]) {
                        awayId = standings[group][pos].teamId;
                    }
                }
            }

            return { ...m, homeTeamId: homeId, awayTeamId: awayId };
        });

        // 3. Resolve 3rd Places
        // Logic: Rank all 3rd places
        const thirdPlaces: ThirdPlaceTeam[] = Object.keys(standings).map(group => {
            const teamStats = standings[group][2]; // 3rd place is index 2
            if (!teamStats) return null;
            return {
                group,
                team: teamStats.teamId,
                points: teamStats.points,
                goalDiff: teamStats.gd,
                goalsFor: teamStats.gf,
                fairPlay: 0
            };
        }).filter(Boolean) as ThirdPlaceTeam[];

        const rankedThirds = [...thirdPlaces].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return 0;
        }).slice(0, 8); // Top 8 qualify

        // Assign to Matches based on R32_3RD_PLACE_RULES
        const usedGroups = new Set<string>();

        // Map of matchId -> allowedGroups
        const matchThirdsMap: Record<string, string[]> = {};
        matches.forEach(m => {
            if (R32_3RD_PLACE_RULES[m.homeTeamId]) {
                matchThirdsMap[m.id] = R32_3RD_PLACE_RULES[m.homeTeamId];
            }
        });

        // Sort matches by "strictness" (number of allowed groups) to avoid conflicts
        // We only care about matches that NEED a 3rd place
        const r32Matches = currentMatches.filter(m => m.phase === Phase.ROUND_32);

        // Identify matches that need resolution (those present in matchThirdsMap)
        // and sort them.
        const matchesToResolve = r32Matches
            .filter(m => matchThirdsMap[m.id])
            .sort((a, b) => {
                const lenA = matchThirdsMap[a.id].length;
                const lenB = matchThirdsMap[b.id].length;
                return lenA - lenB;
            });

        // Create a map for quick update
        const resolvedThirds: Record<string, string> = {};

        // Recursive backtracking to assign thirds
        const assignThirds = (
            matches: { id: string, phase: string, homeTeamId: string, awayTeamId: string }[],
            thirds: ThirdPlaceTeam[],
            used: Set<string> = new Set()
        ): boolean => {
            if (matches.length === 0) return true;

            const match = matches[0];
            const allowed = matchThirdsMap[match.id];

            // If match doesn't have restrictions (shouldn't happen in this list), proceed
            if (!allowed) return assignThirds(matches.slice(1), thirds, used);

            for (const third of thirds) {
                if (allowed.includes(third.group) && !used.has(third.group)) {
                    // Try assigning
                    resolvedThirds[match.id] = third.team;
                    used.add(third.group);

                    // Recurse
                    if (assignThirds(matches.slice(1), thirds, used)) {
                        return true;
                    }

                    // Rollback
                    delete resolvedThirds[match.id];
                    used.delete(third.group);
                }
            }

            return false;
        };

        const success = assignThirds(matchesToResolve, rankedThirds);

        if (!success) {
            console.warn("Could not find a valid assignment for all 3rd places.");
        }

        currentMatches = currentMatches.map(m => {
            if (m.phase !== Phase.ROUND_32) return m;
            if (resolvedThirds[m.id]) {
                return { ...m, awayTeamId: resolvedThirds[m.id] };
            }
            // Ensure matches that NEEDED specific 3rd but failed get marked
            if (matchThirdsMap[m.id] && !resolvedThirds[m.id]) {
                return { ...m, awayTeamId: 'Conflito (3º)' };
            }
            return m;
        });

        // 4. Resolve Knockout Winners (Propagation)
        // Groups -> R32 -> R16 -> QF -> SF -> Final

        // Helper to get winner/loser from specific match list
        const getResultTeam = (matchId: string, matchList: typeof currentMatches, type: 'winner' | 'loser'): string | undefined => {
            const m = matchList.find(x => x.id === matchId);
            if (!m) return undefined;
            const sim = simulatedScores[matchId];

            if (sim && m.homeScore !== null && m.awayScore !== null) {
                const isHomeWinner = m.homeScore > m.awayScore;
                const isAwayWinner = m.awayScore > m.homeScore;

                if (type === 'winner') {
                    if (isHomeWinner) return m.homeTeamId;
                    if (isAwayWinner) return m.awayTeamId;
                } else {
                    // Loser
                    if (isHomeWinner) return m.awayTeamId;
                    if (isAwayWinner) return m.homeTeamId;
                }
            }
            return undefined;
        };

        // Sequential Propagation (Phase by Phase to ensure dependencies)
        [Phase.ROUND_16, Phase.QUARTER, Phase.SEMI, Phase.FINAL].forEach(phase => {
            currentMatches = currentMatches.map(m => {
                if (m.phase !== phase) return m;

                let h = m.homeTeamId;
                let a = m.awayTeamId;

                // Resolve Home
                if (h.startsWith('Venc. ')) {
                    const id = 'm-' + h.replace('Venc. ', '');
                    const w = getResultTeam(id, currentMatches, 'winner');
                    if (w && !w.includes('TBD') && !w.includes('Grupo')) h = w;
                } else if (h.startsWith('Perd. ')) {
                    const id = 'm-' + h.replace('Perd. ', '');
                    const l = getResultTeam(id, currentMatches, 'loser');
                    if (l && !l.includes('TBD') && !l.includes('Grupo')) h = l;
                }

                // Resolve Away
                if (a.startsWith('Venc. ')) {
                    const id = 'm-' + a.replace('Venc. ', '');
                    const w = getResultTeam(id, currentMatches, 'winner');
                    if (w && !w.includes('TBD') && !w.includes('Grupo')) a = w;
                } else if (a.startsWith('Perd. ')) {
                    const id = 'm-' + a.replace('Perd. ', '');
                    const l = getResultTeam(id, currentMatches, 'loser');
                    if (l && !l.includes('TBD') && !l.includes('Grupo')) a = l;
                }

                return { ...m, homeTeamId: h, awayTeamId: a };
            });
        });

        return currentMatches;
    }, [simulatedScores, matches]);

    // Derived Standings for Visualization - MEMOIZED to avoid recalculating every frame
    const standings = useMemo(() => calculateStandings(computedMatches), [computedMatches]);

    // Grouping matches - MEMOIZED
    const matchesByPhase = useMemo(() => {
        const groups: Record<string, Match[]> = {};
        computedMatches.forEach(m => {
            if (!groups[m.phase]) groups[m.phase] = [];
            groups[m.phase].push(m);
        });
        return groups;
    }, [computedMatches]);

    // --- ACTIONS ---

    const handleScoreChange = (matchId: string, type: 'home' | 'away', value: string) => {
        const num = value === '' ? null : parseInt(value);
        if (num !== null && (isNaN(num) || num < 0)) return;

        setSimulatedScores(prev => {
            const existing = prev[matchId] || { home: null, away: null };
            // If typing home, keep away. If away, keep home.
            // However, if we are setting one, we need to respect the other.
            // The inputs use the existing simulated value or blank.

            // We store {home: -1} for null? No, null is fine.
            // But typescript `home: number`. 
            // Let's use `any` cast or handle null.
            const newVal = { ...existing };
            if (type === 'home') newVal.home = num as number;
            if (type === 'away') newVal.away = num as number;

            // If both are null, remove key? No, keep logic simple.
            return { ...prev, [matchId]: newVal };
        });
    };

    const handleSave = async () => {
        if (!currentUser) return;
        setSaving(true);
        try {
            await api.simulations.save({
                userId: currentUser.id,
                simulationData: simulatedScores
            });
            if (addNotification) addNotification('Sucesso', 'Simulação salva com sucesso!', 'success');
            setSavedButtonText('Salvo!');
            setTimeout(() => setSavedButtonText('Salvar'), 2000);
        } catch (e) {
            console.error(e);
            if (addNotification) addNotification('Erro', 'Erro ao salvar simulação.', 'warning');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        if (!exportLeagueId) { addNotification('Selecione uma Liga', 'Selecione uma liga para exportar seus palpites.', 'warning'); return; }
        if (Object.keys(simulatedScores).length === 0) { addNotification('Sem Dados', 'Não há palpites simulados para exportar.', 'warning'); return; }
        setShowExportConfirm(true);
    };

    const doExport = async () => {
        setShowExportConfirm(false);
        setExporting(true);
        try {
            const predsToExport: { matchId: string, home: number, away: number }[] = [];
            const now = new Date();
            let lockedCount = 0;

            Object.entries(simulatedScores).forEach(([mId, s]) => {
                const score = s as { home: number; away: number };
                const match = matches.find(m => m.id === mId);
                if (match) {
                    // Check if match is locked (started or < 5 min to start)
                    const matchDate = new Date(match.date);
                    const diffMs = matchDate.getTime() - now.getTime();
                    // isPredictionLocked logic: < 5 min or ongoing/finished
                    const isLocked = diffMs < 5 * 60 * 1000 || match.status !== MatchStatus.SCHEDULED;

                    if (isLocked) {
                        lockedCount++;
                        return; // Skip locked match
                    }

                    if (exportScope === 'all') {
                        predsToExport.push({ matchId: mId, home: score.home, away: score.away });
                    } else if (exportScope === 'group') {
                        if (match.phase === Phase.GROUP) {
                            if (exportGroup === 'all' || match.group === exportGroup) predsToExport.push({ matchId: mId, home: score.home, away: score.away });
                        }
                    } else if (exportScope === 'knockout') {
                        if (match.phase !== Phase.GROUP) {
                            if (exportPhase === 'all' || match.phase === exportPhase) {
                                predsToExport.push({ matchId: mId, home: score.home, away: score.away });
                            }
                        }
                    }
                }
            });

            if (predsToExport.length === 0) {
                if (lockedCount > 0) {
                    addNotification('Exportação não realizada', `${lockedCount} jogos foram ignorados pois já estão bloqueados ou finalizados.`, 'info');
                } else {
                    addNotification('Aviso', 'Nenhum jogo corresponde aos filtros selecionados.', 'info');
                }
                setExporting(false);
                return;
            }

            const success = await submitPredictions(predsToExport, exportLeagueId);

            if (success) {
                const leagueName = myLeagues.find(l => l.id === exportLeagueId)?.name || 'Liga';
                let msg = `Os palpites foram SALVOS com sucesso na liga ${leagueName}! (${predsToExport.length} jogos exportados).`;
                if (lockedCount > 0) msg += ` (${lockedCount} jogos ignorados pois já estavam bloqueados)`;

                addNotification('Exportação Concluída', msg, 'success', 12000);
            } else {
                addNotification('Erro na Exportação', 'Ocorreu um erro ao tentar exportar os palpites.', 'warning');
            }
        } catch (e) {
            console.error(e);
            addNotification('Erro na Exportação', 'Ocorreu um erro ao tentar exportar os palpites.', 'warning');
        } finally {
            setExporting(false);
        }
    };

    const handleClear = async () => {
        if (!window.confirm('Tem certeza que deseja limpar TODAS as simulações e começar do zero? Essa ação não pode ser desfeita.')) return;

        setSimulatedScores({});
        if (currentUser) {
            try {
                await api.simulations.save({ userId: currentUser.id, simulationData: {} });
                if (addNotification) addNotification('Limpo', 'Simulador limpo com sucesso.', 'info');
            } catch (e) {
                console.error(e);
                if (addNotification) addNotification('Erro', 'Erro ao limpar dados no servidor.', 'warning');
            }
        }
    };

    const handleImport = async () => {
        if (!importLeagueId || !currentUser) return alert('Selecione uma liga');
        if (!window.confirm('Importar substituirá sua simulação atual. Jogos já iniciados ou finalizados não serão alterados. Continuar?')) return;

        try {
            // Fetch directly from DB to avoid stale data
            const { data: leaguePreds, error } = await supabase
                .from('predictions')
                .select('*')
                .eq('league_id', importLeagueId)
                .eq('user_id', currentUser.id);

            if (error) throw error;
            if (!leaguePreds) return;

            const newSim = { ...simulatedScores };
            let importedCount = 0;
            let skippedCount = 0;
            const now = new Date();

            leaguePreds.forEach((p: any) => {
                const match = matches.find(m => m.id === p.match_id);
                if (match) {
                    const matchDate = new Date(match.date);
                    const diffMs = matchDate.getTime() - now.getTime();
                    // Lock if < 5 mins or not SCHEDULED
                    const isLocked = diffMs < 5 * 60 * 1000 || match.status !== MatchStatus.SCHEDULED;

                    if (!isLocked && p.home_score !== null && p.away_score !== null) {
                        newSim[p.match_id] = { home: parseInt(p.home_score), away: parseInt(p.away_score) };
                        importedCount++;
                    } else if (isLocked) {
                        skippedCount++;
                    }
                }
            });
            setSimulatedScores(newSim);

            let msg = `${importedCount} palpites importados com sucesso.`;
            if (skippedCount > 0) msg += ` (${skippedCount} ignorados por bloqueio)`;

            if (addNotification) {
                addNotification('Importado', msg, 'success');
            } else {
                alert(msg);
            }
        } catch (e) {
            console.error("Import Error", e);
            alert('Erro ao importar palpites.');
        }
    };

    const handleSyncReal = () => {
        if (!window.confirm('Isso atualizará os jogos FINALIZADOS com placares reais. Continuar?')) return;

        const realFinished = matches.filter(m => m.status === MatchStatus.FINISHED);
        const newScores = { ...simulatedScores };
        let count = 0;
        realFinished.forEach(m => {
            if (m.homeScore !== null && m.awayScore !== null) {
                newScores[m.id] = { home: m.homeScore, away: m.awayScore };
                count++;
            }
        });
        setSimulatedScores(newScores);
        addNotification('Sincronizado', `${count} placares reais foram aplicados à sua simulação.`, 'success');
    };

    // --- RENDER HELPERS ---

    // Memoized Match Row to prevent full list re-render on ogni keystroke
    const MemoizedMatchInput = React.memo(({ match, sim, onScoreChange }: { match: Match, sim: { home: any, away: any }, onScoreChange: any }) => {
        const isResolved = !match.homeTeamId.includes('Venc.') && !match.homeTeamId.includes('Perd.') && !match.homeTeamId.includes('Grupo');

        return (
            <div className="flex flex-col border-b border-gray-100 dark:border-gray-700 py-2">
                <div className="flex justify-between items-center text-xs text-gray-400 px-2 mb-1">
                    <span>{new Date(match.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="truncate max-w-[100px]">{match.location.split(',')[0]}</span>
                </div>
                <div className="flex items-center justify-between px-2 gap-2">
                    <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end min-w-0">
                        <span className={`truncate leading-tight text-right ${!isResolved ? 'text-gray-400' : 'text-gray-900 dark:text-gray-200 font-bold'} text-sm md:text-base`}>{match.homeTeamId}</span>
                        <img src={getTeamFlag(match.homeTeamId)} className="w-7 h-5 object-cover rounded shadow-sm flex-shrink-0" loading="lazy" />
                    </div>

                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            className="w-8 h-8 md:w-10 md:h-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold p-0 focus:ring-2 focus:ring-brasil-blue"
                            value={sim.home ?? ''}
                            onChange={(e) => onScoreChange(match.id, 'home', e.target.value)}
                            disabled={!isResolved}
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                            type="number"
                            className="w-8 h-8 md:w-10 md:h-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold p-0 focus:ring-2 focus:ring-brasil-blue"
                            value={sim.away ?? ''}
                            onChange={(e) => onScoreChange(match.id, 'away', e.target.value)}
                            disabled={!isResolved}
                        />
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 flex-1 justify-start min-w-0">
                        <img src={getTeamFlag(match.awayTeamId)} className="w-7 h-5 object-cover rounded shadow-sm flex-shrink-0" loading="lazy" />
                        <span className={`truncate leading-tight text-left ${!isResolved ? 'text-gray-400' : 'text-gray-900 dark:text-gray-200 font-bold'} text-sm md:text-base`}>{match.awayTeamId}</span>
                    </div>
                </div>
            </div>
        );
    });

    const renderMatchInput = (match: Match) => {
        const sim = simulatedScores[match.id] || { home: '', away: '' };
        return <MemoizedMatchInput key={match.id} match={match} sim={sim} onScoreChange={handleScoreChange} />;
    };





    if (loadingSim) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;

    const groupMatches = computedMatches.filter(m => m.phase === Phase.GROUP);
    const groups = Object.keys(GROUPS_CONFIG);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* HEADER & TOOLBAR */}
            <div className="mb-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowRight size={18} className="rotate-180" />
                    </div>
                    Voltar
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-black text-brasil-blue dark:text-blue-400 flex items-center gap-2">
                        <Trophy className="text-brasil-yellow" fill="currentColor" />
                        Simulador da Copa 2026
                    </h1>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                        <Info size={12} />
                        Todos os jogos estão no horário de Brasília (BRT)
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button onClick={handleSave} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex-1 md:flex-none justify-center ${savedButtonText === 'Salvo!' ? 'bg-green-700 text-white' : 'bg-brasil-green hover:bg-green-700 text-white'}`}>
                            {saving ? <Loader2 className="animate-spin" size={18} /> : (savedButtonText === 'Salvo!' ? <CheckCircle size={18} /> : <Save size={18} />)}
                            {savedButtonText}
                        </button>
                        <button onClick={handleSyncReal} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-bold transition-colors flex-1 md:flex-none justify-center">
                            <RefreshCw size={18} />
                            Sinc. Jogos Finalizados
                        </button>
                        <button onClick={handleClear} className="flex items-center gap-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg font-bold transition-colors flex-1 md:flex-none justify-center">
                            <Trash2 size={18} />
                            Limpar
                        </button>
                    </div>
                </div>

                {/* FILTERS SECTION */}
                <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 dark:border-gray-700 mt-4">
                    <div className="flex items-center gap-2 px-1">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                            <Filter size={16} className="text-brasil-green dark:text-green-400" />
                            Filtros
                        </div>
                        {(filterPhase !== 'all' || filterGroup !== 'all') && (
                            <button
                                onClick={() => { setFilterPhase('all'); setFilterGroup('all'); }}
                                className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 ml-2"
                            >
                                <X size={12} /> Limpar
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                        {/* Phase Select */}
                        <div className="relative w-full md:w-auto">
                            <select
                                value={filterPhase}
                                onChange={(e) => {
                                    setFilterPhase(e.target.value);
                                    if (e.target.value !== Phase.GROUP) setFilterGroup('all');
                                }}
                                className="w-full md:w-48 appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-green focus:border-brasil-green block p-2.5 pr-8"
                            >
                                <option value="all">Todas as Fases</option>
                                {Object.values(Phase).map(p => (
                                    <option key={p} value={p}>{p}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                        </div>

                        {/* Group Select (Conditional) */}
                        {(filterPhase === 'all' || filterPhase === Phase.GROUP) && (
                            <div className="relative w-full md:w-auto">
                                <select
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    className="w-full md:w-32 appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-green focus:border-brasil-green block p-2.5 pr-8"
                                >
                                    <option value="all">Todos Grupos</option>
                                    {groups.map(g => (
                                        <option key={g} value={g}>Grupo {g}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                            </div>
                        )}
                    </div>
                </div>

                {/* IMPORT / EXPORT CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600 mt-6">
                    {/* Export */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Upload size={12} /> Exportar para Liga</span>
                        <div className="flex gap-2">
                            <select className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm p-1.5" value={exportLeagueId} onChange={e => setExportLeagueId(e.target.value)}>
                                <option value="">Selecione a Liga...</option>
                                {myLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <button onClick={handleExport} disabled={exporting} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                {exporting ? <Loader2 className="animate-spin" size={16} /> : <ArrowRight size={16} />}
                            </button>
                        </div>
                        {exporting && <span className="text-[10px] text-blue-600 font-bold animate-pulse">Exportando palpites...</span>}

                        {showExportConfirm && (
                            <div id="export-confirm-banner" className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-700 rounded-lg p-4 flex flex-col gap-3">
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-bold">
                                    Exportar substituirá seus palpites atuais nesta liga para os jogos selecionados. Jogos bloqueados/finalizados não serão alterados. Continuar?
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        id="export-confirm-yes"
                                        onClick={doExport}
                                        className="bg-brasil-green text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors shadow-sm"
                                    >
                                        Sim, Exportar
                                    </button>
                                    <button
                                        type="button"
                                        id="export-confirm-no"
                                        onClick={() => setShowExportConfirm(false)}
                                        className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-blue-100 dark:border-blue-900/30 flex flex-col gap-2 shadow-sm">
                            <span className="text-[10px] uppercase font-black text-blue-600 dark:text-blue-400 tracking-wider">Filtros de Exportação</span>
                            <div className="flex flex-wrap gap-2">
                                <select
                                    className="bg-gray-100 dark:bg-gray-700 border-none rounded-md py-1.5 px-3 text-xs font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brasil-blue cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    value={exportScope}
                                    onChange={(e: any) => setExportScope(e.target.value)}
                                >
                                    <option value="all">Exportar Tudo</option>
                                    <option value="group">Grupos</option>
                                    <option value="knockout">Mata-mata</option>
                                </select>

                                {exportScope === 'group' && (
                                    <select
                                        className="bg-gray-100 dark:bg-gray-700 border-none rounded-md py-1.5 px-3 text-xs font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brasil-blue cursor-pointer animate-in fade-in slide-in-from-left-2"
                                        value={exportGroup}
                                        onChange={e => setExportGroup(e.target.value)}
                                    >
                                        <option value="all">Todos os Grupos</option>
                                        {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                                    </select>
                                )}

                                {exportScope === 'knockout' && (
                                    <select
                                        className="bg-gray-100 dark:bg-gray-700 border-none rounded-md py-1.5 px-3 text-xs font-bold text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-brasil-blue cursor-pointer animate-in fade-in slide-in-from-left-2"
                                        value={exportPhase}
                                        onChange={e => setExportPhase(e.target.value)}
                                    >
                                        <option value="all">Todas as Fases</option>
                                        <option value={Phase.ROUND_32}>16-avos</option>
                                        <option value={Phase.ROUND_16}>Oitavas</option>
                                        <option value={Phase.QUARTER}>Quartas</option>
                                        <option value={Phase.SEMI}>Semi</option>
                                        <option value={Phase.FINAL}>Final</option>
                                    </select>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Import */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Download size={12} /> Importar de Liga</span>
                        <div className="flex gap-2">
                            <select className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm p-1.5" value={importLeagueId} onChange={e => setImportLeagueId(e.target.value)}>
                                <option value="">Selecione a Liga...</option>
                                {myLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <button onClick={handleImport} className="bg-purple-600 text-white px-3 rounded hover:bg-purple-700"><CheckCircle size={16} /></button>
                        </div>
                        <p className="text-[10px] text-gray-400">*Isso substitui sua simulação atual pelos palpites da liga.</p>
                    </div>
                </div>
            </div>

            {/* GROUP STAGE */}
            {(filterPhase === 'all' || filterPhase === Phase.GROUP) && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {groups.filter(g => filterGroup === 'all' || filterGroup === g).map(group => {
                        const teamStandings = standings[group] || [];
                        const matchesInGroup = (matchesByPhase[Phase.GROUP] || [])
                            .filter(m => m.group === group)
                            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                        return (
                            <div key={group} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
                                    <h3 className="font-black text-gray-700 dark:text-gray-200">GRUPO {group}</h3>
                                </div>
                                {/* Standing Table */}
                                <table className="w-full text-sm">
                                    <thead className="text-xs text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                        <tr>
                                            <th className="pl-3 py-1 text-left">País</th>
                                            <th className="py-1 text-center" title="Pontos">Pts</th>
                                            <th className="py-1 text-center" title="Jogos">J</th>
                                            <th className="py-1 text-center" title="Vitórias">V</th>
                                            <th className="py-1 text-center" title="Empates">E</th>
                                            <th className="py-1 text-center" title="Derrotas">D</th>
                                            <th className="py-1 text-center" title="Gols Marcados">GM</th>
                                            <th className="py-1 text-center" title="Gols Sofridos">GS</th>
                                            <th className="py-1 text-center" title="Saldo de Gols">SG</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                        {teamStandings.map((t, i) => (
                                            <tr key={t.teamId} className={`${i < 2 ? 'bg-blue-50 dark:bg-green-900/40' : (i === 2 ? 'bg-yellow-50/50 dark:bg-blue-900/20' : '')}`}>
                                                <td className="pl-3 py-1.5 flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                                    <span className={`text-[10px] w-3 ${i < 2 ? 'text-blue-800 dark:text-green-300 font-bold' : (i === 2 ? 'text-yellow-800 dark:text-blue-400 font-bold' : 'text-gray-400')}`}>{i + 1}</span>
                                                    <img src={getTeamFlag(t.teamId)} className="w-5 h-3.5 object-cover rounded shadow-sm" loading="lazy" />
                                                    <span className="truncate max-w-[100px]">{t.teamId}</span>
                                                </td>
                                                <td className="text-center font-bold px-1">{t.points}</td>
                                                <td className="text-center text-gray-500 px-1">{t.played}</td>
                                                <td className="text-center text-gray-500 px-1">{t.won}</td>
                                                <td className="text-center text-gray-500 px-1">{t.drawn}</td>
                                                <td className="text-center text-gray-500 px-1">{t.lost}</td>
                                                <td className="text-center text-gray-500 px-1">{t.gf}</td>
                                                <td className="text-center text-gray-500 px-1">{t.ga}</td>
                                                <td className="text-center text-gray-500 px-1">{t.gd}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Matches */}
                                <div className="bg-gray-50/30 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700">
                                    {matchesInGroup.map(renderMatchInput)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* KNOCKOUT STAGE */}
            <div className="space-y-8 mt-12">
                <h2 className="text-2xl font-black text-center text-brasil-blue dark:text-white uppercase tracking-wider">Fase Final</h2>

                {[Phase.ROUND_32, Phase.ROUND_16, Phase.QUARTER, Phase.SEMI, Phase.FINAL]
                    .filter(phase => filterPhase === 'all' || filterPhase === phase)
                    .map(phase => {
                        const phaseMatches = matchesByPhase[phase] || [];
                        if (phaseMatches.length === 0) return null;

                        return (
                            <div key={phase} className="relative">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                    <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-1 rounded-full uppercase text-xs tracking-widest">{phase}</h3>
                                    <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
                                    {phaseMatches.map(renderMatchInput)}
                                </div>
                            </div>
                        );
                    })}
            </div>
        </div>
    );
};
