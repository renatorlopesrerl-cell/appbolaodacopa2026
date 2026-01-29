import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../App';
import { GROUPS_CONFIG, calculateStandings, getTeamFlag } from '../services/dataService';
import { MatchStatus, Phase } from '../types';
import { Clock, Trophy, Medal, ArrowLeft, Filter, ChevronDown, Loader2, X } from 'lucide-react';

export const TablePage: React.FC = () => {
  const navigate = useNavigate();
  const { matches, currentUser, loading } = useStore();
  const standings = calculateStandings(matches);

  // Filter States
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');

  const groups = Object.keys(GROUPS_CONFIG);
  const KNOCKOUT_PHASES = [
    Phase.ROUND_32,
    Phase.ROUND_16,
    Phase.QUARTER,
    Phase.SEMI,
    Phase.FINAL
  ];

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
  }

  // Guaranteed by ProtectedRoute
  if (!currentUser) return <Navigate to="/" replace />;

  // Filter Logic
  const showGroupStage = filterPhase === 'all' || filterPhase === Phase.GROUP;

  const visibleGroups = filterGroup === 'all'
    ? groups
    : groups.filter(g => g === filterGroup);

  const visibleKnockoutPhases = KNOCKOUT_PHASES.filter(p =>
    filterPhase === 'all' || filterPhase === p
  );

  const hasFilters = filterPhase !== 'all' || filterGroup !== 'all';

  const clearFilters = () => {
    setFilterPhase('all');
    setFilterGroup('all');
  };

  // Helper to render a list of matches
  const renderMatchList = (phaseMatches: typeof matches) => {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {phaseMatches
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map(match => {
            const matchDate = new Date(match.date);
            const isDateValid = !isNaN(matchDate.getTime());
            const isLive = match.status === MatchStatus.IN_PROGRESS;
            const isFinished = match.status === MatchStatus.FINISHED;

            // Logic to bold winner
            const homeWinner = (match.homeScore ?? -1) > (match.awayScore ?? -1);
            const awayWinner = (match.awayScore ?? -1) > (match.homeScore ?? -1);

            return (
              <div key={match.id} className={`p-4 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0 ${isLive ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500 pl-3' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                {/* Header: Date & Location */}
                <div className="flex justify-between items-center text-xs mb-3">
                  <span className="capitalize flex items-center gap-1 font-bold text-gray-500 dark:text-gray-400">
                    {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                    {isDateValid ? matchDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' }) : 'Data a definir'}
                  </span>
                  <span className="truncate max-w-[150px] text-right text-gray-400 dark:text-gray-500" title={match.location}>{match.location}</span>
                </div>

                {/* Match Info */}
                <div className="flex justify-between items-center">
                  {/* Home Team */}
                  <div className="flex items-center justify-end w-[35%] gap-2 md:gap-3">
                    <span className={`truncate leading-tight text-right ${homeWinner && (isFinished || isLive) ? 'text-gray-900 dark:text-white font-black' : 'text-gray-900 dark:text-gray-200 font-bold'} text-sm md:text-base`}>{match.homeTeamId}</span>
                    <img src={getTeamFlag(match.homeTeamId)} alt={match.homeTeamId} className="w-7 h-5 object-cover rounded shadow-sm" />
                  </div>

                  {/* Score / Time */}
                  <div className="w-[30%] text-center flex justify-center px-1">
                    {isFinished ? (
                      <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-black text-gray-800 dark:text-gray-100 tracking-widest text-sm md:text-base border border-gray-200 dark:border-gray-600 shadow-sm whitespace-nowrap">
                        {match.homeScore}-{match.awayScore}
                      </span>
                    ) : isLive ? (
                      <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-black text-sm md:text-base tracking-widest border border-green-200 dark:border-green-800 animate-pulse flex items-center gap-1 shadow-sm whitespace-nowrap">
                        {match.homeScore ?? 0}-{match.awayScore ?? 0}
                      </span>
                    ) : (
                      <span className="text-brasil-blue dark:text-blue-300 font-bold border border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded text-xs md:text-sm shadow-sm">
                        {isDateValid ? matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
                      </span>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex items-center justify-start w-[35%] gap-2 md:gap-3">
                    <img src={getTeamFlag(match.awayTeamId)} alt={match.awayTeamId} className="w-7 h-5 object-cover rounded shadow-sm" />
                    <span className={`truncate leading-tight text-left ${awayWinner && (isFinished || isLive) ? 'text-gray-900 dark:text-white font-black' : 'text-gray-900 dark:text-gray-200 font-bold'} text-sm md:text-base`}>{match.awayTeamId}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
        >
          <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
            <ArrowLeft size={18} />
          </div>
          Voltar
        </button>
      </div>

      {/* MATCH SIMULATOR PAGE HEADER DESIGN */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h1 className="text-2xl font-black text-brasil-green dark:text-green-400 flex items-center gap-2">
            <Trophy className="text-brasil-yellow" fill="currentColor" />
            Tabela da Copa 2026
          </h1>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
            <Clock size={12} />
            Todos os jogos estão no horário de Brasília (BRT)
          </div>
        </div>

        {/* FILTERS SECTION INTEGRATED IN HEADER CARD */}
        <div className="flex flex-col gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 px-1">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
              <Filter size={16} className="text-brasil-green dark:text-green-400" />
              Filtros
            </div>
            {hasFilters && (
              <button
                onClick={clearFilters}
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
      </div>

      {/* FILTERS SECTION */}


      {/* --- FASE DE GRUPOS --- */}
      {showGroupStage && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {visibleGroups.map(group => (
              <div key={group} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-2 border-b border-gray-100 dark:border-gray-600 flex justify-between items-center">
                  <h3 className="font-black text-gray-700 dark:text-gray-200">GRUPO {group}</h3>
                </div>

                <div className="overflow-x-auto">
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
                      {standings[group]?.map((team, idx) => (
                        <tr key={team.teamId} className={`${idx < 2 ? 'bg-green-50/50 dark:bg-green-900/10' : (idx === 2 ? 'bg-yellow-50/30' : '')}`}>
                          <td className="pl-3 py-1.5 flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
                            <span className="text-[10px] w-3 text-gray-400">{idx + 1}</span>
                            <img src={getTeamFlag(team.teamId)} alt={team.teamId} className="w-7 h-5 object-cover rounded shadow-sm" />
                            <span className="truncate max-w-[100px] text-sm md:text-base">{team.teamId}</span>
                          </td>
                          <td className="text-center font-bold px-1">{team.points}</td>
                          <td className="text-center text-gray-500 px-1">{team.played}</td>
                          <td className="text-center text-gray-500 px-1">{team.won}</td>
                          <td className="text-center text-gray-500 px-1">{team.drawn}</td>
                          <td className="text-center text-gray-500 px-1">{team.lost}</td>
                          <td className="text-center text-gray-500 px-1">{team.gf}</td>
                          <td className="text-center text-gray-500 px-1">{team.ga}</td>
                          <td className="text-center text-gray-500 px-1">{team.gd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Jogos do Grupo */}
                <div className="bg-gray-50/30 dark:bg-gray-900/20 border-t border-gray-100 dark:border-gray-700">
                  {renderMatchList(matches.filter(m => m.group === group))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- FASE FINAL --- */}
      {visibleKnockoutPhases.length > 0 && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-4 mb-4 mt-8">
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
            <h3 className="text-2xl font-black text-center text-brasil-green dark:text-white uppercase tracking-wider">Fase Final</h3>
            <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1"></div>
          </div>

          <div className="flex flex-col gap-8">
            {visibleKnockoutPhases.map(phase => {
              const phaseMatches = matches.filter(m => m.phase === phase);
              if (phaseMatches.length === 0) return null;

              const isFinal = phase === Phase.FINAL;

              return (
                <div key={phase} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 ${isFinal ? 'border-brasil-yellow shadow-md ring-1 ring-brasil-yellow/20' : ''}`}>
                  <div className={`px-4 py-2 font-bold flex justify-between items-center ${isFinal ? 'bg-gradient-to-r from-brasil-yellow to-yellow-500 text-brasil-blue' : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200'}`}>
                    <span className="flex items-center gap-2 text-sm uppercase">
                      {isFinal && <Medal size={16} />}
                      {phase}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-gray-900/30">
                    {renderMatchList(phaseMatches)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};