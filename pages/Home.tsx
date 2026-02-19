import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../App';
import { Calendar, Trophy, Users, PlayCircle, ShieldCheck, Mail, Check, X, Loader2, Info } from 'lucide-react';
import { supabase } from '../services/supabase';

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
              src="/palpiteirodacopa2026.png"
              alt="Logo Palpiteiro da Copa 2026"
              className="relative w-64 md:w-80 h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
            />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brasil-green to-brasil-blue dark:from-green-400 dark:to-blue-400 tracking-tighter uppercase break-words">
              PALPITEIRO DA COPA DO MUNDO FIFA 2026
            </h1>
            <h2 className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 font-medium max-w-lg mx-auto leading-relaxed">
              Crie sua liga grátis e desafie seus amigos.
              <span className="block">A sua torcida começa aqui!</span>
            </h2>
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
        <div className="w-full max-w-5xl px-4 mt-8 flex flex-col gap-2 items-center text-center">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider opacity-80">Copa do Mundo FIFA 2026</h2>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tabela, Simulador, Palpites e Ligas com Ranking em Tempo Real</h2>

          <Link to="/como-jogar" className="text-brasil-blue dark:text-blue-400 hover:underline font-bold text-lg mt-6 flex items-center gap-2 transition-colors">
            <Info size={20} />
            Clique Aqui e Saiba Como Funciona
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-5xl px-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-green hover:shadow-md transition-all">
            <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brasil-green dark:text-green-300">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Crie Ligas</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Convide amigos para grupos de palpites privados.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-yellow hover:shadow-md transition-all">
            <div className="bg-yellow-100 dark:bg-yellow-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-yellow-700 dark:text-yellow-300">
              <PlayCircle size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Simulador Real</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Simule todos os jogos com classificação e exporte para as ligas.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-blue hover:shadow-md transition-all">
            <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brasil-blue dark:text-blue-300">
              <Calendar size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Tabela Completa</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Acompanhe datas, horários e chaveamento de todos os jogos.</p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex gap-6 mt-8 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/termos" className="hover:text-brasil-blue dark:hover:text-blue-400 transition-colors">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:text-brasil-blue dark:hover:text-blue-400 transition-colors">Política de Privacidade</Link>
        </div>

        {/* Decorative Bottom Border */}
        <div className="w-full max-w-5xl mt-8 h-1.5 bg-gradient-to-r from-brasil-green via-brasil-yellow to-brasil-blue rounded-full opacity-60"></div>
      </div >
    );
  }

  // --- AUTHENTICATED VIEW (Dashboard) ---
  const upcomingMatches = matches
    .filter(m => new Date(m.date) > currentTime)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  const myLeagues = leagues.filter(l => l.participants.includes(currentUser.id));
  const pendingInvites = invitations.filter(i => i.status === 'pending');

  // Handle hash scrolling
  const location = useLocation();
  React.useEffect(() => {
    if (location.hash === '#invites-section') {
      // Small timeout to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById('invites-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, [loading, pendingInvites.length, location.hash]); // Re-run when invites load/change or hash changes

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
            src="https://sjianpqzozufnobftksp.supabase.co/storage/v1/object/public/Public/palpiteirodacopa2026.png"
            alt="Palpiteiro"
            className="w-24 h-auto drop-shadow-lg hidden md:block opacity-90"
          />
        </div>
      </div>

      {/* PENDING INVITES SECTION */}
      {pendingInvites.length > 0 && (
        <div id="invites-section" className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-sm">
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
      {/* Main Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <Link to="/simulador" className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-blue-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <PlayCircle size={80} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl w-fit mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <PlayCircle className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Simulador da Copa</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Simule resultados e exporte para suas ligas.</p>
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

        <Link to="/como-jogar" className="group bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-700 hover:border-purple-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
            <Info size={80} className="text-purple-500 dark:text-purple-400" />
          </div>
          <div className="relative z-10">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl w-fit mb-4 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Info className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Como Funciona</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Entenda as regras de pontuação e como funciona o simulador.
            </p>
          </div>
        </Link>
      </div>

      {/* LEGAL INFO CARD */}
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="p-4 rounded-2xl bg-gray-200 dark:bg-gray-700 shrink-0">
            <ShieldCheck className="w-8 h-8 text-gray-600 dark:text-gray-300" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Informativo Legal</h2>
            <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed text-justify mb-4">
              Este aplicativo tem finalidade exclusivamente recreativa e não possui vínculo com entidades organizadoras da Copa do Mundo 2026.
              Não promovemos apostas financeiras. A gestão de ligas e premiações (se houver) é de total responsabilidade dos criadores e participantes de cada liga.
            </p>
            <div className="flex gap-4 text-sm font-medium">
              <Link to="/termos" className="text-brasil-blue dark:text-blue-400 hover:underline">Termos de Uso</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Bottom Border for Dashboard */}
      <div className="pt-4">
        <div className="w-full h-1 bg-gradient-to-r from-brasil-green via-brasil-yellow to-brasil-blue rounded-full opacity-30"></div>
      </div>
    </div>
  );
};
