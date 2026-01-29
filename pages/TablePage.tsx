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
                    <span className={`truncate leading-tight text-right ${homeWinner && (isFinished || isLive) ? 'text-gray-900 dark:text-white font-black' : 'text-gray-900 dark:text-gray-200 font-bold'} text-sm md:text-lg`}>{match.homeTeamId}</span>
                    <img src={getTeamFlag(match.homeTeamId)} alt={match.homeTeamId} className="w-10 h-7 object-cover rounded shadow-md" />
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
                    <img src={getTeamFlag(match.awayTeamId)} alt={match.awayTeamId} className="w-10 h-7 object-cover rounded shadow-md" />
                    <span className={`truncate leading-tight text-left ${awayWinner && (isFinished || isLive) ? 'text-gray-900 dark:text-white font-black' : 'text-gray-900 dark:text-gray-200 font-bold'} text-sm md:text-lg`}>{match.awayTeamId}</span>
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

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <h1 className="text-2xl font-bold text-brasil-green dark:text-green-400">Tabela da Copa 2026</h1>
        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-sm">
          <Clock size={12} />
          Todos os horários estão em Brasília (BRT)
        </div>
      </div>

      {/* FILTERS SECTION */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
            <Filter size={16} className="text-brasil-blue dark:text-blue-400" />
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
              className="w-full md:w-48 appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
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
                className="w-full md:w-32 appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
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

      {/* --- FASE DE GRUPOS --- */}
      {showGroupStage && (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 pl-1 border-l-4 border-brasil-yellow flex items-center gap-2">
            Fase de Grupos
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {visibleGroups.map(group => (
              <div key={group} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="bg-brasil-blue dark:bg-blue-900 text-white px-4 py-2 font-bold flex justify-between items-center">
                  <span className="text-lg">Grupo {group}</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm md:text-base">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 text-xs md:text-sm">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold pl-4">País</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Pontos">Pts</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Jogos">J</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Vitórias">V</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Empates">E</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Derrotas">D</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Gols Marcados">GM</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Gols Sofridos">GS</th>
                        <th className="px-2 py-2 text-center font-semibold" title="Saldo de Gols">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {standings[group]?.map((team, idx) => (
                        <tr key={team.teamId} className={idx < 2 ? 'bg-green-50/50 dark:bg-green-900/20' : ''}>
                          <td className="px-3 py-3 font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3 pl-4">
                            <span className="w-4 text-center text-xs text-gray-400 font-normal">{idx + 1}</span>
                            <img src={getTeamFlag(team.teamId)} alt={team.teamId} className="w-8 h-6 object-cover rounded shadow-sm" />
                            {team.teamId}
                          </td>
                          <td className="px-2 py-3 text-center font-black text-gray-900 dark:text-white">{team.points}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">{team.played}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">{team.won}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">{team.drawn}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">{team.lost}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">{team.gf}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400">{team.ga}</td>
                          <td className="px-2 py-3 text-center text-gray-500 dark:text-gray-400 font-medium">{team.gd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Jogos do Grupo */}
                <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <p className="text-xs font-bold text-gray-400 uppercase py-2 px-3 border-b border-gray-100 dark:border-gray-700">Jogos do Grupo</p>
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
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-4 pl-1 border-l-4 border-brasil-green flex items-center gap-2 mt-8">
            <Trophy size={20} className="text-brasil-green dark:text-green-400" />
            Fase Final
          </h2>

          <div className="grid grid-cols-1 gap-6">
            {visibleKnockoutPhases.map(phase => {
              const phaseMatches = matches.filter(m => m.phase === phase);
              if (phaseMatches.length === 0) return null;

              const isFinal = phase === Phase.FINAL;

              return (
                <div key={phase} className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 ${isFinal ? 'border-brasil-yellow shadow-md ring-1 ring-brasil-yellow/20' : ''}`}>
                  <div className={`px-4 py-3 font-bold flex justify-between items-center ${isFinal ? 'bg-gradient-to-r from-brasil-yellow to-yellow-500 text-brasil-blue' : 'bg-gray-800 dark:bg-gray-700 text-white'}`}>
                    <span className="flex items-center gap-2 text-lg">
                      {isFinal && <Medal size={20} />}
                      {phase}
                    </span>
                    <span className="text-xs font-normal opacity-80 bg-white/20 px-2 py-0.5 rounded">
                      {phaseMatches.length} jogos
                    </span>
                  </div>
                  <div className="bg-gray-50/30 dark:bg-gray-900/30">
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