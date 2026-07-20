import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../App';
import { Plus, Lock, Globe, ArrowRight, Search, ArrowLeft, Upload, Camera, Trophy, Loader2, X, Star, Info } from 'lucide-react';
import { processImageForUpload } from '../services/dataService';
import { LeaguePlan, League } from '../types';
import { OptimizedImage } from '../components/OptimizedImage';
import { api } from '../services/api';
import { AdSenseBanner } from '../components/AdSenseBanner';
import { Capacitor } from '@capacitor/core';

export const LeaguesPageBrasileirao: React.FC = () => {
  const navigate = useNavigate();
  const { brasileiraoLeagues: leagues, currentUser, createBrasileiraoLeague: createLeague, joinBrasileiraoLeague: joinLeague, isBrasileiraoLoading, users } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [leagueImage, setLeagueImage] = useState('');
  const [leaguePlan, setLeaguePlan] = useState<LeaguePlan>('FREE');
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('code') || searchParams.get('join') || '');
  const [isCreating, setIsCreating] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [searchedPrivateLeague, setSearchedPrivateLeague] = useState<League | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<{
    exactScore: number | '';
    winnerAndDiff: number | '';
    winnerAndWinnerGoals: number | '';
    winner: number | '';
    draw: number | '';
  }>({ exactScore: 10, winnerAndDiff: 5, winnerAndWinnerGoals: 5, winner: 4, draw: 5 });


  const [leagueCompetitions, setLeagueCompetitions] = useState<('brasileirao' | 'copa_do_brasil' | 'libertadores' | 'sul_americana')[]>(['brasileirao']);

  // AdMob Banner — exibido para TODOS os usuários na página de listagem (apenas Android/iOS)
  const adMobRef = useRef<any>(null);
  const bannerShownRef = useRef(false);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let cancelled = false;
    (async () => {
      try {
        const mod = await import('@capacitor-community/admob');
        if (cancelled) return; // componente já desmontado, não exibe
        adMobRef.current = mod.AdMob;
        await mod.AdMob.showBanner({
          adId: 'ca-app-pub-7684468298593275/2185547308',
          adSize: mod.BannerAdSize.BANNER,
          position: mod.BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: false
        });
        if (!cancelled) bannerShownRef.current = true;
      } catch (e) { console.error('AdMob show error:', e); }
    })();
    return () => {
      cancelled = true;
      // Usa o módulo já carregado (sem novo import assíncrono) para evitar crash na navegação
      if (bannerShownRef.current && adMobRef.current) {
        bannerShownRef.current = false;
        adMobRef.current.hideBanner().catch(() => {});
        adMobRef.current.removeBanner().catch(() => {});
      }
    };
  }, []);

  const resetForm = () => {
    setNewLeagueName('');
    setNewLeagueDescription('');
    setLeagueImage('');
    setIsPrivate(true);
    setLeaguePlan('FREE');
    setSettings({ exactScore: 10, winnerAndDiff: 5, winnerAndWinnerGoals: 5, winner: 4, draw: 5 });

    setLeagueCompetitions(['brasileirao']);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Settings
    if (settings.exactScore === '' || settings.winnerAndDiff === '' || settings.winnerAndWinnerGoals === '' || settings.winner === '' || settings.draw === '') {
      alert("Por favor, preencha todos os campos de pontuação.");
      return;
    }
    
    if (leagueCompetitions.length === 0) {
      alert("Por favor, selecione pelo menos um campeonato.");
      return;
    }

    setIsCreating(true);

    try {
      const finalSettings = {
        exactScore: Math.min(99, Math.max(1, Number(settings.exactScore) || 1)),
        winnerAndDiff: Math.min(99, Math.max(1, Number(settings.winnerAndDiff) || 1)),
        winnerAndWinnerGoals: Math.min(99, Math.max(1, Number(settings.winnerAndWinnerGoals) || 1)),
        winner: Math.min(99, Math.max(1, Number(settings.winner) || 1)),
        draw: Math.min(99, Math.max(1, Number(settings.draw) || 1)),

        competitions: leagueCompetitions
      };

      const success = await createLeague(newLeagueName, isPrivate, finalSettings, leagueImage, newLeagueDescription, leaguePlan);

      if (success) {
        resetForm();
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error("Erro ao criar liga:", error);
      alert("Ocorreu um erro inesperado ao criar a liga.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancel = () => {
    resetForm();
    setShowCreateModal(false);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert("Por favor, selecione um arquivo de imagem válido.");
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      try {
        setImageProcessing(true);
        const compressedImage = await processImageForUpload(file);
        setLeagueImage(compressedImage);
      } catch (err) {
        console.error(err);
        alert('Erro ao processar imagem.');
      } finally {
        setImageProcessing(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Local join handler: calls joinLeague AND updates searchedPrivateLeague state
  // so the button shows "Solicitado" immediately without waiting for a full reload.
  const handleJoinLeague = async (leagueId: string, league: League) => {
    await joinLeague(leagueId, league);
    // Update searchedPrivateLeague so isPending becomes true in the UI
    if (searchedPrivateLeague && searchedPrivateLeague.id === leagueId) {
      setSearchedPrivateLeague(prev =>
        prev ? { ...prev, pendingRequests: [...(prev.pendingRequests || []), currentUser.id] } : prev
      );
    }
  };

  useEffect(() => {
    const searchCode = searchTerm.trim().toUpperCase();
    if (searchCode.length === 6) {
      // Check if we already have it locally
      const existsLocally = leagues.some(l => l.leagueCode === searchCode);
      if (!existsLocally) {
        setIsSearching(true);
        api.brasileiraoLeagues.search(searchCode).then(data => {
          if (data && data.length > 0) {
            // Map the raw DB object to League
            const raw = data[0];
            const mappedLeague: League = {
              id: raw.id, name: raw.name, description: raw.description, image: raw.image,
              isPrivate: raw.is_private, adminId: raw.admin_id, participants: raw.participants || [],
              pendingRequests: raw.pending_requests || [], leagueCode: raw.league_code,
              settings: raw.settings
            };
            setSearchedPrivateLeague(mappedLeague);
          } else {
            setSearchedPrivateLeague(null);
          }
        }).catch(() => setSearchedPrivateLeague(null)).finally(() => setIsSearching(false));
        return;
      }
    }
    setSearchedPrivateLeague(null);
  }, [searchTerm, leagues]);

  if (isBrasileiraoLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
  }

  // Guaranteed by ProtectedRoute
  if (!currentUser) return <Navigate to="/" replace />;

  // Base lists
  const myLeagues = leagues.filter(l => l.participants.includes(currentUser.id));
  const otherLeagues = leagues.filter(l => !l.participants.includes(currentUser.id));

  // If a remote league was found and we don't already participate, include it in otherLeagues
  if (searchedPrivateLeague && !searchedPrivateLeague.participants.includes(currentUser.id)) {
    // Only add if not already in otherLeagues
    if (!otherLeagues.some(l => l.id === searchedPrivateLeague.id)) {
      otherLeagues.push(searchedPrivateLeague);
    }
  }

  // Filtered lists based on search term (Name OR Code)
  const filterFn = (l: any) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.leagueCode && l.leagueCode.toLowerCase().includes(searchTerm.toLowerCase()));

  const sortedMyLeagues = myLeagues
    .sort((a, b) => {
      // 1. User is Admin first
      const aIsAdmin = a.adminId === currentUser.id;
      const bIsAdmin = b.adminId === currentUser.id;
      if (aIsAdmin && !bIsAdmin) return -1;
      if (!aIsAdmin && bIsAdmin) return 1;

      // 2. Alphabetical order
      return a.name.localeCompare(b.name);
    });

  const filteredOtherLeagues = otherLeagues
    .filter(l => {
      // Private leagues: only show if search term matches their leagueCode exactly
      if (l.isPrivate) {
        return searchTerm.length > 0 && l.leagueCode && l.leagueCode.toLowerCase() === searchTerm.toLowerCase();
      }
      // Public leagues: filter by name or code as usual
      return filterFn(l);
    })
    .sort((a, b) => {
      // 1. "Palpiteiros" first
      const aIsOfficial = a.name.trim().toLowerCase() === 'palpiteiros';
      const bIsOfficial = b.name.trim().toLowerCase() === 'palpiteiros';
      if (aIsOfficial && !bIsOfficial) return -1;
      if (!aIsOfficial && bIsOfficial) return 1;

      // 2. Alphabetical order
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <button
          onClick={() => navigate('/brasileirao')}
          className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
        >
          <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
            <ArrowLeft size={18} />
          </div>
          Voltar
        </button>
      </div>

      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Trophy className="text-brasil-yellow" fill="currentColor" />
          Ligas
        </h1>

        <button
          id="create-league-btn"
          onClick={() => setShowCreateModal(true)}
          className="bg-brasil-yellow text-brasil-blue px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          Criar Liga
        </button>
      </div>

      {/* Banner AdSense (Oculto temporariamente) */}
      {/* 
      <div className="w-full h-auto mt-4">
        <AdSenseBanner className="w-full h-auto min-h-[50px]" />
      </div> 
      */}

      {/* My Leagues */}
      <section>
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3">Minhas Ligas</h2>
        {sortedMyLeagues.length === 0 ? (
          <p className="text-gray-500 italic">Você ainda não participa de nenhuma liga.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedMyLeagues.map(l => {
              // Show pending requests badge directly from the league metadata array length
              const validPendingCount = l.pendingRequests.length;

              return (
                <Link to={`/league-brasileirao/${l.id}`} key={l.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-blue dark:hover:border-blue-500 transition-all group relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      {l.image ? (
                        <OptimizedImage
                          src={l.image}
                          alt={l.name}
                          containerClassName="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-600 shadow-sm"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-brasil-blue dark:text-blue-400">
                          <Trophy size={20} />
                        </div>
                      )}

                      <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 group-hover:text-brasil-blue dark:group-hover:text-blue-400 transition-colors flex items-center gap-2">
                          {l.name}
                        </h3>
                        <div className="flex items-center gap-1 min-[380px]:gap-2 text-[10px] min-[380px]:text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {l.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                          <span>{l.isPrivate ? 'Privada' : 'Aberta'}</span>
                          <span>•</span>
                          <span>{l.participants.length} participante(s)</span>
                          {l.adminId === currentUser.id && (
                            <span className="bg-gray-200 dark:bg-gray-700 text-black dark:text-white text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">ADMIN</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                            {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('brasileirao') && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Brasileirão</span>}
                            {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('copa_do_brasil') && <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Copa do Brasil</span>}
                            {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('libertadores') && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Libertadores</span>}
                            {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('sul_americana') && <span className="text-[9px] bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-300 border border-pink-200 dark:border-pink-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Sul-Americana</span>}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="text-gray-300 dark:text-gray-600 group-hover:text-brasil-blue dark:group-hover:text-blue-400 mt-2" />
                  </div>

                  {l.adminId === currentUser.id && validPendingCount > 0 && (
                    <div className="mt-2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 text-xs px-2 py-1 rounded inline-block font-bold animate-pulse">
                      {validPendingCount} solicitações pendentes
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* AdSense Banner (Below my leagues) */}
      <div className="w-full h-auto mt-6 mb-2">
        <AdSenseBanner slotId="3157322976" className="w-full min-h-[90px]" />
      </div>

      {/* Available Leagues */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-700">

        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm text-blue-700 dark:text-blue-300">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <span>Para encontrar ligas <strong>PRIVADAS</strong> digite o <strong>CÓDIGO DA LIGA</strong> no campo abaixo.</span>
        </div>
        {/* Search Bar */}
        <div className="relative w-full mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="leagues-search"
            type="text"
            className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-brasil-blue focus:border-brasil-blue sm:text-sm transition-all shadow-sm text-gray-800 dark:text-white select-text"
            placeholder="Buscar por nome ou código da liga..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3">Ligas Disponíveis</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {filteredOtherLeagues.map(l => {
            const isPending = l.pendingRequests.includes(currentUser.id);
            return (
              <div key={l.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    {l.image ? (
                      <OptimizedImage
                        src={l.image}
                        alt={l.name}
                        containerClassName="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-gray-600 shadow-sm"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400">
                        <Trophy size={20} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                        {l.name}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {l.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                        <span>{l.isPrivate ? 'Privada' : 'Aberta'}</span>
                        <span>•</span>
                        <span>{l.participants.length} participantes</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('brasileirao') && <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Brasileirão</span>}
                          {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('copa_do_brasil') && <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Copa do Brasil</span>}
                          {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('libertadores') && <span className="text-[9px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Libertadores</span>}
                          {((l.settings?.competitions || ['brasileirao', 'copa_do_brasil']) as string[]).includes('sul_americana') && <span className="text-[9px] bg-pink-50 dark:bg-pink-900/20 text-pink-500 dark:text-pink-300 border border-pink-200 dark:border-pink-500 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Sul-Americana</span>}
                      </div>
                    </div>
                  </div>
                  {isPending ? (
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1 rounded-full">Solicitado</span>
                  ) : (
                    <button
                      id={`join-league-${l.id}`}
                      onClick={() => handleJoinLeague(l.id, l)}
                      className="text-sm font-bold text-brasil-blue dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      {l.isPrivate ? 'Solicitar' : 'Entrar'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {otherLeagues.length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhuma outra liga encontrada.</p>
          ) : filteredOtherLeagues.length === 0 && (
            <p className="text-gray-400 text-sm">Nenhuma liga encontrada com o termo "{searchTerm}".</p>
          )}
        </div>
      </section>

      {/* Create Modal */}
      {showCreateModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Criar Nova Liga</h2>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Image Upload for League */}
              <div className="flex flex-col items-center mb-4 gap-1">
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div
                  onClick={triggerFileInput}
                  className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-brasil-blue dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all relative group overflow-hidden bg-gray-50 dark:bg-gray-700"
                >
                  {leagueImage ? (
                    <img src={leagueImage} alt="Preview" className={`w-full h-full object-cover ${imageProcessing ? 'opacity-50' : ''}`} />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera size={24} />
                      <span className="text-[10px] mt-1">Logo</span>
                    </div>
                  )}
                  {imageProcessing && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="animate-spin text-brasil-blue" size={24} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="text-white" size={20} />
                  </div>
                </div>
                {/* Legenda Adicionada */}
                <span className="text-[10px] text-gray-400 font-medium">
                  {imageProcessing ? 'Processando...' : 'Qualquer tamanho (Otimização Automática)'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Liga</label>
                <input id="league-name" required value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-brasil-green outline-none" placeholder="Ex: Palpiteiros da Firma" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (Opcional)</label>
                <textarea
                  value={newLeagueDescription}
                  onChange={e => setNewLeagueDescription(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-brasil-green outline-none h-20 resize-none text-sm"
                  placeholder="Escreva sobre sua liga..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Campeonatos:
                </label>
                <div className="flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex gap-4 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={leagueCompetitions.includes('brasileirao')}
                        onChange={(e) => {
                          if (e.target.checked) setLeagueCompetitions(prev => [...prev, 'brasileirao']);
                          else setLeagueCompetitions(prev => prev.filter(c => c !== 'brasileirao'));
                        }}
                        className="w-4 h-4 text-brasil-blue border-gray-300 rounded focus:ring-brasil-blue focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Brasileirão Série A</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={leagueCompetitions.includes('copa_do_brasil')}
                        onChange={(e) => {
                          if (e.target.checked) setLeagueCompetitions(prev => [...prev, 'copa_do_brasil']);
                          else setLeagueCompetitions(prev => prev.filter(c => c !== 'copa_do_brasil'));
                        }}
                        className="w-4 h-4 text-brasil-blue border-gray-300 rounded focus:ring-brasil-blue focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Copa do Brasil</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={leagueCompetitions.includes('libertadores')}
                        onChange={(e) => {
                          if (e.target.checked) setLeagueCompetitions(prev => [...prev, 'libertadores']);
                          else setLeagueCompetitions(prev => prev.filter(c => c !== 'libertadores'));
                        }}
                        className="w-4 h-4 text-brasil-blue border-gray-300 rounded focus:ring-brasil-blue focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Libertadores</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={leagueCompetitions.includes('sul_americana')}
                        onChange={(e) => {
                          if (e.target.checked) setLeagueCompetitions(prev => [...prev, 'sul_americana']);
                          else setLeagueCompetitions(prev => prev.filter(c => c !== 'sul_americana'));
                        }}
                        className="w-4 h-4 text-brasil-blue border-gray-300 rounded focus:ring-brasil-blue focus:ring-2"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sul-Americana</span>
                    </label>
                  </div>
                  <div className="text-sm font-bold text-green-800 dark:text-green-400 mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-green-100 dark:border-green-800/50 flex items-start gap-2">
                    <Info size={18} className="mt-0.5 shrink-0 text-brasil-green dark:text-green-500" />
                    <div>
                      Crie a liga com 1 ou mais campeonatos e faça o upgrade para o plano Vip na aba Admin.{' '}
                      <button type="button" onClick={() => setShowPricingModal(true)} className="text-brasil-blue underline font-bold cursor-pointer hover:text-blue-700 dark:hover:text-blue-400">Clique aqui e confira os valores.</button>
                    </div>
                  </div>
                </div>
                {leagueCompetitions.length === 0 && <p className="text-red-500 text-xs mt-1">Selecione pelo menos um campeonato.</p>}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="private" checked={isPrivate} onChange={e => {
                  alert('Neste modo, apenas ligas privadas são permitidas.');
                }} className="rounded text-brasil-green focus:ring-brasil-green cursor-pointer" />
                <label htmlFor="private" onClick={(e) => { e.preventDefault(); alert('Neste modo, apenas ligas privadas são permitidas.'); }} className="text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">Liga Privada (Obrigatório neste modo)</label>
              </div>



              {/* Configurable Scoring Display */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
                <p className="text-sm font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                  <Trophy size={16} /> Configuração de Pontuação
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Placar Exato</span>
                    <input type="number" min="1" max="99" value={settings.exactScore} onChange={e => {
                      const val = e.target.value;
                      if (val === '') setSettings({ ...settings, exactScore: '' });
                      else {
                        const n = parseInt(val);
                        if (n > 0 && n <= 99) setSettings({ ...settings, exactScore: n });
                      }
                    }} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-blue outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Vencedor + Saldo</span>
                      <span className="text-[10px] text-gray-400">Acertou time vencedor e saldo de gols</span>
                    </div>
                    <input type="number" min="1" max="99" value={settings.winnerAndDiff} onChange={e => {
                      const val = e.target.value;
                      if (val === '') setSettings({ ...settings, winnerAndDiff: '' });
                      else {
                        const n = parseInt(val);
                        if (n > 0 && n <= 99) setSettings({ ...settings, winnerAndDiff: n });
                      }
                    }} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-blue outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Vencedor + Gols do Vencedor</span>
                      <span className="text-[10px] text-gray-400">Acertou quem vence e gols do vencedor</span>
                    </div>
                    <input type="number" min="1" max="99" value={settings.winnerAndWinnerGoals} onChange={e => {
                      const val = e.target.value;
                      if (val === '') setSettings({ ...settings, winnerAndWinnerGoals: '' });
                      else {
                        const n = parseInt(val);
                        if (n > 0 && n <= 99) setSettings({ ...settings, winnerAndWinnerGoals: n });
                      }
                    }} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-blue outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Empate (Não Exato)</span>
                      <span className="text-[10px] text-gray-400">Acertou que seria empate (ex: 1x1 e foi 2x2)</span>
                    </div>
                    <input type="number" min="1" max="99" value={settings.draw} onChange={e => {
                      const val = e.target.value;
                      if (val === '') setSettings({ ...settings, draw: '' });
                      else {
                        const n = parseInt(val);
                        if (n > 0 && n <= 99) setSettings({ ...settings, draw: n });
                      }
                    }} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-blue outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Apenas Vencedor</span>
                    <input type="number" min="1" max="99" value={settings.winner} onChange={e => {
                      const val = e.target.value;
                      if (val === '') setSettings({ ...settings, winner: '' });
                      else {
                        const n = parseInt(val);
                        if (n > 0 && n <= 99) setSettings({ ...settings, winner: n });
                      }
                    }} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-blue outline-none" />
                  </div>
                </div>
              </div>



              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isCreating}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  id="create-league-submit"
                  type="submit"
                  disabled={isCreating || imageProcessing}
                  className="px-4 py-2 bg-brasil-green text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreating && <Loader2 size={16} className="animate-spin" />}
                  {isCreating ? 'Criando...' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {/* Pricing Modal */}
      {showPricingModal && createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tabela de Preços dos Planos Vip</h2>
              <button type="button" onClick={() => setShowPricingModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Campeonatos</th>
                                <th className="px-4 py-3 whitespace-nowrap text-center">Grátis<br/><span className="text-[10px] font-normal">(até 15 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-gray-200/50 dark:bg-gray-600/30 text-gray-600 dark:text-gray-300">Vip Básico<br/><span className="text-[10px] font-normal">(até 50 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-blue-100/50 dark:bg-blue-900/30 text-brasil-blue dark:text-blue-400">Vip Top<br/><span className="text-[10px] font-normal">(até 100 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-green-100/50 dark:bg-green-900/30 text-brasil-green dark:text-green-400">Vip Master<br/><span className="text-[10px] font-normal">(até 200 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-yellow-100/50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Vip Ilimitado</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Copa (Copa do Brasil, Copa Libertadores e Copa Sul-Americana)</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 10,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 15,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 25,00</td>
                            </tr>
                            <tr className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 15,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 30,00</td>
                            </tr>
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A + 1 Copa</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 35,00</td>
                            </tr>
                            <tr className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A + 2 Copas</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 35,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 40,00</td>
                            </tr>
                            <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A + 3 Copas</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 35,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 40,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 45,00</td>
                            </tr>
                            </tbody>
                        </table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={() => setShowPricingModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-bold">
                Fechar
              </button>
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
};