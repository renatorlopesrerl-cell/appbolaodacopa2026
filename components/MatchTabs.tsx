import React, { useState } from 'react';
import { MatchDetails } from '../services/matchDetailsService';
import { Shield, Clock, BarChart3, Users, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const TabEscalacao = ({ data, isLoading, getTeamName, getTeamFlag }: { data: MatchDetails | null, isLoading: boolean, getTeamName: (id: number) => string, getTeamFlag: (id: number) => string }) => {
    const [viewMode, setViewMode] = useState<'list'|'pitch'>('list');

    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brasil-green" /></div>;
    if (!data?.lineups || data.lineups.length === 0) return <div className="p-8 text-center text-gray-500">Escalação não disponível no momento.</div>;
    
    const getPlayerEvents = (playerId: number, playerName: string, teamId: number) => {
        if (!data?.events) return [];
        const pEvents: any[] = [];
        data.events.forEach((ev: any) => {
            if (ev.team.id !== teamId) return;
            const isMainPlayer = ev.player.id === playerId || ev.player.name === playerName;
            const isAssistPlayer = ev.assist.id === playerId || (ev.assist.name && ev.assist.name === playerName);
            
            if (ev.type === 'Goal' && ev.detail !== 'Missed Penalty') {
                if (isMainPlayer) pEvents.push({ type: 'goal', detail: 'scorer' });
                if (isAssistPlayer) pEvents.push({ type: 'goal', detail: 'assist' });
            } else if (ev.type === 'Card' && isMainPlayer) {
                pEvents.push({ type: 'card', detail: ev.detail });
            } else if (ev.type === 'subst') {
                if (isMainPlayer) pEvents.push({ type: 'subst', detail: 'out' });
                if (isAssistPlayer) pEvents.push({ type: 'subst', detail: 'in' });
            }
        });
        return pEvents;
    };

    const renderPlayerRow = (playerObj: any, teamId: number, j: number) => {
        const pEvents = getPlayerEvents(playerObj.player.id, playerObj.player.name, teamId);
        return (
            <div key={j} className="flex justify-between items-center text-gray-700 dark:text-gray-300">
                <span className="flex items-center gap-2">
                    <span className="w-4 text-xs font-bold text-gray-400">{playerObj.player.number}</span>
                    {playerObj.player.name}
                    {pEvents.length > 0 && (
                        <span className="flex items-center gap-1 ml-1">
                            {pEvents.map((ev, idx) => (
                                <React.Fragment key={idx}>
                                    {ev.type === 'goal' && ev.detail === 'scorer' && <span className="text-[12px] leading-none" title="Gol">⚽</span>}
                                    {ev.type === 'goal' && ev.detail === 'assist' && <span className="text-[12px] leading-none" title="Assistência">👟</span>}
                                    {ev.type === 'card' && <div className={`w-2 h-3 rounded-sm shadow-sm ${ev.detail === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-500'}`} title={ev.detail}></div>}
                                    {ev.type === 'subst' && ev.detail === 'in' && <span title="Entrou"><ArrowUpRight size={14} strokeWidth={3} className="text-green-500" /></span>}
                                    {ev.type === 'subst' && ev.detail === 'out' && <span title="Saiu"><ArrowDownRight size={14} strokeWidth={3} className="text-red-500" /></span>}
                                </React.Fragment>
                            ))}
                        </span>
                    )}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${playerObj.player.pos === 'G' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'}`}>
                    {playerObj.player.pos}
                </span>
            </div>
        );
    };

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 text-sm h-[400px] overflow-y-auto">
            <div className="flex justify-center mb-5">
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-1 flex">
                    <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow text-brasil-blue dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-200'}`}>Lista</button>
                    <button onClick={() => setViewMode('pitch')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${viewMode === 'pitch' ? 'bg-white dark:bg-gray-600 shadow text-brasil-blue dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-white dark:hover:text-gray-200'}`}>Campinho</button>
                </div>
            </div>

            {viewMode === 'list' ? (
                data.lineups.map((team: any, i: number) => (
                    <div key={i} className="mb-6">
                        <h4 className="font-black text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                            <img src={getTeamFlag(team.team.id) || team.team.logo} className="w-5 h-5 object-contain" alt=""/>
                            {getTeamName(team.team.id) || team.team.name}
                            <span className="text-xs font-normal text-gray-400">({team.formation})</span>
                        </h4>
                        
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-md border-2 border-brasil-green/30 dark:border-green-500/30 mb-3 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-brasil-green"></div>
                            <h5 className="text-xs font-black text-brasil-green uppercase mb-2 ml-2">Titulares</h5>
                            <div className="space-y-2">
                                {team.startXI.map((playerObj: any, j: number) => renderPlayerRow(playerObj, team.team.id, j))}
                            </div>
                        </div>
                        
                        <div className="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-md border-2 border-yellow-400/30 dark:border-yellow-500/20 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-yellow-200 dark:bg-yellow-500/60"></div>
                            <h5 className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase mb-2 ml-2">Reservas</h5>
                            <div className="space-y-2">
                                {team.substitutes.map((playerObj: any, j: number) => renderPlayerRow(playerObj, team.team.id, j))}
                            </div>
                        </div>
                        {team.coach && (
                             <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
                                <strong>Técnico:</strong> {team.coach.name}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="space-y-8 pb-4">
                    {data.lineups.map((team: any, i: number) => {
                         const rows: Record<string, any[]> = {};
                         team.startXI.forEach((p: any) => {
                             const row = p.player.grid ? p.player.grid.split(':')[0] : '1';
                             if (!rows[row]) rows[row] = [];
                             rows[row].push(p);
                         });
                         const sortedRows = Object.keys(rows).sort((a,b) => Number(b) - Number(a));
                         
                         // Sort players left-to-right based on their grid column
                         Object.keys(rows).forEach(r => {
                             rows[r].sort((a, b) => {
                                 const colA = a.player.grid ? Number(a.player.grid.split(':')[1]) : 0;
                                 const colB = b.player.grid ? Number(b.player.grid.split(':')[1]) : 0;
                                 return colA - colB;
                             });
                         });

                         return (
                             <div key={i} className="mb-2">
                                 <h4 className="font-black text-gray-800 dark:text-gray-200 mb-3 flex items-center justify-center gap-2">
                                     <img src={getTeamFlag(team.team.id) || team.team.logo} className="w-6 h-6 object-contain" alt=""/>
                                     {getTeamName(team.team.id) || team.team.name}
                                     <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full text-gray-500">{team.formation}</span>
                                 </h4>
                                 <div className="relative w-full aspect-[2/3] max-w-[320px] mx-auto bg-green-600 border-2 border-white rounded-lg p-3 flex flex-col justify-between shadow-lg" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 10%, rgba(255,255,255,0.07) 10%, rgba(255,255,255,0.07) 20%)' }}>
                                     {/* Center circle line */}
                                     <div className="absolute top-1/2 left-0 w-full h-px bg-white/40"></div>
                                     <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full border border-white/40 -translate-x-1/2 -translate-y-1/2"></div>
                                     <div className="absolute top-0 left-1/2 w-24 h-12 border-x border-b border-white/40 -translate-x-1/2"></div>
                                     <div className="absolute bottom-0 left-1/2 w-24 h-12 border-x border-t border-white/40 -translate-x-1/2"></div>
                                     
                                     {sortedRows.map(r => (
                                         <div key={r} className="flex justify-around items-center w-full z-10">
                                            {rows[r].map((p: any) => {
                                                const parts = p.player.name.split(' ');
                                                let displayName = p.player.name;
                                                if (parts.length > 1) {
                                                    const first = parts[0];
                                                    const last = parts[parts.length - 1];
                                                    displayName = `${first.charAt(0).toUpperCase()}. ${last}`;
                                                }
                                                return (
                                                    <div key={p.player.id} className="flex flex-col items-center">
                                                        <div className={`w-7 h-7 font-black text-xs rounded-full flex items-center justify-center shadow-md border-2 shrink-0 ${p.player.pos === 'G' ? 'bg-orange-500 text-white border-orange-300' : 'bg-white text-gray-800 border-gray-300'}`}>
                                                            {p.player.number}
                                                        </div>
                                                        <div className="text-[9px] font-bold text-white mt-1 bg-black/60 px-1.5 py-0.5 rounded max-w-[65px] truncate text-center shadow-sm">
                                                            {displayName}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )
                    })}
                </div>
            )}
        </div>
    );
}

export const TabLances = ({ data, isLoading, getTeamName, getTeamFlag }: { data: MatchDetails | null, isLoading: boolean, getTeamName: (id: number) => string, getTeamFlag: (id: number) => string }) => {
    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brasil-green" /></div>;
    if (!data?.events || data.events.length === 0) return <div className="p-8 text-center text-gray-500">Nenhum evento registrado ainda.</div>;

    const reversedEvents = [...data.events].reverse();

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 text-sm h-[400px] overflow-y-auto space-y-3">
            {reversedEvents.map((ev: any, i: number) => {
                const isGoal = ev.type === 'Goal' && ev.detail !== 'Missed Penalty';
                const isMissedPenalty = ev.type === 'Goal' && ev.detail === 'Missed Penalty';
                const isCard = ev.type === 'Card';
                const isSub = ev.type === 'subst';
                
                return (
                    <div key={i} className={`flex gap-3 p-3 rounded-lg shadow-sm items-center ${isGoal ? 'border border-green-400 bg-green-50 dark:bg-green-900/20' : isMissedPenalty ? 'border border-red-200 bg-red-50/50 dark:bg-red-900/10' : 'bg-white dark:bg-gray-700'}`}>
                        <div className={`font-black min-w-[35px] text-right ${isGoal ? 'text-green-600 dark:text-green-400' : isMissedPenalty ? 'text-red-500 dark:text-red-400' : 'text-brasil-blue dark:text-blue-400'}`}>
                            {ev.time.elapsed}'
                        </div>
                        
                        <div className="flex-1">
                            <div className="font-bold text-gray-800 dark:text-gray-200 text-xs flex items-center gap-1.5 mb-1.5">
                                <img src={getTeamFlag(ev.team.id) || ev.team.logo} className="w-4 h-4 object-contain drop-shadow-sm" alt="" />
                                {getTeamName(ev.team.id) || ev.team.name}
                            </div>
                            
                            {isSub ? (
                                <div className="flex flex-col text-[11px] font-bold gap-1 mt-1">
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                        <div className="w-5 flex justify-center shrink-0">
                                            <ArrowUpRight size={14} strokeWidth={3} />
                                        </div>
                                        <span>{ev.assist.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                                        <div className="w-5 flex justify-center shrink-0">
                                            <ArrowDownRight size={14} strokeWidth={3} />
                                        </div>
                                        <span>{ev.player.name}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="w-5 flex justify-center shrink-0">
                                        {isGoal && <span className="text-lg leading-none">⚽</span>}
                                        {isMissedPenalty && <span className="text-sm font-black text-red-500 leading-none">❌</span>}
                                        {isCard && <div className={`w-3 h-4 rounded-sm shadow-sm ${ev.detail === 'Yellow Card' ? 'bg-yellow-400' : 'bg-red-500'}`}></div>}
                                    </div>
                                    <div className="text-sm text-gray-700 dark:text-gray-300">
                                        <span className={isGoal ? 'font-bold' : isMissedPenalty ? 'font-medium line-through opacity-70' : ''}>{ev.player.name}</span>
                                        {isGoal && ev.detail === 'Own Goal' && <span className="text-[11px] text-red-500 font-bold ml-1 uppercase">(Contra)</span>}
                                        {isGoal && ev.detail !== 'Own Goal' && ev.assist.name && <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 font-normal">(ass: {ev.assist.name})</span>}
                                        {isMissedPenalty && <span className="text-[11px] text-red-500 font-bold ml-1 uppercase">(Pênalti Perdido)</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export const TabScouts = ({ data, isLoading, getTeamName, getTeamFlag }: { data: MatchDetails | null, isLoading: boolean, getTeamName: (id: number) => string, getTeamFlag: (id: number) => string }) => {
    if (isLoading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-brasil-green" /></div>;
    if (!data?.statistics || data.statistics.length === 0) return <div className="p-8 text-center text-gray-500">Estatísticas não disponíveis.</div>;

    const team1 = data.statistics[0];
    const team2 = data.statistics[1];

    if (!team1 || !team2) return null;

    const findStat = (team: any, type: string) => team.statistics.find((s: any) => s.type === type)?.value || 0;

    const statsToCompare = [
        { label: 'Posse de Bola', type: 'Ball Possession' },
        { label: 'Total de Chutes', type: 'Total Shots' },
        { label: 'Chutes a Gol', type: 'Shots on Goal' },
        { label: 'Chutes Fora', type: 'Shots off Goal' },
        { label: 'Faltas', type: 'Fouls' },
        { label: 'Escanteios', type: 'Corner Kicks' },
        { label: 'Impedimentos', type: 'Offsides' },
        { label: 'Cartões Amarelos', type: 'Yellow Cards' },
        { label: 'Cartões Vermelhos', type: 'Red Cards' },
        { label: 'Defesas do Goleiro', type: 'Goalkeeper Saves' },
        { label: 'Total de Passes', type: 'Total passes' },
        { label: 'Passes Certos', type: 'Passes accurate' },
        { label: 'Precisão de Passes', type: 'Passes %' }
    ];

    return (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 text-sm h-[400px] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 px-2">
                <div className="text-center w-1/3">
                    <img src={getTeamFlag(team1.team.id) || team1.team.logo} className="w-8 h-8 mx-auto mb-1 object-contain drop-shadow-sm" alt="" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">{getTeamName(team1.team.id) || team1.team.name}</span>
                </div>
                <div className="text-xs font-black text-gray-400 w-1/3 text-center">x</div>
                <div className="text-center w-1/3">
                    <img src={getTeamFlag(team2.team.id) || team2.team.logo} className="w-8 h-8 mx-auto mb-1 object-contain drop-shadow-sm" alt="" />
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase">{getTeamName(team2.team.id) || team2.team.name}</span>
                </div>
            </div>

            <div className="space-y-4">
                {statsToCompare.map((stat, i) => {
                    let val1 = findStat(team1, stat.type);
                    let val2 = findStat(team2, stat.type);
                    
                    let num1 = typeof val1 === 'string' ? parseInt(val1) : val1;
                    let num2 = typeof val2 === 'string' ? parseInt(val2) : val2;
                    if (isNaN(num1)) num1 = 0;
                    if (isNaN(num2)) num2 = 0;
                    
                    const total = num1 + num2;
                    const pct1 = total > 0 ? (num1 / total) * 100 : 50;
                    const pct2 = total > 0 ? (num2 / total) * 100 : 50;

                    return (
                        <div key={i} className="mb-2">
                            <div className="flex justify-between text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 px-1">
                                <span>{val1}</span>
                                <span className="uppercase text-[10px] text-gray-600 dark:text-gray-400 tracking-wider font-semibold">{stat.label}</span>
                                <span>{val2}</span>
                            </div>
                            <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full flex overflow-hidden">
                                <div className="h-full bg-brasil-blue" style={{ width: `${pct1}%` }}></div>
                                <div className="h-full bg-gray-400 dark:bg-gray-500" style={{ width: `${pct2}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
