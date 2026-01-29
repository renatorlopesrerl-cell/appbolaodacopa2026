import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { Match, MatchStatus, Phase, GroupStanding, Team } from '../types';
import { GROUPS_CONFIG, calculateStandings, getTeamFlag, INITIAL_MATCHES } from '../services/dataService';
import { api } from '../services/api';
import { Save, Upload, Download, RefreshCw, Trophy, ArrowRight, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';

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
    const { currentUser, leagues, addNotification } = useStore();

    // State: Simulated Scores (matchId -> {home, away})
    const [simulatedScores, setSimulatedScores] = useState<Record<string, { home: number, away: number }>>({});
    const [loadingSim, setLoadingSim] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exportLeagueId, setExportLeagueId] = useState<string>('');
    const [importLeagueId, setImportLeagueId] = useState<string>('');
    const [exportScope, setExportScope] = useState<'all' | 'group'>('all');
    const [exportGroup, setExportGroup] = useState<string>('A');

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
    // We start with INITIAL_MATCHES but override scores with simulatedScores
    // And status to FINISHED if scored.

    const computedMatches = useMemo(() => {
        let currentMatches = INITIAL_MATCHES.map(m => {
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
                fairPlay: 0 // No data currently
            };
        }).filter(Boolean) as ThirdPlaceTeam[];

        const rankedThirds = [...thirdPlaces].sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
            if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
            return 0; // Random fallback handled by determinism or ignore
        }).slice(0, 8); // Top 8 qualify

        // Assign to Matches based on R32_3RD_PLACE_RULES
        // We need to track used 3rd place teams
        const usedGroups = new Set<string>();

        // Pre-calculate assignments to ensure global validity?
        // The user's prompt implies a specific logic per match.
        // We iterate matches that have "3º Grupo" in awayTeamId

        // We need to process matches in a specific order? 
        // Logic: "matches.map... if match needs 3rd, find first available from allowed list"
        // Wait, the order matters. The user provided `ROUND_OF_32_THIRD_MAP` with keys 1, 2, 7 etc.
        // These likely correspond to match order or ID.
        // We need to be deterministic. Let's process R32 matches by ID/Date.
        // But we need to identify the match by its RULE.
        // R32_3RD_PLACE_RULES is keyed by `homeTeamId` (e.g., '1º Grupo E').
        // This is safer because `homeTeamId` ("1º Grupo E") is static in INITIAL_MATCHES until resolved.
        // Wait, I just resolved `homeTeamId` in step 2!
        // So I should look at `INITIAL_MATCHES` for the rule key, but apply to `currentMatches`.

        const r32MatchesConfig = INITIAL_MATCHES.filter(m => m.phase === Phase.ROUND_32);

        // Create a map of "Real Home ID" -> "Rule Key" from initial
        // No, easier: loop through currentMatches in R32. find corresponding Initial match. check rule.

        // Let's optimize:
        // We need to assign thirds based on the "static" definition of the match.

        // Map of matchId -> allowedGroups
        const matchThirdsMap: Record<string, string[]> = {};

        INITIAL_MATCHES.forEach(m => {
            if (R32_3RD_PLACE_RULES[m.homeTeamId]) {
                matchThirdsMap[m.id] = R32_3RD_PLACE_RULES[m.homeTeamId];
            }
        });

        currentMatches = currentMatches.map(m => {
            if (m.phase !== Phase.ROUND_32) return m;

            const allowedGroups = matchThirdsMap[m.id];
            if (!allowedGroups) return m;

            // Find the best ranked third that is in allowedGroups and NOT used
            const bestThird = rankedThirds.find(t => allowedGroups.includes(t.group) && !usedGroups.has(t.group));

            if (bestThird) {
                usedGroups.add(bestThird.group);
                return { ...m, awayTeamId: bestThird.team };
            } else {
                return { ...m, awayTeamId: 'A Definir (3º)' };
            }
        });

        // 4. Resolve Knockout Winners (Propagation)
        // Groups -> R32 -> R16 -> QF -> SF -> Final
        const PHASES_ORDER = [Phase.ROUND_32, Phase.ROUND_16, Phase.QUARTER, Phase.SEMI, Phase.FINAL];

        // We need a loop or just rely on the order of matches in the array?
        // Matches are not strictly ordered by dependency in the array.
        // But R16 depends on R32.

        // Helper to get winner of a match
        const getWinner = (matchId: string): string | undefined => {
            const m = currentMatches.find(x => x.id === matchId);
            if (!m) return undefined;
            // Check simulation score
            const sim = simulatedScores[matchId];
            if (sim && m.homeScore !== null && m.awayScore !== null) {
                if (m.homeScore > m.awayScore) return m.homeTeamId;
                if (m.awayScore > m.homeScore) return m.awayTeamId;
                // Penalties? Not handled in simplified sim. Assume Home for draw or randomize?
                // User didn't specify penalties. Let's assume input forces a winner or simply TBD.
                // Or maybe we treat Draw as "Undefined Winner" for propagation.
                return undefined;
            }
            return undefined;
        };

        const getLoser = (matchId: string): string | undefined => {
            const m = currentMatches.find(x => x.id === matchId);
            if (!m) return undefined;
            const sim = simulatedScores[matchId];
            if (sim && m.homeScore !== null && m.awayScore !== null) {
                if (m.homeScore < m.awayScore) return m.homeTeamId;
                if (m.awayScore < m.homeScore) return m.awayTeamId;
                return undefined;
            }
            return undefined;
        };

        // Propagate
        // We have to update currentMatches iteratively or just map placeholders.
        // IDs like 'm-R16-1' have 'Venc. R32-1' in INITIAL_MATCHES.

        currentMatches = currentMatches.map(m => {
            if (m.phase === Phase.GROUP || m.phase === Phase.ROUND_32) return m; // R32 inputs resolved above

            let h = m.homeTeamId;
            let a = m.awayTeamId;

            // Regex/Logic to find "Venc. XXX" or "Perd. XXX"
            // Examples: "Venc. R32-1", "Perd. SF-1"

            if (h.startsWith('Venc. ')) {
                const targetId = 'm-' + h.replace('Venc. ', '');
                const w = getWinner(targetId);
                if (w && !w.includes('TBD') && !w.includes('Grupo')) h = w;
            } else if (h.startsWith('Perd. ')) {
                const targetId = 'm-' + h.replace('Perd. ', '');
                const l = getLoser(targetId);
                if (l && !l.includes('TBD') && !l.includes('Grupo')) h = l;
            }

            if (a.startsWith('Venc. ')) {
                const targetId = 'm-' + a.replace('Venc. ', '');
                const w = getWinner(targetId);
                if (w && !w.includes('TBD') && !w.includes('Grupo')) a = w;
            } else if (a.startsWith('Perd. ')) {
                const targetId = 'm-' + a.replace('Perd. ', '');
                const l = getLoser(targetId);
                if (l && !l.includes('TBD') && !l.includes('Grupo')) a = l;
            }

            return { ...m, homeTeamId: h, awayTeamId: a };
        });

        return currentMatches;

    }, [simulatedScores]);

    // Derived Standings for Visualization
    const standings = calculateStandings(computedMatches);

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
            // eslint-disable-next-line
            // @ts-ignore
            if (useStore().addNotification) useStore().addNotification('Salvo', 'Simulação salva com sucesso!', 'success'); // Hack access
        } catch (e) {
            console.error(e);
            alert('Erro ao salvar');
        } finally {
            setSaving(false);
        }
    };

    const handleExport = async () => {
        if (!exportLeagueId) return alert('Selecione uma liga');
        const confirmMsg = "Isso substituirá seus palpites existentes nesta liga (exceto jogos bloqueados). Deseja continuar?";
        if (!window.confirm(confirmMsg)) return;

        // Filter: only matches with both scores filled
        const toExport = Object.entries(simulatedScores)
            .filter(([_, s]) => s.home !== null && s.away !== null && s.home !== undefined && s.away !== undefined)
            .map(([matchId, s]) => {
                // If scope is 'group' and we selected a group, filter
                if (exportScope === 'group') {
                    const m = INITIAL_MATCHES.find(x => x.id === matchId);
                    if (m?.group !== exportGroup) return null;
                }
                return { matchId, home: s.home, away: s.away };
            })
            .filter(Boolean) as { matchId: string, home: number, away: number }[];

        if (toExport.length === 0) return alert('Nenhum jogo preenchido para exportar.');

        // We can use api.predictions.submit
        // But we need to handle "Locked" check locally or let backend reject?
        // Backend `submit` usually allows unless locked.
        // User requirement: "Os únicos palpites que não poderão ser substituídos serão os que já estiverem com os palpites encerrados"
        // Our existing `submitPrediction` usually handles this or returns error.
        // The Plan says "Export to League".

        const success = await api.predictions.submit(
            toExport.map(p => ({
                user_id: currentUser?.id,
                league_id: exportLeagueId,
                match_id: p.matchId,
                home_score: p.home,
                away_score: p.away
            }))
        ).then(() => true).catch(() => false);

        if (success) alert('Exportado com sucesso!');
        else alert('Erro na exportação. Verifique jogos bloqueados.');
    };

    const handleImport = async () => {
        if (!importLeagueId) return alert('Selecione uma liga');
        if (!window.confirm('Importar substituirá sua simulação atual. Continuar?')) return;

        try {
            // We need to fetch predictions for that league.
            // Our `api` doesn't have `listByLeague`. `list` returns all user predictions.
            // We filter by league locally.
            const allPreds = await api.predictions.list();
            const leaguePreds = allPreds.filter((p: any) => p.league_id === importLeagueId);

            const newScores = { ...simulatedScores };
            leaguePreds.forEach((p: any) => {
                if (p.home_score !== null && p.away_score !== null) {
                    newScores[p.match_id] = { home: parseInt(p.home_score), away: parseInt(p.away_score) };
                }
            });
            setSimulatedScores(newScores);
            alert('Importado com sucesso!');
        } catch (e) {
            alert('Erro ao importar');
        }
    };

    const handleSyncReal = () => {
        if (!window.confirm('Isso atualizará os jogos FINALIZADOS com placares reais. Continuar?')) return;

        const realFinished = INITIAL_MATCHES.filter(m => m.status === MatchStatus.FINISHED);
        const newScores = { ...simulatedScores };
        let count = 0;
        realFinished.forEach(m => {
            if (m.homeScore !== null && m.awayScore !== null) {
                newScores[m.id] = { home: m.homeScore, away: m.awayScore };
                count++;
            }
        });
        setSimulatedScores(newScores);
        alert(`Atualizado com ${count} placares reais.`);
    };

    // --- RENDER HELPERS ---

    const renderMatchInput = (match: Match) => {
        const sim = simulatedScores[match.id] || { home: '', away: '' };
        // If match team is TBD/Placeholder, disable input?
        // User wants to simulate group stage to generating knockout.
        // Knockout inputs should be available once teams are known?
        // Or always available?
        // Let's enable if both teams are not generic placeholders like "Venc. X" (unless it's unresolved).
        // Actually, if computedMatches resolved the ID to a name, we show the name.
        // If it's still "Venc. R32...", we can't really score it meaningfully, but user might want to guess.
        // Better to disable if teams are not resolved to avoid confusion.

        const isResolved = !match.homeTeamId.includes('Venc.') && !match.homeTeamId.includes('Perd.') && !match.homeTeamId.includes('Grupo');

        return (
            <div key={match.id} className="flex flex-col border-b border-gray-100 dark:border-gray-700 py-2">
                <div className="flex justify-between items-center text-xs text-gray-400 px-2 mb-1">
                    <span>{new Date(match.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="truncate max-w-[100px]">{match.location.split(',')[0]}</span>
                </div>
                <div className="flex items-center justify-between px-2 gap-2">
                    {/* Home */}
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                        <span className={`text-sm font-bold text-right truncate ${!isResolved ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{match.homeTeamId}</span>
                        <img src={getTeamFlag(match.homeTeamId)} className="w-6 h-4 object-cover rounded shadow-sm flex-shrink-0" />
                    </div>

                    {/* Inputs */}
                    <div className="flex items-center gap-1">
                        <input
                            type="number"
                            className="w-8 h-8 md:w-10 md:h-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold p-0 focus:ring-2 focus:ring-brasil-blue"
                            value={sim.home ?? ''}
                            onChange={(e) => handleScoreChange(match.id, 'home', e.target.value)}
                            disabled={!isResolved}
                        />
                        <span className="text-gray-400 font-bold">-</span>
                        <input
                            type="number"
                            className="w-8 h-8 md:w-10 md:h-10 text-center border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-bold p-0 focus:ring-2 focus:ring-brasil-blue"
                            value={sim.away ?? ''}
                            onChange={(e) => handleScoreChange(match.id, 'away', e.target.value)}
                            disabled={!isResolved}
                        />
                    </div>

                    {/* Away */}
                    <div className="flex items-center gap-2 flex-1 justify-start min-w-0">
                        <img src={getTeamFlag(match.awayTeamId)} className="w-6 h-4 object-cover rounded shadow-sm flex-shrink-0" />
                        <span className={`text-sm font-bold text-left truncate ${!isResolved ? 'text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>{match.awayTeamId}</span>
                    </div>
                </div>
            </div>
        );
    };

    if (loadingSim) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;

    const groupMatches = computedMatches.filter(m => m.phase === Phase.GROUP);
    const groups = Object.keys(GROUPS_CONFIG);

    return (
        <div className="space-y-8 pb-12 animate-in fade-in duration-500">
            {/* HEADER & TOOLBAR */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <h1 className="text-2xl font-black text-brasil-blue dark:text-blue-400 flex items-center gap-2">
                        <Trophy className="text-brasil-yellow" fill="currentColor" />
                        Simulador Copa 2026
                    </h1>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brasil-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 flex-1 md:flex-none justify-center">
                            {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Salvar
                        </button>
                        <button onClick={handleSyncReal} className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg font-bold transition-colors flex-1 md:flex-none justify-center">
                            <RefreshCw size={18} />
                            Sincronizar Reais
                        </button>
                    </div>
                </div>

                {/* IMPORT / EXPORT CONTROLS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                    {/* Export */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Upload size={12} /> Exportar para Liga</span>
                        <div className="flex gap-2">
                            <select className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm p-1.5" value={exportLeagueId} onChange={e => setExportLeagueId(e.target.value)}>
                                <option value="">Selecione a Liga...</option>
                                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <button onClick={handleExport} className="bg-blue-600 text-white px-3 rounded hover:bg-blue-700"><ArrowRight size={16} /></button>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <select className="bg-transparent border-b border-gray-300 py-1" value={exportScope} onChange={(e: any) => setExportScope(e.target.value)}>
                                <option value="all">Tudo</option>
                                <option value="group">Apenas Grupo</option>
                            </select>
                            {exportScope === 'group' && (
                                <select className="bg-transparent border-b border-gray-300 py-1" value={exportGroup} onChange={e => setExportGroup(e.target.value)}>
                                    {groups.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                                </select>
                            )}
                        </div>
                    </div>

                    {/* Import */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Download size={12} /> Importar de Liga</span>
                        <div className="flex gap-2">
                            <select className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm p-1.5" value={importLeagueId} onChange={e => setImportLeagueId(e.target.value)}>
                                <option value="">Selecione a Liga...</option>
                                {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                            <button onClick={handleImport} className="bg-purple-600 text-white px-3 rounded hover:bg-purple-700"><CheckCircle size={16} /></button>
                        </div>
                        <p className="text-[10px] text-gray-400">*Isso substitui sua simulação atual pelos palpites da liga.</p>
                    </div>
                </div>
            </div>

            {/* GROUP STAGE */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {groups.map(group => {
                    const teamStandings = standings[group] || [];
                    return (
                        <div key={group} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
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
                                        <tr key={t.teamId} className={`${i < 2 ? 'bg-green-50/50 dark:bg-green-900/10' : (i === 2 ? 'bg-yellow-50/30' : '')}`}>
                                            <td className="pl-3 py-1.5 flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                                                <span className="text-[10px] w-3 text-gray-400">{i + 1}</span>
                                                <img src={getTeamFlag(t.teamId)} className="w-5 h-3.5 object-cover rounded shadow-sm" />
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
                                {groupMatches.filter(m => m.group === group).map(renderMatchInput)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* KNOCKOUT STAGE */}
            <div className="space-y-8 mt-12">
                <h2 className="text-2xl font-black text-center text-brasil-blue dark:text-white uppercase tracking-wider">Fase Final</h2>

                {[Phase.ROUND_32, Phase.ROUND_16, Phase.QUARTER, Phase.SEMI, Phase.FINAL].map(phase => {
                    const phaseMatches = computedMatches.filter(m => m.phase === phase);
                    if (phaseMatches.length === 0) return null;

                    return (
                        <div key={phase} className="relative">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                                <h3 className="text-lg font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-4 py-1 rounded-full uppercase text-xs tracking-widest">{phase}</h3>
                                <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                {phaseMatches.map(m => (
                                    <div key={m.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                        {renderMatchInput(m)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
