import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { Match, MatchStatus, Phase } from '../types';
import { GROUPS_CONFIG, getMatchRound } from '../services/dataService';
import { Edit2, Save, X, Check, Filter, ChevronDown, ArrowLeft, Database, Trophy, Calendar, Clock, Loader2 } from 'lucide-react';

export const AdminMatchesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, matches, updateMatch } = useStore();
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [filterPhase, setFilterPhase] = useState<string>('all');
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [filterRound, setFilterRound] = useState<string>('all');
  
  // Loading State for Saving
  const [isSaving, setIsSaving] = useState(false);
  
  // Toast State
  const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // If not admin, redirect
  if (!currentUser?.isAdmin) {
    return <Navigate to="/" />;
  }

  const showToast = (title: string, message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ title, message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleEditClick = (match: Match) => {
    setEditingMatch({ ...match });
  };

  const handleSave = async () => {
    if (!editingMatch) return;

    setIsSaving(true);
    try {
      const success = await updateMatch(editingMatch);
      
      if (success) {
          showToast('Alterações Salvas', `O jogo ${editingMatch.homeTeamId} x ${editingMatch.awayTeamId} foi atualizado.`, 'success');
          setEditingMatch(null);
      } else {
          showToast('Erro', 'Não foi possível salvar as alterações. Verifique o console para mais detalhes.', 'error');
      }
    } catch (error) {
      console.error("Erro crítico ao salvar:", error);
      showToast('Erro Crítico', 'Ocorreu um erro inesperado ao tentar salvar.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Match, value: any) => {
    if (editingMatch) {
      setEditingMatch({ ...editingMatch, [field]: value });
    }
  };

  const clearFilters = () => {
    setFilterPhase('all');
    setFilterGroup('all');
    setFilterRound('all');
  };

  const hasFilters = filterPhase !== 'all' || filterGroup !== 'all' || filterRound !== 'all';

  // Helper to format ISO date (UTC) to Brasília (UTC-3) for input type="datetime-local"
  // Converts "2026-06-11T19:00:00Z" -> "2026-06-11T16:00"
  const formatForBrasiliaInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      // Create a date object that represents the time in Brasilia, 
      // but stored in the object as if it were UTC, so toISOString gives us the correct digits
      const utcTime = date.getTime();
      const brasiliaTime = new Date(utcTime - (3 * 60 * 60 * 1000));
      return brasiliaTime.toISOString().substring(0, 16);
    } catch (e) {
      return '';
    }
  };

  // Helper to convert Brasília input (string) back to valid UTC ISO String for Supabase
  // Input "2026-06-11T16:00" -> Output "2026-06-11T19:00:00.000Z"
  const handleDateChange = (inputValue: string) => {
      if (!inputValue) return;
      try {
        // Append explicit timezone offset for Brasilia (-03:00) to ensure correct parsing
        const dateStringWithOffset = `${inputValue}:00-03:00`;
        const dateObj = new Date(dateStringWithOffset);

        if (!isNaN(dateObj.getTime())) {
            // Convert to strict UTC ISO string
            handleInputChange('date', dateObj.toISOString());
        }
      } catch (e) {
        console.error("Invalid date input", e);
      }
  };

  // --- FILTER LOGIC ---
  const filteredMatches = matches.filter(m => {
    if (filterPhase !== 'all' && m.phase !== filterPhase) return false;
    if (filterGroup !== 'all') {
       if (!m.group || m.group !== filterGroup) return false;
    }
    if (filterRound !== 'all') {
        if (m.phase !== Phase.GROUP) return false;
        const round = getMatchRound(m, matches);
        if (round?.toString() !== filterRound) return false;
    }
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const groupsList = Object.keys(GROUPS_CONFIG);

  return (
    <div className="space-y-6 relative pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-24 right-4 md:right-8 z-[100] max-w-sm w-full bg-white dark:bg-gray-800 border-l-4 shadow-xl rounded-r-lg p-4 animate-[slideIn_0.3s_ease-out] flex items-start gap-3 transform transition-all ${
            toast.type === 'error' ? 'border-red-500' : 'border-brasil-green'
        }`}>
          <div className="mt-0.5">
            <div className={`p-1.5 rounded-full ${toast.type === 'error' ? 'bg-red-100 dark:bg-red-900 text-red-600' : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'}`}>
              {toast.type === 'error' ? <X size={16} /> : <Check size={16} />}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">{toast.title}</h3>
            <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
         <button 
           onClick={() => navigate('/admin')}
           className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group mb-4"
         >
           <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
             <ArrowLeft size={18} />
           </div>
           Voltar ao Painel
         </button>

         <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <span className="bg-brasil-blue text-white p-2 rounded-lg"><Database size={24} /></span>
            Gerenciamento de Jogos
         </h1>
      </div>

      {/* MATCH MANAGEMENT */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-2">Lista de Partidas</h2>
            
            {/* Filters Container Clean */}
            <div className="flex flex-col gap-3 mt-4">
               <div className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300">
                 <Filter size={16} /> 
                 Filtros
                 {hasFilters && (
                    <button 
                        onClick={clearFilters}
                        className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 ml-2"
                    >
                        <X size={12} /> Limpar
                    </button>
                 )}
               </div>

               {/* Phase and Group Selects (Dropdowns) */}
                <div className="flex flex-wrap gap-3 items-center">
                    <div className="relative w-full md:w-auto">
                        <select 
                            value={filterPhase}
                            onChange={(e) => { 
                                setFilterPhase(e.target.value); 
                                if(e.target.value !== Phase.GROUP) {
                                    setFilterGroup('all'); 
                                    setFilterRound('all');
                                }
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

                    {(filterPhase === 'all' || filterPhase === Phase.GROUP) && (
                        <>
                            <div className="relative w-1/2 md:w-auto min-w-[120px] flex-1">
                                <select 
                                    value={filterGroup}
                                    onChange={(e) => setFilterGroup(e.target.value)}
                                    className="w-full appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
                                >
                                    <option value="all">Todos Grupos</option>
                                    {groupsList.map(g => (
                                        <option key={g} value={g}>Grupo {g}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                            </div>
                            <div className="relative w-1/2 md:w-auto min-w-[120px] flex-1">
                                <select 
                                    value={filterRound} 
                                    onChange={(e) => setFilterRound(e.target.value)} 
                                    className="w-full appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
                                >
                                    <option value="all">Todas Rodadas</option>
                                    <option value="1">1ª Rodada</option>
                                    <option value="2">2ª Rodada</option>
                                    <option value="3">3ª Rodada</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>

        {/* COMPACT TABLE - No Horizontal Scroll */}
        <div className="relative w-full">
            <table className="w-full text-sm text-left table-fixed md:table-auto">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase font-bold text-xs border-b border-gray-200 dark:border-gray-600">
                    <tr>
                        <th className="px-2 py-2 md:px-4 md:py-3 w-[15%] md:w-40">Data</th>
                        <th className="hidden md:table-cell px-4 py-3 w-32">Fase</th>
                        <th className="px-1 py-2 md:px-4 md:py-3 text-right w-[25%] md:w-40">Mandante</th>
                        <th className="px-1 py-2 md:px-4 md:py-3 text-center w-[15%] md:w-24">Placar</th>
                        <th className="px-1 py-2 md:px-4 md:py-3 text-left w-[25%] md:w-40">Visitante</th>
                        <th className="hidden md:table-cell px-4 py-3 text-center w-28">Status</th>
                        <th className="px-1 py-2 md:px-4 md:py-3 text-center w-[10%] md:w-auto">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {sortedMatches.map(match => {
                        const mRound = getMatchRound(match, matches);
                        const matchDate = new Date(match.date);
                        const isDateValid = !isNaN(matchDate.getTime());

                        return (
                        <tr key={match.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 even:bg-gray-50/30 dark:even:bg-gray-700/30">
                        <td className="px-2 py-2 md:px-4 md:py-3 text-gray-600 dark:text-gray-300 leading-tight">
                            <span className="block text-[10px] md:text-sm font-bold md:font-normal">
                                {isDateValid ? matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : 'Data Inválida'}
                            </span>
                            <span className="block text-[10px] md:text-xs text-gray-400">
                                {isDateValid ? matchDate.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit', timeZone: 'America/Sao_Paulo'}) : '--:--'}
                            </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                            <span className="block truncate max-w-[120px]" title={match.phase}>{match.phase}</span>
                            <div className="flex gap-1">
                                {match.group && <span className="font-bold text-gray-400 dark:text-gray-500">Grp {match.group}</span>}
                                {mRound && <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 rounded border border-blue-100 dark:border-blue-800">{mRound}ª R</span>}
                            </div>
                        </td>
                        <td className="px-1 py-2 md:px-4 md:py-3 text-right font-medium text-xs md:text-sm text-gray-800 dark:text-gray-200">
                            <span className="block truncate md:max-w-none ml-auto" title={match.homeTeamId}>
                                {match.homeTeamId}
                            </span>
                        </td>
                        <td className="px-1 py-2 md:px-4 md:py-3 text-center font-bold">
                            <div className="flex flex-col items-center">
                                <span className={`bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-sm text-gray-800 dark:text-gray-100 border whitespace-nowrap ${
                                    match.status === MatchStatus.IN_PROGRESS ? 'border-green-300 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' : 'border-gray-200 dark:border-gray-600'
                                }`}>
                                    {match.homeScore ?? '-'} x {match.awayScore ?? '-'}
                                </span>
                                {/* Mobile Status Indicator */}
                                <div className="md:hidden mt-1">
                                    {match.status === MatchStatus.IN_PROGRESS && <span className="w-1.5 h-1.5 rounded-full bg-green-500 block animate-pulse"></span>}
                                    {match.status === MatchStatus.FINISHED && <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block"></span>}
                                </div>
                            </div>
                        </td>
                        <td className="px-1 py-2 md:px-4 md:py-3 text-left font-medium text-xs md:text-sm text-gray-800 dark:text-gray-200">
                            <span className="block truncate md:max-w-none mr-auto" title={match.awayTeamId}>
                                {match.awayTeamId}
                            </span>
                        </td>
                        <td className="hidden md:table-cell px-4 py-3 text-center">
                            <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${
                                match.status === MatchStatus.FINISHED ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600' :
                                match.status === MatchStatus.IN_PROGRESS ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 animate-pulse' :
                                'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                            }`}>
                                {match.status === MatchStatus.FINISHED ? 'Fim' : 
                                match.status === MatchStatus.IN_PROGRESS ? 'Ao Vivo' : 'Agendado'}
                            </span>
                        </td>
                        <td className="px-1 py-2 md:px-4 md:py-3 text-center">
                            <button 
                                onClick={() => handleEditClick(match)} 
                                className="p-1.5 md:p-2 bg-brasil-blue text-white rounded shadow-sm hover:bg-blue-900 transition-colors" 
                                title="Editar"
                            >
                                <Edit2 size={14} className="md:w-4 md:h-4" />
                            </button>
                        </td>
                        </tr>
                    );
                    })}
                </tbody>
            </table>
            
            {sortedMatches.length === 0 && (
                <div className="text-center py-8 text-gray-400 italic bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                    Nenhum jogo encontrado.
                </div>
            )}
        </div>
      </div>

      {/* Edit Modal - Optimized for Mobile */}
      {editingMatch && (
         <div className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-[9999] p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] md:max-h-auto animate-in slide-in-from-bottom-10 duration-300">
               <div className="bg-brasil-blue text-white p-4 flex justify-between items-center shrink-0">
                  <h2 className="font-bold text-lg flex items-center gap-2">
                    <Edit2 size={18} />
                    Editar Partida
                  </h2>
                  <button onClick={() => !isSaving && setEditingMatch(null)} disabled={isSaving} className="hover:bg-white/20 p-2 rounded-full transition-colors disabled:opacity-50"><X size={20}/></button>
               </div>
               
               <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  
                  {/* Status & Date Row */}
                  <div className="grid grid-cols-1 gap-6">
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                          <Trophy size={14} /> Status do Jogo
                        </label>
                        <select 
                          value={editingMatch.status} 
                          onChange={e => handleInputChange('status', e.target.value)}
                          className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all text-white"
                        >
                           <option value={MatchStatus.SCHEDULED}>Agendado</option>
                           <option value={MatchStatus.IN_PROGRESS}>Em Andamento (Ao Vivo)</option>
                           <option value={MatchStatus.FINISHED}>Finalizado</option>
                        </select>
                     </div>
                     
                     <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                          <Calendar size={14} /> Data e Hora (Brasília)
                        </label>
                        <div className="relative">
                           <input 
                              type="datetime-local" 
                              value={formatForBrasiliaInput(editingMatch.date)} 
                              onChange={e => handleDateChange(e.target.value)}
                              className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all cursor-pointer text-white"
                           />
                           <Clock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                        </div>
                     </div>
                  </div>

                  {/* Teams Selection */}
                  <div className="grid grid-cols-2 gap-4 items-end bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Mandante</label>
                        <input 
                           type="text" 
                           value={editingMatch.homeTeamId} 
                           onChange={e => handleInputChange('homeTeamId', e.target.value)}
                           className="w-full border border-gray-600 bg-gray-700 rounded-lg p-2 font-bold text-right focus:ring-2 focus:ring-brasil-blue outline-none transition-all text-sm text-white"
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Visitante</label>
                        <input 
                           type="text" 
                           value={editingMatch.awayTeamId} 
                           onChange={e => handleInputChange('awayTeamId', e.target.value)}
                           className="w-full border border-gray-600 bg-gray-700 rounded-lg p-2 font-bold focus:ring-2 focus:ring-brasil-blue outline-none transition-all text-sm text-white"
                        />
                     </div>
                  </div>

                  {/* Scoreboard */}
                  <div className="flex flex-col items-center">
                     <p className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider text-center">
                        {editingMatch.status === MatchStatus.IN_PROGRESS ? 'Placar em Tempo Real' : 
                         editingMatch.status === MatchStatus.FINISHED ? 'Placar Final' : 'Definição de Placar'}
                     </p>
                     
                     {/* Aviso de bloqueio */}
                     {editingMatch.status === MatchStatus.SCHEDULED && (
                        <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs p-2 rounded border border-yellow-200 dark:border-yellow-800 text-center animate-pulse">
                           Mude o status para <strong>Em Andamento</strong> ou <strong>Finalizado</strong> para editar o placar.
                        </div>
                     )}

                     <div className="flex items-center justify-center gap-4 md:gap-6">
                        <input 
                           type="number" 
                           value={editingMatch.homeScore ?? ''} 
                           onChange={e => handleInputChange('homeScore', e.target.value === '' ? null : parseInt(e.target.value))}
                           placeholder="0"
                           disabled={editingMatch.status === MatchStatus.SCHEDULED}
                           className={`w-16 h-16 md:w-20 md:h-20 text-center text-3xl font-bold border-2 rounded-xl outline-none transition-all ${
                               editingMatch.status === MatchStatus.SCHEDULED 
                               ? 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-400 cursor-not-allowed' 
                               : 'bg-gray-700 border-gray-600 focus:border-brasil-blue focus:ring-4 focus:ring-blue-50 text-white'
                           }`}
                        />
                        <span className="text-gray-300 font-light text-2xl md:text-4xl">X</span>
                        <input 
                           type="number" 
                           value={editingMatch.awayScore ?? ''} 
                           onChange={e => handleInputChange('awayScore', e.target.value === '' ? null : parseInt(e.target.value))}
                           placeholder="0"
                           disabled={editingMatch.status === MatchStatus.SCHEDULED}
                           className={`w-16 h-16 md:w-20 md:h-20 text-center text-3xl font-bold border-2 rounded-xl outline-none transition-all ${
                               editingMatch.status === MatchStatus.SCHEDULED 
                               ? 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500 text-gray-400 cursor-not-allowed' 
                               : 'bg-gray-700 border-gray-600 focus:border-brasil-blue focus:ring-4 focus:ring-blue-50 text-white'
                           }`}
                        />
                     </div>
                  </div>
               </div>

               <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex gap-3 shrink-0 pb-8 md:pb-4">
                  <button 
                     onClick={() => setEditingMatch(null)} 
                     disabled={isSaving}
                     className="flex-1 px-5 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-bold transition-colors border border-gray-200 dark:border-gray-600 disabled:opacity-50"
                  >
                     Cancelar
                  </button>
                  <button 
                     onClick={handleSave} 
                     disabled={isSaving}
                     className="flex-1 px-5 py-3 bg-brasil-green text-white font-bold rounded-xl hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-200 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                     {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                     {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};