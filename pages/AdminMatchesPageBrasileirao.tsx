import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { api } from '../services/api';
import { Match, BrasileiraoMatch, MatchStatus, Phase, BRAZIL_MATCH_IDS } from '../types';
import { GROUPS_CONFIG, getMatchRound } from '../services/dataService';
import { Edit2, Save, X, Filter, ChevronDown, ArrowLeft, Database, Trophy, Calendar, Clock, Loader2, Goal, Medal, Trash2, Bell } from 'lucide-react';

export const AdminMatchesPageBrasileirao: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, brasileiraoMatches: matches, brasileiraoTeams: teams, updateBrasileiraoMatch, addNotification, fetchBrasileiraoMatchesByComp } = useStore();
  const [editingMatch, setEditingMatch] = useState<BrasileiraoMatch | null>(null);

  React.useEffect(() => {
    fetchBrasileiraoMatchesByComp(['brasileirao', 'copa_do_brasil', 'libertadores', 'sulamericana'], true).catch(() => {});
  }, [fetchBrasileiraoMatchesByComp]);

  const getTeamNameForDisplay = (id: string | number) => {
    if (!id) return String(id);
    const team = teams?.find(t => String(t.id) === String(id));
    if (!team) return String(id);
    const name = team.name;
    const map: Record<string, string> = {
        'Atletico Paranaense': 'Athletico-PR',
        'Vasco DA Gama': 'Vasco',
        'Vasco da Gama': 'Vasco',
        'Sao Paulo': 'São Paulo',
        'Atletico-MG': 'Atlético-MG',
        'Atletico Mineiro': 'Atlético-MG',
        'Gremio': 'Grêmio',
        'Goianiense': 'Atlético-GO',
        'Atletico Goianiense': 'Atlético-GO',
        'Criciuma': 'Criciúma',
        'Vitoria': 'Vitória',
        'Bragantino': 'RB Bragantino',
        'Red Bull Bragantino': 'RB Bragantino',
        'Cuiaba': 'Cuiabá',
        'Avai': 'Avaí',
        'Goias': 'Goiás',
        'Ceara': 'Ceará',
        'Botafogo FR': 'Botafogo',
        'Chapecoense-sc': 'Chapecoense',
        'Chapecoense-SC': 'Chapecoense',
        'Fortaleza EC': 'Fortaleza',
        'Fortaleza Esporte Clube': 'Fortaleza'
    };
    return map[name] || name;
  };
  const [showGoals, setShowGoals] = useState(false);
  const [adminCompetition, setAdminCompetition] = useState<string>('all');
  const [adminSubPeriod, setAdminSubPeriod] = useState<string>('all');
  const [sendPushOnSave, setSendPushOnSave] = useState(false);
  const [activeTab, setActiveTab] = useState<'matches' | 'topFinishers' | 'brazilPlayers'>('matches');

  // Top 4 Finishers State
  
  
  
  
  

  // Brazil Players Management State
  
  
  
  
  
  

  
  // Loading State for Saving
  const [isSaving, setIsSaving] = useState(false);
  const [sendingReminder, setSendingReminder] = useState<Record<string, 'reminder' | 'start' | 'end' | null>>({});

  // Ref to keep editingMatch stable for async operations (prevents stale closures)
  const editingMatchRef = useRef<BrasileiraoMatch | null>(null);
  editingMatchRef.current = editingMatch;

  // If not admin and not match admin, show authorization block
  if (!currentUser?.isAdmin && !currentUser?.isMatchAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl max-w-md w-full border border-red-100 dark:border-red-800">
          <div className="bg-red-100 dark:bg-red-900/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} className="text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Não Autorizado</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Você não tem permissão para acessar esta página. Apenas administradores podem gerenciar jogos.</p>
          <button onClick={() => navigate('/admin-brasileirao')} className="bg-brasil-blue hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  const handleEditClick = (match: BrasileiraoMatch) => {
    setEditingMatch({ ...match });
    setShowGoals(false);
  };

  const handleSave = async () => {
    const matchToSave = editingMatchRef.current;
    if (!matchToSave) return;

    setIsSaving(true);
    try {
      const success = await updateBrasileiraoMatch(matchToSave as unknown as BrasileiraoMatch);

      if (success) {
        if (sendPushOnSave) {
          if (matchToSave.status === MatchStatus.IN_PROGRESS) {
            await handleMatchStartPush(matchToSave);
          } else if (matchToSave.status === MatchStatus.FINISHED) {
            await handleMatchEndPush(matchToSave);
          }
        }
        setEditingMatch(null);
        setSendPushOnSave(false);
        if (addNotification) addNotification('Alterações Salvas', `O jogo ${getTeamNameForDisplay(matchToSave.home_team_id)} x ${getTeamNameForDisplay(matchToSave.away_team_id)} foi atualizado. Ranking atualizado.`, 'success');
      } else {
        if (addNotification) addNotification('Erro', 'Não foi possível salvar as alterações. Verifique o console para mais detalhes.', 'warning');
      }
    } catch (error) {
      console.error("Erro crítico ao salvar:", error);
      if (addNotification) addNotification('Erro Crítico', 'Ocorreu um erro inesperado ao tentar salvar.', 'warning');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMatchReminder = async (match: BrasileiraoMatch) => {
    if (!window.confirm(`🚨 Deseja enviar o Lembrete Global de Palpite para ${getTeamNameForDisplay(match.home_team_id)} x ${getTeamNameForDisplay(match.away_team_id)}?\n\nIsso enviará um push em massa.`)) {
      return;
    }

    setSendingReminder(prev => ({ ...prev, [String(match.id)]: 'reminder' }));
    try {
      const result = await api.admin.sendMassPush({ 
        title: `Lembrete de Palpite! ⏰`, 
        message: `Falta pouco para o inicio do jogo entre ${getTeamNameForDisplay(match.home_team_id)} x ${getTeamNameForDisplay(match.away_team_id)}! Revise ou faça seu palpite!`,
        urlData: { url: '/leagues-brasileirao' },
        targetTopic: 'topic_prediction_reminder',
        championship: match.championship || 'brasileirao'
      });
      if (result.success) {
        addNotification('Sucesso', `Lembrete de ${getTeamNameForDisplay(match.home_team_id)} x ${getTeamNameForDisplay(match.away_team_id)} enviado globalmente.`, 'success');
      } else {
        addNotification('Aviso', 'Erro parcial no envio.', 'warning');
      }
    } catch (e: any) {
      addNotification('Erro', e.message || 'Erro ao enviar lembrete.', 'warning');
    } finally {
      setSendingReminder(prev => ({ ...prev, [String(match.id)]: null }));
    }
  };

  const handleMatchStartPush = async (match: BrasileiraoMatch) => {
    if (!window.confirm(`🚨 Enviar Push Global de INÍCIO para ${getTeamNameForDisplay(match.home_team_id)} x ${getTeamNameForDisplay(match.away_team_id)}?`)) return;
    setSendingReminder(prev => ({ ...prev, [String(match.id)]: 'start' }));
    try {
      const result = await api.admin.sendMassPush({ 
        title: `⚽ Bola rolando!`, 
        message: `${getTeamNameForDisplay(match.home_team_id)} x ${getTeamNameForDisplay(match.away_team_id)}. Acompanhe e torça pelo seu palpite!`,
        urlData: { url: '/leagues-brasileirao' },
        targetTopic: 'topic_match_start',
        championship: match.championship || 'brasileirao'
      });
      if (result.success) addNotification('Sucesso', 'Push de Início enviado.', 'success');
    } catch (e: any) {
      addNotification('Erro', e.message || 'Erro no envio.', 'warning');
    } finally {
      setSendingReminder(prev => ({ ...prev, [String(match.id)]: null }));
    }
  };

  const handleMatchEndPush = async (match: BrasileiraoMatch) => {
    if (!window.confirm(`🚨 Enviar Push Global de FIM para ${getTeamNameForDisplay(match.home_team_id)} x ${getTeamNameForDisplay(match.away_team_id)}?`)) return;
    setSendingReminder(prev => ({ ...prev, [String(match.id)]: 'end' }));
    try {
      const result = await api.admin.sendMassPush({ 
        title: `🏁 Fim de Jogo!`, 
        message: `${getTeamNameForDisplay(match.home_team_id)} (${match.home_score ?? ''}) x (${match.away_score ?? ''}) ${getTeamNameForDisplay(match.away_team_id)}. Acesse a liga para conferir os pontos!`,
        urlData: { url: '/leagues-brasileirao' },
        targetTopic: 'topic_match_end',
        championship: match.championship || 'brasileirao'
      });
      if (result.success) addNotification('Sucesso', 'Push de Fim enviado.', 'success');
    } catch (e: any) {
      addNotification('Erro', e.message || 'Erro no envio.', 'warning');
    } finally {
      setSendingReminder(prev => ({ ...prev, [String(match.id)]: null }));
    }
  };

  const handleInputChange = (field: keyof BrasileiraoMatch, value: any) => {
    if (editingMatch) {
      setEditingMatch({ ...editingMatch, [field]: value });
    }
  };

  const clearFilters = () => {
    setAdminCompetition('all');
    setAdminSubPeriod('all');
  };


  const hasFilters = adminCompetition !== 'all' || adminSubPeriod !== 'all';

  const formatForBrasiliaInput = (isoString: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '';
      const utcTime = date.getTime();
      const brasiliaTime = new Date(utcTime - (3 * 60 * 60 * 1000));
      return brasiliaTime.toISOString().substring(0, 16);
    } catch (e) {
      return '';
    }
  };

  const handleDateChange = (inputValue: string) => {
    if (!inputValue) return;
    try {
      const dateStringWithOffset = `${inputValue}:00-03:00`;
      const dateObj = new Date(dateStringWithOffset);

      if (!isNaN(dateObj.getTime())) {
        handleInputChange('date', dateObj.toISOString());
      }
    } catch (e) {
      console.error("Invalid date input", e);
    }
  };

  
  
  const getMatchRoundBR = (match: BrasileiraoMatch) => {
    if (!match.phase) return null;
    if (match.phase.startsWith('Rodada ')) {
        const num = parseInt(match.phase.replace('Rodada ', ''), 10);
        if (!isNaN(num)) return num;
    }
    return null;
  };

  const translatePhase = (phase: string) => {
    if (!phase) return '';
    const p = phase.toLowerCase();
    if (p.includes('round of 32')) return '16-Avos';
    if (p.includes('round of 16')) return 'Oitavas';
    if (p.includes('quarter-finals') || p.includes('quarter')) return 'Quartas';
    if (p.includes('semi-finals') || p.includes('semi')) return 'Semifinal';
    if (p.includes('final')) return 'Final';
    return phase;
  };

  const filteredMatches = matches.filter(m => {
    const champStr = String(m.championship);
    const isCopa = champStr === 'copa_do_brasil';
    const isBrasileirao = champStr === 'brasileirao' || champStr === 'undefined';
    const isLibertadores = champStr === 'libertadores';
    const isSulAmericana = champStr === 'sulamericana' || champStr === 'sul_americana';

    // Remove Group Stage, Qualification, Play-offs and Round of 32 (16-avos)
    if (m.phase) {
      const p = m.phase.toLowerCase();
      if ((isLibertadores || isSulAmericana) && (p.includes('group stage') || p.includes('qualification') || p.includes('play-offs'))) {
        return false;
      }
      if ((isSulAmericana || isCopa) && p.includes('round of 32')) {
        return false;
      }
    }

    if (adminCompetition === 'brasileirao' && !isBrasileirao) return false;
    if (adminCompetition === 'copa' && !isCopa) return false;
    if (adminCompetition === 'libertadores' && !isLibertadores) return false;
    if (adminCompetition === 'sulamericana' && !isSulAmericana) return false;

    if (adminSubPeriod !== 'all') {
      if (isCopa || isLibertadores || isSulAmericana) {
        const p = translatePhase(m.phase).toLowerCase();
        if (adminSubPeriod === 'copa_oitavas' && !p.includes('oitavas')) return false;
        if (adminSubPeriod === 'copa_quartas' && !p.includes('quartas')) return false;
        if (adminSubPeriod === 'copa_fase_final' && !p.includes('semi') && !p.includes('final')) return false;
      } else if (isBrasileirao) {
        const round = getMatchRoundBR(m);
        if (round?.toString() !== adminSubPeriod) return false;
      }
    }
    return true;
  });

  const sortedMatches = [...filteredMatches].sort((a, b) => {
    const getStatusWeight = (status: MatchStatus) => {
      if (status === MatchStatus.IN_PROGRESS) return 1;
      if (status === MatchStatus.SCHEDULED) return 2;
      return 3; // FINISHED
    };
    
    const weightA = getStatusWeight(a.status);
    const weightB = getStatusWeight(b.status);
    
    // Order by Status: In Progress (1) -> Scheduled (2) -> Finished (3)
    if (weightA !== weightB) {
      return weightA - weightB;
    }
    
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    
    // For finished matches, we want the oldest at the very bottom (descending order)
    if (a.status === MatchStatus.FINISHED) {
      return dateB - dateA; // Newest first, oldest last
    }
    
    // For scheduled/in-progress, we want the soonest matches first (ascending order)
    return dateA - dateB;
  });


  const groupsList = Object.keys(GROUPS_CONFIG);

  return (
    <div className="space-y-6 relative pb-20">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin-brasileirao')}
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


        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white mb-2">Lista de Partidas</h2>
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
              <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
              <div className="flex items-center gap-2 w-full md:w-auto">
                <Filter size={16} className="text-gray-400 hidden md:block" />
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                  <div className="relative min-w-[140px] flex-1 md:flex-none">
                    <select
                      value={adminCompetition}
                      onChange={(e) => { setAdminCompetition(e.target.value); setAdminSubPeriod('all'); }}
                      className="w-full appearance-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
                    >
                      <option value="all">Todas as Competições</option>
                      <option value="brasileirao">Brasileirão</option>
                      <option value="copa">Copa do Brasil</option>
                      <option value="libertadores">Libertadores</option>
                      <option value="sulamericana">Sul-Americana</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                  </div>
                  
                  {adminCompetition === 'brasileirao' && (
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                      <select
                        value={adminSubPeriod}
                        onChange={(e) => setAdminSubPeriod(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
                      >
                        <option value="all">Todas Rodadas</option>
                        {Array.from({ length: 38 }, (_, i) => i + 1).map(r => (
                          <option key={r} value={r.toString()}>{r}ª Rodada</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                    </div>
                  )}

                  {(adminCompetition === 'copa' || adminCompetition === 'libertadores' || adminCompetition === 'sulamericana') && (
                    <div className="relative min-w-[140px] flex-1 md:flex-none">
                      <select
                        value={adminSubPeriod}
                        onChange={(e) => setAdminSubPeriod(e.target.value)}
                        className="w-full appearance-none bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-300 dark:border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8"
                      >
                        <option value="all">Todas Fases</option>
                        <option value="copa_oitavas">Oitavas de Final</option>
                        <option value="copa_quartas">Quartas de Final</option>
                        <option value="copa_fase_final">Semi / Final</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>
          <div className="relative w-full">
            <table className="w-full text-sm text-left table-fixed md:table-auto">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase font-bold text-xs border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-1 py-2 md:px-4 md:py-3 w-[12%] md:w-40">Data</th>
                  <th className="hidden md:table-cell px-4 py-3 w-32">Fase</th>
                  <th className="px-1 py-2 md:px-4 md:py-3 text-right w-[22%] md:w-40">Mandante</th>
                  <th className="px-1 py-2 md:px-4 md:py-3 text-center w-[16%] md:w-24">Placar</th>
                  <th className="px-1 py-2 md:px-4 md:py-3 text-left w-[22%] md:w-40">Visitante</th>
                  <th className="hidden md:table-cell px-4 py-3 text-center w-28">Status</th>
                  <th className="px-1 py-2 md:px-4 md:py-3 text-center w-[28%] md:w-auto">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedMatches.map(match => {
                  
                  const matchDate = new Date(match.date);
                  const isDateValid = !isNaN(matchDate.getTime());
                  
                  let rowColor = 'even:bg-gray-50 dark:even:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50';
                  const c = String(match.championship);
                  if (match.is_blocked) rowColor = 'bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60';
                  else if (c === 'brasileirao' || c === 'undefined') rowColor = 'bg-green-50/85 dark:bg-green-900/20 hover:bg-green-100/70 dark:hover:bg-green-900/40';
                  else if (c === 'copa_do_brasil') rowColor = 'bg-yellow-50/85 dark:bg-yellow-900/20 hover:bg-yellow-100/70 dark:hover:bg-yellow-900/40';
                  else if (c === 'libertadores') rowColor = 'bg-blue-50/85 dark:bg-blue-900/20 hover:bg-blue-100/70 dark:hover:bg-blue-900/40';
                  else if (c === 'sulamericana') rowColor = 'bg-pink-50/85 dark:bg-pink-900/20 hover:bg-pink-100/70 dark:hover:bg-pink-900/40';

                  return (
                    <tr key={match.id} className={`transition-colors ${rowColor}`}>
                      <td className="px-2 py-2 md:px-4 md:py-3 text-gray-600 dark:text-gray-300 leading-tight">
                        <span className="block text-[10px] md:text-sm font-bold md:font-normal">
                          {isDateValid ? matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : 'Data Inválida'}
                        </span>
                        <span className="block text-[10px] md:text-xs text-gray-400">
                          {isDateValid ? matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '--:--'}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        <span className="block truncate max-w-[120px]" title={translatePhase(match.phase)}>{translatePhase(match.phase)}</span>
                        {(match as any).group && (
                          <div className="flex gap-1 mt-1">
                            <span className="font-bold text-gray-400 dark:text-gray-500">Grp {(match as any).group}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-1 py-2 md:px-4 md:py-3 text-right font-medium text-xs md:text-sm text-gray-800 dark:text-gray-200">
                        <span className="block truncate md:max-w-none ml-auto" title={String(match.home_team_id)}>
                          {getTeamNameForDisplay(match.home_team_id)}
                        </span>
                      </td>
                      <td className="px-1 py-2 md:px-4 md:py-3 text-center font-bold">
                        <div className="flex flex-col items-center">
                          <span className={`bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-sm text-gray-800 dark:text-gray-100 border whitespace-nowrap ${match.status === MatchStatus.IN_PROGRESS ? 'border-green-300 bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300' : 'border-gray-200 dark:border-gray-600'
                            }`}>
                            {match.home_score ?? '-'} x {match.away_score ?? '-'}
                          </span>
                          <div className="md:hidden mt-1">
                            {match.status === MatchStatus.IN_PROGRESS && <span className="w-1.5 h-1.5 rounded-full bg-green-500 block animate-pulse"></span>}
                            {match.status === MatchStatus.FINISHED && <span className="w-1.5 h-1.5 rounded-full bg-gray-400 block"></span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-1 py-2 md:px-4 md:py-3 text-left font-medium text-xs md:text-sm text-gray-800 dark:text-gray-200">
                        <span className="block truncate md:max-w-none mr-auto" title={String(match.away_team_id)}>
                          {getTeamNameForDisplay(match.away_team_id)}
                        </span>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-bold border ${match.status === MatchStatus.FINISHED ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600' :
                          match.status === MatchStatus.IN_PROGRESS ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800 animate-pulse' :
                            'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                          }`}>
                          {match.status === MatchStatus.FINISHED ? 'Fim' :
                            match.status === MatchStatus.IN_PROGRESS ? 'Ao Vivo' : 'Agendado'}
                        </span>
                        {match.is_blocked && (
                          <div className="mt-1">
                            <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold bg-red-100 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                              🔒 Bloqueado
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-0 py-2 md:px-4 md:py-3 text-center">
                        <div className="flex flex-nowrap items-center justify-center gap-1 md:gap-3 overflow-visible">
                          <div className="flex gap-1 border-r border-gray-200 dark:border-gray-700 pr-1 md:pr-2 mr-1 md:mr-2">
                            <button
                              onClick={() => handleSendMatchReminder(match)}
                              disabled={!!sendingReminder[match.id] || match.status !== MatchStatus.SCHEDULED}
                              className={`p-1 md:p-2 rounded shadow-sm transition-colors ${
                                match.status !== MatchStatus.SCHEDULED 
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                  : 'bg-amber-500 text-white hover:bg-amber-600'
                              }`}
                              title="Lembrete Global"
                            >
                              {sendingReminder[match.id] === 'reminder' ? <Loader2 size={13} className="animate-spin md:w-4 md:h-4" /> : <Bell size={13} className="md:w-4 md:h-4" />}
                            </button>
                            <button
                              onClick={() => handleMatchStartPush(match)}
                              disabled={!!sendingReminder[match.id] || match.status !== MatchStatus.IN_PROGRESS}
                              className={`p-1 md:p-2 rounded shadow-sm transition-colors ${
                                match.status !== MatchStatus.IN_PROGRESS 
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                  : 'bg-green-500 text-white hover:bg-green-600'
                              }`}
                              title="Notificar Início"
                            >
                              {sendingReminder[match.id] === 'start' ? <Loader2 size={13} className="animate-spin md:w-4 md:h-4" /> : <Clock size={13} className="md:w-4 md:h-4" />}
                            </button>
                            <button
                              onClick={() => handleMatchEndPush(match)}
                              disabled={!!sendingReminder[match.id] || match.status !== MatchStatus.FINISHED}
                              className={`p-1 md:p-2 rounded shadow-sm transition-colors ${
                                match.status !== MatchStatus.FINISHED 
                                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                  : 'bg-gray-800 text-white hover:bg-black dark:bg-gray-300 dark:text-gray-900 dark:hover:bg-white'
                              }`}
                              title="Notificar Fim"
                            >
                              {sendingReminder[match.id] === 'end' ? <Loader2 size={13} className="animate-spin md:w-4 md:h-4" /> : <Trophy size={13} className="md:w-4 md:h-4" />}
                            </button>
                          </div>
                          <button
                            onClick={() => handleEditClick(match)}
                            className="p-1 md:p-2 bg-brasil-blue text-white rounded shadow-sm hover:bg-blue-900 transition-colors ml-0.5 md:ml-1"
                            title="Editar"
                          >
                            <Edit2 size={13} className="md:w-4 md:h-4" />
                          </button>
                        </div>
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

      {editingMatch && createPortal(
        <div
          className="fixed inset-0 bg-black/80 flex items-end md:items-center justify-center z-[9999] p-0 md:p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget && !isSaving) setEditingMatch(null); }}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] md:max-h-auto animate-in slide-in-from-bottom-5 duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-brasil-blue text-white p-4 flex justify-between items-center shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Edit2 size={18} />
                Editar Partida
              </h2>
              <button onClick={() => !isSaving && setEditingMatch(null)} disabled={isSaving} className="hover:bg-white/20 p-2 rounded-full transition-colors disabled:opacity-50"><X size={20} /></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1">
                    <Trophy size={14} /> Status do Jogo
                  </label>
                  <select
                    id="match-status-select"
                    value={editingMatch.status}
                    onChange={e => handleInputChange('status', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all text-gray-800 dark:text-white"
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
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-3 pl-10 text-sm focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all cursor-pointer text-gray-800 dark:text-white"
                    />
                    <Clock className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 items-end bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-100 dark:border-gray-600">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Mandante</label>
                  <select
                    value={editingMatch.home_team_id}
                    onChange={e => handleInputChange('home_team_id', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 font-bold focus:ring-2 focus:ring-brasil-blue outline-none transition-all text-sm text-gray-800 dark:text-white"
                  >
                    <option value={editingMatch.home_team_id}>{getTeamNameForDisplay(editingMatch.home_team_id)}</option>
                    {teams?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">Visitante</label>
                  <select
                    value={editingMatch.away_team_id}
                    onChange={e => handleInputChange('away_team_id', e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-2 font-bold focus:ring-2 focus:ring-brasil-blue outline-none transition-all text-sm text-gray-800 dark:text-white"
                  >
                    <option value={editingMatch.away_team_id}>{getTeamNameForDisplay(editingMatch.away_team_id)}</option>
                    {teams?.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <p className="text-xs font-bold text-gray-400 uppercase mb-4 tracking-wider text-center">
                  {editingMatch.status === MatchStatus.IN_PROGRESS ? 'Placar em Tempo Real' :
                    editingMatch.status === MatchStatus.FINISHED ? 'Placar Final' : 'Definição de Placar'}
                </p>
                {editingMatch.status === MatchStatus.SCHEDULED && (
                  <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-xs p-2 rounded border border-yellow-200 dark:border-yellow-800 text-center animate-pulse">
                    Mude o status para <strong>Em Andamento</strong> ou <strong>Finalizado</strong> para editar o placar.
                  </div>
                )}
                <div className="flex items-center justify-center gap-4 md:gap-6">
                  <input
                    id="score-home"
                    type="number"
                    min="0"
                    
                    value={editingMatch.home_score ?? ''}
                    
                    onChange={e => handleInputChange('home_score', e.target.value === '' ? null : parseInt(e.target.value))}
                    placeholder="0"
                    className="w-16 h-16 md:w-20 md:h-20 text-center text-3xl font-bold border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl outline-none focus:border-brasil-blue focus:ring-4 focus:ring-blue-50 text-gray-800 dark:text-white transition-all shadow-inner"
                  />
                  <span className="text-gray-300 font-light text-2xl md:text-4xl">X</span>
                  <input
                    id="score-away"
                    type="number"
                    min="0"
                    
                    value={editingMatch.away_score ?? ''}
                    
                    onChange={e => handleInputChange('away_score', e.target.value === '' ? null : parseInt(e.target.value))}
                    placeholder="0"
                    className="w-16 h-16 md:w-20 md:h-20 text-center text-3xl font-bold border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl outline-none focus:border-brasil-blue focus:ring-4 focus:ring-blue-50 text-gray-800 dark:text-white transition-all shadow-inner"
                  />
                </div>
              </div>
              
              <div className="mt-4 p-4 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMatch.is_blocked ?? false}
                    onChange={(e) => handleInputChange('is_blocked', e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-red-300"
                  />
                  <div>
                    <span className="text-sm font-bold text-red-700 dark:text-red-400">Bloquear Jogo</span>
                    <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">Cancela palpites e zera pontos deste jogo.</p>
                  </div>
                </label>
              </div>

            </div>

            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 flex flex-col gap-3">
              {(editingMatch.status === MatchStatus.IN_PROGRESS || editingMatch.status === MatchStatus.FINISHED) && (
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 p-2 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendPushOnSave}
                    onChange={(e) => setSendPushOnSave(e.target.checked)}
                    className="w-4 h-4 text-brasil-blue bg-gray-100 border-gray-300 rounded focus:ring-brasil-blue focus:ring-2"
                  />
                  Deseja disparar Notificação Push Automática de Início/Fim ao salvar?
                </label>
              )}
              
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full bg-brasil-green text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 shadow-md hover:bg-green-700"
              >
                {isSaving ? <><Loader2 size={18} className="animate-spin" /> Salvando...</> : <><Save size={18} /> Salvar Partida e Atualizar Ranking</>}
              </button>
            </div>
          </div>
        </div>
      , document.body)}

    </div>
  );
};