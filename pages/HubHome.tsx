import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Globe, ArrowRight, Calendar, Users, PlayCircle, ShieldCheck, Mail, Check, X, Info, Smartphone, Copy } from 'lucide-react';
import { useStore } from '../App';
import { Capacitor } from '@capacitor/core';

export const HubHome: React.FC = () => {
  const { currentUser, loginGoogle } = useStore();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText('https://bolaodacopa2026.app/');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };



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
              PALPITEIRO MESTRE
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
            id="email-login-link"
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

          {/* Platform Specific Action (Play Store or Web Link) */}
          {Capacitor.getPlatform() === 'web' ? (
            <div className="flex flex-col items-center gap-2 pt-4">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Disponível para Android</p>
              <a
                href="https://play.google.com/store/apps/details?id=app.palpiteiro"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:scale-105 transition-transform duration-300 active:scale-95"
              >
                <img
                  src="https://play.google.com/intl/en_us/badges/static/images/badges/pt-br_badge_web_generic.png"
                  alt="Disponível no Google Play"
                  className="h-14 w-auto drop-shadow-md"
                />
              </a>
            </div>
          ) : Capacitor.getPlatform() === 'android' && (
            <div className="flex flex-col items-center gap-3 pt-6 w-full">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Copiar Link do Site</p>
              <button
                onClick={handleCopyLink}
                className="w-full bg-white dark:bg-gray-800 border-2 border-brasil-blue dark:border-blue-500 text-brasil-blue dark:text-blue-400 font-bold py-3 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2 group"
              >
                {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                <span className="text-sm">{copied ? 'LINK COPIADO!' : 'BOLAODACOPA2026.APP'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="w-full max-w-5xl px-4 mt-8 flex flex-col gap-2 items-center text-center">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider opacity-80">Brasileirão, Copa do Brasil, Libertadores e Sul-Americana</h2>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400">Ligas com Ranking em Tempo Real</h2>

          <Link to="/como-jogar-brasileirao" className="text-brasil-blue dark:text-blue-400 hover:underline font-bold text-lg mt-6 flex items-center gap-2 transition-colors">
            <Info size={20} />
            Clique Aqui e Saiba Como Funciona
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 w-full max-w-5xl px-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-green hover:shadow-md transition-all">
            <div className="bg-green-100 dark:bg-green-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brasil-green dark:text-green-300">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Ligas Grátis</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Crie ligas grátis para o Brasileirão, Copa do Brasil, Libertadores e Sul-Americana, todas as competições dentro da mesma liga.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-yellow hover:shadow-md transition-all">
            <div className="bg-yellow-100 dark:bg-yellow-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-yellow-700 dark:text-yellow-300">
              <PlayCircle size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Ranking em Tempo Real</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Acompanhe as pontuações e o ranking da sua liga atualizados em tempo real a cada gol.</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-blue hover:shadow-md transition-all">
            <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brasil-blue dark:text-blue-300">
              <Calendar size={24} />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-lg">Estatísticas Detalhadas</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Acesse estatísticas completas, probabilidades e histórico de confrontos para dar o melhor palpite.</p>
          </div>
        </div>

        {/* Footer Links */}
        <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm text-gray-500 dark:text-gray-400">
          <Link to="/termos" className="hover:text-brasil-blue dark:hover:text-blue-400 transition-colors">Termos de Uso</Link>
          <Link to="/privacidade" className="hover:text-brasil-blue dark:hover:text-blue-400 transition-colors">Política de Privacidade</Link>
        </div>

        {/* Decorative Bottom Border */}
        <div className="w-full max-w-5xl mt-8 h-1.5 bg-gradient-to-r from-brasil-green via-brasil-yellow to-brasil-blue rounded-full opacity-60"></div>
      </div >
    );
  }

  // --- LOGGED IN VIEW (Hub) ---
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] animate-in fade-in zoom-in-95 duration-500 pb-10 px-4">
      
      {/* Hero Section */}
      <div className="space-y-6 max-w-2xl text-center mb-10">
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 bg-brasil-yellow blur-xl opacity-50 rounded-full"></div>
          <img
            src="/palpiteirodacopa2026.png"
            alt="Logo Palpiteiro"
            className="relative w-48 md:w-64 h-auto drop-shadow-2xl hover:scale-105 transition-transform duration-500"
          />
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-brasil-green to-brasil-blue dark:from-green-400 dark:to-blue-400 tracking-tighter uppercase">
          Escolha o seu Bolão
        </h1>
        <p className="text-gray-600 dark:text-gray-300 text-lg md:text-xl font-medium">
          Participe de múltiplas ligas e torneios no mesmo app.
        </p>
      </div>

      {/* Mode Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        
        {/* Brasileirão Card */}
        <Link 
          to="/brasileirao"
          className="group relative overflow-hidden bg-gradient-to-br from-green-800 to-brasil-green rounded-3xl p-8 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-brasil-yellow"
        >
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-brasil-yellow rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex items-center justify-between">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <Trophy size={32} className="text-brasil-yellow" />
              </div>
              <span className="bg-brasil-yellow text-blue-900 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                Novo
              </span>
            </div>
            
            <div>
              <h2 className="text-2xl font-black mb-2 tracking-tight leading-tight">Brasileirão Série A, Copa do Brasil, Libertadores e Sul-Americana</h2>
              <p className="text-green-100 text-sm leading-relaxed mb-4">
                Acompanhe os campeonatos nacionais e sul-americanos, dê palpites em cada competição e concorra com seus amigos.
              </p>
              <div className="flex items-center text-brasil-yellow font-bold text-sm uppercase tracking-wider group-hover:gap-2 transition-all">
                Acessar Competições <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>
        </Link>

        {/* Copa Card */}
        <Link 
          to="/copa"
          className="group relative overflow-hidden bg-gradient-to-br from-blue-900 to-brasil-blue rounded-3xl p-8 text-white shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-2 border-transparent hover:border-brasil-yellow"
        >
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-brasil-yellow rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-6">
            <div className="flex items-center justify-between">
              <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md">
                <Globe size={32} className="text-brasil-yellow" />
              </div>
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase">
                Oficial
              </span>
            </div>
            
            <div>
              <h2 className="text-3xl font-black mb-2 tracking-tight">Copa do Mundo 2026</h2>
              <p className="text-blue-100 text-sm leading-relaxed mb-4">
                Simule todos os jogos, crie ligas para a Copa, veja tabelas e o modo especial do Brasil.
              </p>
              <div className="flex items-center text-brasil-yellow font-bold text-sm uppercase tracking-wider group-hover:gap-2 transition-all">
                Acessar Copa <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
};
