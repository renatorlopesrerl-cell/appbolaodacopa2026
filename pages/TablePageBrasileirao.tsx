import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { MatchStatus } from '../types';
import { Clock, Trophy, ArrowLeft, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { AdSenseBanner } from '../components/AdSenseBanner';

interface TeamStanding {
  id: number;
  name: string;
  logo: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
}

const getTeamName = (name: string) => {
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

const BR_LOGOS: Record<number, string> = {
    118: '/img/teams/brasileirao/118.png?v=3',
    119: '/img/teams/brasileirao/119.png?v=3',
    120: '/img/teams/brasileirao/120.png?v=3',
    121: '/img/teams/brasileirao/121.png?v=3',
    124: '/img/teams/brasileirao/124.png?v=3',
    126: '/img/teams/brasileirao/126.png?v=3',
    127: '/img/teams/brasileirao/127.png?v=3',
    128: '/img/teams/brasileirao/128.png?v=3',
    129: '/img/teams/brasileirao/129.png?v=3',
    130: '/img/teams/brasileirao/130.png?v=3',
    131: '/img/teams/brasileirao/131.png?v=3',
    132: '/img/teams/brasileirao/132.png?v=3',
    133: '/img/teams/brasileirao/133.png?v=3',
    134: '/img/teams/brasileirao/134.png?v=3',
    135: '/img/teams/brasileirao/135.png?v=3',
    136: '/img/teams/brasileirao/136.png?v=3',
    144: '/img/teams/brasileirao/144.png?v=3',
    146: '/img/teams/brasileirao/146.png?v=3',
    147: '/img/teams/brasileirao/147.png?v=3',
    149: '/img/teams/brasileirao/149.png?v=3',
    151: '/img/teams/brasileirao/151.png?v=3',
    152: '/img/teams/brasileirao/152.png?v=3',
    154: '/img/teams/brasileirao/154.png?v=3',
    794: '/img/teams/brasileirao/794.png?v=3',
    1062: '/img/teams/brasileirao/1062.png?v=3',
    1198: '/img/teams/brasileirao/1198.png?v=3',
    1223: '/img/teams/brasileirao/1223.png?v=3',
    7772: '/img/teams/brasileirao/7772.png?v=3',
    7831: '/img/teams/brasileirao/7831.png?v=3',
    7848: '/img/teams/brasileirao/7848.png?v=3',
    13975: '/img/teams/brasileirao/13975.png?v=3',
    18271: '/img/teams/brasileirao/18271.png?v=3',
};

const LOGO_FALLBACK = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJzOCAzIDggOGMwIDUtOCAxMC04IDEwUzQgMTUgNCAxMGMwLTUgOC04IDgtOHoiLz48L3N2Zz4=';

const getSafeLogo = (id: number | string | undefined, logoUrl: string | undefined) => {
  if (!id) return LOGO_FALLBACK;
  const numId = Number(id);
  if (BR_LOGOS[numId]) return BR_LOGOS[numId];
  if (logoUrl) {
    if (logoUrl.startsWith('http') || logoUrl.startsWith('/')) {
      return logoUrl;
    }
  }
  return LOGO_FALLBACK;
};

const translatePhase = (phase: string) => {
  if (!phase) return '';
  const p = phase.toLowerCase();
  if (p.includes('round of 32')) return '16-Avos de final';
  if (p.includes('round of 16')) return 'Oitavas de final';
  if (p.includes('quarter-finals') || p.includes('quarter')) return 'Quartas de final';
  if (p.includes('semi-finals') || p.includes('semi')) return 'Semifinal';
  if (p.includes('final')) return 'Final';
  return phase;
};

const getPhaseOrder = (phase: string) => {
  const p = phase.toLowerCase();
  if (p.includes('final') && !p.includes('quarter') && !p.includes('semi')) return 1;
  if (p.includes('semi')) return 2;
  if (p.includes('quarter')) return 3;
  if (p.includes('round of 16') || p.includes('oitavas')) return 4;
  if (p.includes('round of 32') || p.includes('16-avos')) return 5;
  if (p.includes('round of 64') || p.includes('32-avos')) return 6;
  return 99;
};

const MatchRow = ({ match, teams }: { match: any, teams: any[] }) => {
  const matchDate = new Date(match.date);
  const isDateValid = !isNaN(matchDate.getTime());
  const isLive = match.status === MatchStatus.IN_PROGRESS;
  const isFinished = match.status === MatchStatus.FINISHED;

  const homeTeam = teams.find(t => t.id === match.home_team_id);
  const awayTeam = teams.find(t => t.id === match.away_team_id);

  if (!homeTeam || !awayTeam) return null;

  return (
    <div className={`p-4 transition-colors ${isLive ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500 pl-3' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
      <div className="flex justify-between items-center text-xs mb-3 text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1 font-bold">
          {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
          {isDateValid ? matchDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : ''}
          <span className="text-gray-300 dark:text-gray-600 mx-1">|</span>
          <span className="text-[10px] bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{translatePhase(match.phase)}</span>
        </span>
        <span>{match.location}</span>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center justify-end w-[35%] gap-2 md:gap-3">
          <span className="truncate leading-tight text-right text-gray-900 dark:text-gray-200 font-bold text-sm md:text-base hidden sm:inline">
            {getTeamName(homeTeam.name)}
          </span>
          <span className="truncate leading-tight text-right text-gray-900 dark:text-gray-200 font-bold text-sm md:text-base inline sm:hidden">
            {homeTeam.short_name || getTeamName(homeTeam.name)}
          </span>
          {getSafeLogo(homeTeam.id, homeTeam.logo) ? (
            <img src={getSafeLogo(homeTeam.id, homeTeam.logo)} alt={homeTeam.name} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; e.currentTarget.onerror = null; }} referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
              {homeTeam.short_name || getTeamName(homeTeam.name).substring(0, 3).toUpperCase()}
            </div>
          )}
        </div>

        <div className="w-[30%] text-center flex justify-center px-1">
          {isFinished ? (
            <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg font-black text-gray-800 dark:text-gray-100 shadow-sm whitespace-nowrap">
              {match.home_score} - {match.away_score}
            </span>
          ) : isLive ? (
            <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-3 py-1.5 rounded-lg font-black shadow-sm animate-pulse whitespace-nowrap">
              {match.home_score || 0} - {match.away_score || 0}
            </span>
          ) : (
            <span className="text-blue-900 dark:text-blue-400 font-black bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg text-sm shadow-sm">
              {isDateValid ? matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
            </span>
          )}
        </div>

        <div className="flex items-center justify-start w-[35%] gap-2 md:gap-3">
          {getSafeLogo(awayTeam.id, awayTeam.logo) ? (
            <img src={getSafeLogo(awayTeam.id, awayTeam.logo)} alt={awayTeam.name} className="w-8 h-8 object-contain" onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; e.currentTarget.onerror = null; }} referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-bold shrink-0">
              {awayTeam.short_name || getTeamName(awayTeam.name).substring(0, 3).toUpperCase()}
            </div>
          )}
          <span className="truncate leading-tight text-left text-gray-900 dark:text-gray-200 font-bold text-sm md:text-base hidden sm:inline">
            {getTeamName(awayTeam.name)}
          </span>
          <span className="truncate leading-tight text-left text-gray-900 dark:text-gray-200 font-bold text-sm md:text-base inline sm:hidden">
            {awayTeam.short_name || getTeamName(awayTeam.name)}
          </span>
        </div>
      </div>
    </div>
  );
};

export const TablePageBrasileirao: React.FC = () => {
  const navigate = useNavigate();
  const { brasileiraoMatches: matches, brasileiraoTeams: teams, isBrasileiraoLoading, fetchBrasileiraoMatchesByComp } = useStore();
  
  const [selectedCompetition, setSelectedCompetition] = useState<'none' | 'brasileirao' | 'copa_do_brasil'>('none');
  const [loadingComp, setLoadingComp] = useState(false);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'classificacao' | 'jogos'>('classificacao');

  React.useEffect(() => {
    if (selectedCompetition !== 'none') {
      setLoadingComp(true);
      fetchBrasileiraoMatchesByComp([selectedCompetition])
        .catch(err => {
          console.error("Failed to load competition matches:", err);
        })
        .finally(() => {
          setLoadingComp(false);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompetition]);

  const brasileiraoMatches = useMemo(() => matches.filter(m => !m.championship || m.championship === 'brasileirao'), [matches]);
  const copaMatches = useMemo(() => matches.filter(m => m.championship === 'copa_do_brasil'), [matches]);

  const maxRound = useMemo(() => {
    let max = 1;
    brasileiraoMatches.forEach(m => {
      if (m.phase && m.phase.includes('Rodada ')) {
        const r = parseInt(m.phase.replace('Rodada ', ''), 10);
        if (!isNaN(r) && r > max) max = r;
      }
    });
    return max;
  }, [brasileiraoMatches]);

  React.useEffect(() => {
    if (brasileiraoMatches.length > 0) {
      const now = new Date().getTime();
      let activeRounds = new Set<number>();
      let highestFinished = 1;

      brasileiraoMatches.forEach(m => {
        if (m.phase && m.phase.includes('Rodada ')) {
          const r = parseInt(m.phase.replace('Rodada ', ''), 10);
          if (!isNaN(r)) {
            const mTime = new Date(m.date).getTime();
            if (m.status === MatchStatus.FINISHED) {
              if (r > highestFinished) highestFinished = r;
            } else if (m.status === MatchStatus.IN_PROGRESS) {
              activeRounds.add(r);
            } else {
              // If match is SCHEDULED/TIMED and happens within a 4-day window around today
              if (mTime > now - 24 * 3600 * 1000 && mTime < now + 4 * 24 * 3600 * 1000) {
                activeRounds.add(r);
              }
            }
          }
        }
      });

      if (activeRounds.size > 0) {
        // Pick the highest round among those happening right now (e.g. 19 over 4)
        setCurrentRound(Math.max(...Array.from(activeRounds)));
      } else {
        // Look for the next upcoming chronological match window
        const upcomingMatches = brasileiraoMatches.filter(m => m.status !== MatchStatus.FINISHED && new Date(m.date).getTime() > now);
        if (upcomingMatches.length > 0) {
          upcomingMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const nextDate = new Date(upcomingMatches[0].date).getTime();
          const windowEnd = nextDate + (4 * 24 * 3600 * 1000);
          let maxRoundInWindow = 1;
          
          upcomingMatches.forEach(m => {
            if (new Date(m.date).getTime() <= windowEnd && m.phase?.includes('Rodada ')) {
              const r = parseInt(m.phase.replace('Rodada ', ''), 10);
              if (!isNaN(r) && r > maxRoundInWindow) maxRoundInWindow = r;
            }
          });
          setCurrentRound(maxRoundInWindow);
        } else {
          setCurrentRound(highestFinished);
        }
      }
    }
  }, [brasileiraoMatches]);

  const standings = useMemo(() => {
    const table: Record<number, TeamStanding> = {};
    const brasileiraoTeamIds = new Set<number | string>();
    brasileiraoMatches.forEach(m => {
      if (m.home_team_id) brasileiraoTeamIds.add(m.home_team_id);
      if (m.away_team_id) brasileiraoTeamIds.add(m.away_team_id);
    });

    teams.filter(t => brasileiraoTeamIds.has(t.id)).forEach(t => {
      table[t.id] = {
        id: t.id, name: t.name, logo: t.logo,
        points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0
      };
    });

    brasileiraoMatches.forEach(match => {
      if (match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) {
        const homeId = match.home_team_id;
        const awayId = match.away_team_id;
        const homeScore = match.home_score || 0;
        const awayScore = match.away_score || 0;

        if (table[homeId] && table[awayId]) {
          table[homeId].played += 1;
          table[homeId].gf += homeScore;
          table[homeId].ga += awayScore;
          table[homeId].gd = table[homeId].gf - table[homeId].ga;

          table[awayId].played += 1;
          table[awayId].gf += awayScore;
          table[awayId].ga += homeScore;
          table[awayId].gd = table[awayId].gf - table[awayId].ga;

          if (homeScore > awayScore) {
            table[homeId].won += 1;
            table[homeId].points += 3;
            table[awayId].lost += 1;
          } else if (awayScore > homeScore) {
            table[awayId].won += 1;
            table[awayId].points += 3;
            table[homeId].lost += 1;
          } else {
            table[homeId].drawn += 1;
            table[homeId].points += 1;
            table[awayId].drawn += 1;
            table[awayId].points += 1;
          }
        }
      }
    });

    const sorted = Object.values(table).sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.won !== b.won) return b.won - a.won;
      if (a.gd !== b.gd) return b.gd - a.gd;
      return b.gf - a.gf;
    });

    return sorted;
  }, [brasileiraoMatches, teams]);

  if (isBrasileiraoLoading && selectedCompetition === 'none') {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
  }

  const roundMatches = brasileiraoMatches.filter(m => m.phase === `Rodada ${currentRound}`);

  const renderCardSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300 mt-2">
      <button onClick={() => setSelectedCompetition('brasileirao')} className="bg-gradient-to-br from-green-600 to-brasil-green text-white p-8 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col items-center justify-center gap-4 border border-green-500">
        <Trophy size={56} className="text-brasil-yellow" />
        <h2 className="text-3xl font-black tracking-tight">Brasileirão</h2>
        <p className="text-green-100 text-sm font-medium">Ver Classificação e Jogos</p>
      </button>
      <button onClick={() => setSelectedCompetition('copa_do_brasil')} className="bg-gradient-to-br from-yellow-400 to-brasil-yellow text-brasil-green p-8 rounded-xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col items-center justify-center gap-4 border border-yellow-500">
        <Trophy size={56} className="text-brasil-green" />
        <h2 className="text-3xl font-black tracking-tight">Copa do Brasil</h2>
        <p className="text-yellow-800 text-sm font-medium">Ver Jogos do Mata-Mata</p>
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="mb-4">
        <button
          onClick={() => {
            if (selectedCompetition !== 'none') {
              setSelectedCompetition('none');
            } else {
              navigate('/brasileirao');
            }
          }}
          className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
        >
          <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
            <ArrowLeft size={18} />
          </div>
          Voltar
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <h1 className="text-3xl font-black text-brasil-green dark:text-green-400 flex items-center gap-2">
            <Trophy className="text-brasil-yellow" fill="currentColor" />
            Tabela das Competições
          </h1>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
            <Clock size={12} />
            Todos os jogos estão no horário de Brasília (BRT)
          </div>
        </div>

        {selectedCompetition === 'brasileirao' && (
          <div className="flex border-b border-gray-200 dark:border-gray-700 mt-2">
            <button
              className={`px-4 py-2 font-bold text-sm uppercase ${activeTab === 'classificacao' ? 'border-b-2 border-brasil-green text-brasil-green' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('classificacao')}
            >
              Classificação
            </button>
            <button
              className={`px-4 py-2 font-bold text-sm uppercase ${activeTab === 'jogos' ? 'border-b-2 border-brasil-green text-brasil-green' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
              onClick={() => setActiveTab('jogos')}
            >
              Jogos
            </button>
          </div>
        )}
      </div>

      {selectedCompetition === 'none' && renderCardSelection()}

      {loadingComp ? (
        <div className="flex flex-col items-center justify-center py-20 text-brasil-green">
          <Loader2 className="animate-spin mb-4" size={48} />
          <p className="font-bold text-gray-500 dark:text-gray-400">Carregando dados da competição...</p>
        </div>
      ) : (
        <>
          {selectedCompetition === 'brasileirao' && activeTab === 'classificacao' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="pl-4 py-3 text-left">Classificação</th>
                        <th className="py-3 text-center" title="Pontos">P</th>
                        <th className="py-3 text-center" title="Jogos">J</th>
                        <th className="py-3 text-center" title="Vitórias">V</th>
                        <th className="py-3 text-center hidden sm:table-cell" title="Empates">E</th>
                        <th className="py-3 text-center hidden sm:table-cell" title="Derrotas">D</th>
                        <th className="py-3 text-center hidden sm:table-cell" title="Gols Marcados">GP</th>
                        <th className="py-3 text-center hidden sm:table-cell" title="Gols Sofridos">GC</th>
                        <th className="py-3 text-center" title="Saldo de Gols">SG</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {standings.map((team, idx) => (
                        <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                          <td className="pl-4 py-2 flex items-center gap-3">
                            <span className={`w-5 text-center font-bold text-xs ${idx < 4 ? 'text-brasil-blue' : idx < 6 ? 'text-brasil-yellow' : idx > 15 ? 'text-red-500' : 'text-gray-400'}`}>
                              {idx + 1}
                            </span>
                            {getSafeLogo(team.id, team.logo) ? (
                              <img src={getSafeLogo(team.id, team.logo)} alt={team.name} className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.src = LOGO_FALLBACK; e.currentTarget.onerror = null; }} referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                                {getTeamName(team.name).substring(0, 3).toUpperCase()}
                              </div>
                            )}
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[120px] sm:max-w-none hidden sm:inline">
                              {getTeamName(team.name)}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[120px] inline sm:hidden">
                              {teams.find(t => t.id === team.id)?.short_name || getTeamName(team.name)}
                            </span>
                          </td>
                          <td className="text-center font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50">{team.points}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400">{team.played}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400">{team.won}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">{team.drawn}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">{team.lost}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">{team.gf}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400 hidden sm:table-cell">{team.ga}</td>
                          <td className="text-center text-gray-600 dark:text-gray-400">{team.gd}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brasil-blue"></span> Libertadores</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brasil-yellow"></span> Pré-Libertadores</div>
                  <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Rebaixamento</div>
                </div>
              </div>
            </section>
          )}

          {selectedCompetition === 'brasileirao' && activeTab === 'jogos' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setCurrentRound(prev => Math.max(1, prev - 1))}
                    disabled={currentRound === 1}
                    className="p-2 text-gray-500 hover:text-brasil-green disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <h2 className="text-lg font-black text-gray-800 dark:text-gray-200">
                    {currentRound}ª Rodada
                  </h2>
                  <button
                    onClick={() => setCurrentRound(prev => Math.min(maxRound, prev + 1))}
                    disabled={currentRound === maxRound}
                    className="p-2 text-gray-500 hover:text-brasil-green disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {roundMatches.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">Nenhum jogo nesta rodada.</div>
                  ) : (
                    roundMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(match => (
                      <MatchRow key={match.id} match={match} teams={teams} />
                    ))
                  )}
                </div>
              </div>
            </section>
          )}

          {selectedCompetition === 'copa_do_brasil' && (
            <section className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden p-4">
                {copaMatches.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">Nenhum jogo disponível.</div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(
                      copaMatches.reduce((acc, match) => {
                        const phase = match.phase || 'Outros';
                        if (!acc[phase]) acc[phase] = [];
                        acc[phase].push(match);
                        return acc;
                      }, {} as Record<string, typeof matches>)
                    )
                    .sort((a, b) => getPhaseOrder(a[0]) - getPhaseOrder(b[0]))
                    .map(([phase, phaseMatches]) => (
                      <div key={phase} className="bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700">
                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                          {translatePhase(phase)}
                        </h3>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                           {phaseMatches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(match => (
                             <MatchRow key={match.id} match={match} teams={teams} />
                           ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}

      <div className="w-full mt-8 mb-4 flex justify-center">
        <AdSenseBanner className="w-full max-w-[728px] h-[90px]" />
      </div>
    </div>
  );
};