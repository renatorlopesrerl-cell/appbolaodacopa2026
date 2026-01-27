import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../App';
import { Calendar, Trophy, Users, PlayCircle, ShieldCheck, Mail, Check, X, Loader2 } from 'lucide-react';

export const Home: React.FC = () => {
  const { currentUser, matches, leagues, currentTime, loading, invitations, respondToInvite, loginGoogle } = useStore();

  // --- GUEST VIEW (Landing Page) ---
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] text-center animate-in fade-in zoom-in-95 duration-500 pb-10">

        {/* Hero Section */}
        <div className="space-y-6 max-w-2xl px-4 flex flex-col items-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-brasil-yellow blur-xl opacity-50 rounded-full"></div>
            {/* LOGO DA COPA */}
            <img
              src="https://sjianpqzozufnobftksp.supabase.co/storage/v1/object/public/Public/logo.png"
              alt="Logo Bolão da Copa 2026"
              className="relative w-64 md:w-80 h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brasil-green to-brasil-blue dark:from-green-400 dark:to-blue-400 tracking-tighter uppercase">
              BOLÃO DA COPA 2026
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-medium max-w-lg mx-auto leading-relaxed">
              A torcida começa aqui. Crie sua liga, desafie seus amigos e viva a emoção do Hexa.
            </p>
          </div>
        </div>

        {/* Login Actions */}
        <div className="w-full max-w-xs space-y-4 mt-10">
          <button
            onClick={loginGoogle}
            className="relative w-full group overflow-hidden bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brasil-blue dark:hover:border-blue-500 text-gray-700 dark:text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-6 h-6" alt="Google" />
            <span className="text-sm md:text-base uppercase tracking-wide">LOGIN COM O GOOGLE</span>
          </button>

          <div className="flex items-center justify-center gap-2">
            <div className="h-px bg-gray-300 dark:bg-gray-700 w-full opacity-50"></div>
            <span className="text-xs text-gray-400 uppercase font-bold whitespace-nowrap">OU</span>
            <div className="h-px bg-gray-300 dark:bg-gray-700 w-full opacity-50"></div>
          </div>

          <Link
            to="/login"
            className="relative w-full group overflow-hidden bg-brasil-blue border-2 border-brasil-blue hover:bg-blue-900 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <Mail className="w-6 h-6" />
            <span className="text-sm md:text-base uppercase tracking-wide">ENTRAR OU CADASTRAR COM E-MAIL</span>
          </Link>

          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500 pt-2">
            <ShieldCheck size={14} />
            <span>Ambiente Seguro via Supabase Auth</span>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16 w-full max-w-5xl px-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-green hover:shadow-md transition-all">
            <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brasil-green dark:text-green-300">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Crie Ligas</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Convide a galera do trabalho ou da família para grupos privados.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-yellow hover:shadow-md transition-all">
            <div className="bg-yellow-100 dark:bg-yellow-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-yellow-700 dark:text-yellow-300">
              <PlayCircle size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Simulação Real</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Pontuação dinâmica baseada em placar exato e saldo de gols.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-blue hover:shadow-md transition-all">
            <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brasil-blue dark:text-blue-300">
              <Calendar size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Tabela Completa</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Acompanhe datas, horários e chaveamento de todos os jogos.</p>
          </div>
        </div>

        {/* Decorative Bottom Border */}
        <div className="w-full max-w-5xl mt-16 h-1.5 bg-gradient-to-r from-brasil-green via-brasil-yellow to-brasil-blue rounded-full opacity-60"></div>
      </div>
    );
  }

  // --- AUTHENTICATED VIEW (Dashboard) ---
  const upcomingMatches = matches
    .filter(m => new Date(m.date) > currentTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const myLeagues = leagues.filter(l => l.participants.includes(currentUser.id));
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-brasil-blue via-blue-800 to-brasil-blue rounded-3xl p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brasil-yellow rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-brasil-green rounded-full blur-3xl opacity-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
              Olá, {currentUser.name}!
              <span className="ml-2 inline-block animate-bounce">⚽</span>
            </h1>
            <p className="text-blue-100 text-lg max-w-xl">
              A Copa do Mundo de 2026 está chegando. Prepare seus palpites e mostre que você entende de futebol!
            </p>
          </div>
          {/* Small Logo for Dashboard */}
          <img
            src="https://sjianpqzozufnobftksp.supabase.co/storage/v1/object/public/Public/logo.png"
            alt="Bolão"
            className="w-24 h-auto drop-shadow-lg hidden md:block opacity-90"
          />
        </div>
      </div>

      {/* PENDING INVITES SECTION */}
      {pendingInvites.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
          <h2 className="font-bold text-yellow-800 dark:text-yellow-400 flex items-center gap-2 mb-3">
            <Mail size={20} />
            Convites Pendentes
          </h2>
          <div className="space-y-3">
            {pendingInvites.map(invite => {
              const league = leagues.find(l => l.id === invite.leagueId);
              return (
                <div key={invite.id} className="bg-white dark:bg-gray-800 p-3 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-3 border border-yellow-200 dark:border-yellow-800">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-300">Você foi convidado para entrar na liga:</span>
                    <div className="font-bold text-gray-800 dark:text-white text-lg">{league ? league.name : 'Liga não encontrada'}</div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => respondToInvite(invite.id, true)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                    >
                      <Check size={16} /> Aceitar
                    </button>
                    <button
                      onClick={() => respondToInvite(invite.id, false)}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-100 text-red-600 rounded-lg font-bold text-sm hover:bg-red-200 flex items-center justify-center gap-1"
                    >
                      <X size={16} /> Recusar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/table" className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-brasil-green relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <Calendar size={80} className="text-brasil-green dark:text-green-400" />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl w-fit mb-4 group-hover:bg-brasil-green group-hover:text-white transition-colors">
              <Calendar className="w-6 h-6 text-brasil-green dark:text-green-400 group-hover:text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Tabela da Copa</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Visualize grupos, horários e classificação atualizada.</p>
          </div>
        </Link>

        <Link to="/leagues" className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-brasil-yellow relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <Users size={80} className="text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-xl w-fit mb-4 group-hover:bg-brasil-yellow group-hover:text-blue-900 transition-colors">
              <Users className="w-6 h-6 text-yellow-600 dark:text-yellow-400 group-hover:text-blue-900" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Minhas Ligas</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {myLeagues.length > 0
                ? `Você está participando de ${myLeagues.length} liga(s).`
                : "Crie ou participe de ligas para competir."}
            </p>
          </div>
        </Link>

        {/* Next Match Teaser */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-blue transition-all">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
              <Trophy className="w-6 h-6 text-brasil-blue dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Próximo Jogo</h2>
          </div>

          {upcomingMatches.length > 0 ? (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-brasil-blue dark:text-blue-400 uppercase tracking-wider">
                  {!isNaN(new Date(upcomingMatches[0].date).getTime())
                    ? new Date(upcomingMatches[0].date).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })
                    : 'Data inválida'
                  }
                </span>
                <span className="text-xs font-bold bg-white dark:bg-gray-600 px-2 py-1 rounded border border-gray-200 dark:border-gray-500 text-gray-800 dark:text-white">
                  {!isNaN(new Date(upcomingMatches[0].date).getTime())
                    ? new Date(upcomingMatches[0].date).toLocaleTimeString('pt-BR', { timeStyle: 'short' })
                    : '--:--'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-gray-800 dark:text-gray-200">
                <span className="truncate w-[45%] text-right">{upcomingMatches[0].homeTeamId}</span>
                <span className="text-gray-400 px-2">X</span>
                <span className="truncate w-[45%] text-left">{upcomingMatches[0].awayTeamId}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm italic">Nenhum jogo agendado para os próximos dias.</p>
          )}
        </div>
      </div>

      {/* Decorative Bottom Border for Dashboard */}
      <div className="pt-4">
        <div className="w-full h-1 bg-gradient-to-r from-brasil-green via-brasil-yellow to-brasil-blue rounded-full opacity-30"></div>
      </div>
    </div>
  );
};