import React, { useState, useRef } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../App';
import { Plus, Lock, Globe, ArrowRight, Search, ArrowLeft, Upload, Camera, Trophy, Loader2, X, Star } from 'lucide-react';
import { processImageForUpload } from '../services/dataService';
import { LeaguePlan } from '../types';
import { OptimizedImage } from '../components/OptimizedImage';

export const LeaguesPage: React.FC = () => {
  const navigate = useNavigate();
  const { leagues, currentUser, createLeague, joinLeague, loading, users } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [leagueImage, setLeagueImage] = useState('');
  const [leaguePlan, setLeaguePlan] = useState<LeaguePlan>('FREE');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings State
  const [settings, setSettings] = useState<{
    exactScore: number | '';
    winnerAndDiff: number | '';
    winner: number | '';
    draw: number | '';
  }>({ exactScore: 10, winnerAndDiff: 7, winner: 5, draw: 7 });

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
  }

  // Guaranteed by ProtectedRoute
  if (!currentUser) return <Navigate to="/" replace />;

  const resetForm = () => {
    setNewLeagueName('');
    setNewLeagueDescription('');
    setLeagueImage('');
    setIsPrivate(true);
    setLeaguePlan('FREE');
    setSettings({ exactScore: 10, winnerAndDiff: 7, winner: 5, draw: 7 });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate Settings
    if (settings.exactScore === '' || settings.winnerAndDiff === '' || settings.winner === '' || settings.draw === '') {
      alert("Por favor, preencha todos os campos de pontuação.");
      return;
    }

    setIsCreating(true);

    try {
      const finalSettings = {
        exactScore: Number(settings.exactScore),
        winnerAndDiff: Number(settings.winnerAndDiff),
        winner: Number(settings.winner),
        draw: Number(settings.draw)
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

  // Base lists
  const myLeagues = leagues.filter(l => l.participants.includes(currentUser.id));
  const otherLeagues = leagues.filter(l => !l.participants.includes(currentUser.id));

  // Filtered lists based on search term (Name OR Code)
  const filterFn = (l: any) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.leagueCode && l.leagueCode.toLowerCase().includes(searchTerm.toLowerCase()));

  const filteredMyLeagues = myLeagues
    .filter(filterFn)
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
    .filter(filterFn)
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
          onClick={() => navigate('/')}
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

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-start md:items-center">
          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              id="leagues-search"
              type="text"
              className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-brasil-blue focus:border-brasil-blue sm:text-sm transition-all shadow-sm text-gray-800 dark:text-white"
              placeholder="Buscar por nome ou código..."
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

          <button
            id="create-league-btn"
            onClick={() => setShowCreateModal(true)}
            className="bg-brasil-yellow text-brasil-blue px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={20} />
            Criar Liga
          </button>
        </div>
      </div>

      {/* My Leagues */}
      <section>
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3">Minhas Ligas</h2>
        {myLeagues.length === 0 ? (
          <p className="text-gray-500 italic">Você ainda não participa de nenhuma liga.</p>
        ) : filteredMyLeagues.length === 0 ? (
          <p className="text-gray-500 italic">Nenhuma liga encontrada.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredMyLeagues.map(l => {
              // Only count pending requests from users that actually exist in the database
              const validPendingCount = l.pendingRequests.filter(uid => users.some(u => u.id === uid)).length;

              return (
                <Link to={`/league/${l.id}`} key={l.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-blue dark:hover:border-blue-500 transition-all group relative overflow-hidden">
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
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {l.isPrivate ? <Lock size={12} /> : <Globe size={12} />}
                          <span>{l.isPrivate ? 'Privada' : 'Aberta'}</span>
                          <span>•</span>
                          <span>{l.participants.length} participante(s)</span>
                          {l.adminId === currentUser.id && (
                            <span className="bg-brasil-yellow/20 text-yellow-800 dark:text-yellow-200 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">ADMIN</span>
                          )}
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

      {/* Available Leagues */}
      <section className="pt-6 border-t border-gray-200 dark:border-gray-700">
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
                    </div>
                  </div>
                  {isPending ? (
                    <span className="text-xs font-bold text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 px-3 py-1 rounded-full">Solicitado</span>
                  ) : (
                    <button
                      id={`join-league-${l.id}`}
                      onClick={() => joinLeague(l.id)}
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700">
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

              <div className="flex items-center gap-2">
                <input type="checkbox" id="private" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded text-brasil-green focus:ring-brasil-green" />
                <label htmlFor="private" className="text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">Liga Privada (Requer aprovação)</label>
              </div>



              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg space-y-3">
                <p className="text-xs font-bold uppercase text-gray-400">Regras de Pontuação</p>
                <div className="grid grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <label>Placar Exato</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.exactScore}
                      onChange={e => setSettings({ ...settings, exactScore: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white p-1 rounded"
                    />
                  </div>
                  <div>
                    <label>Vencedor + SG</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.winnerAndDiff}
                      onChange={e => setSettings({ ...settings, winnerAndDiff: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white p-1 rounded"
                    />
                  </div>
                  <div>
                    <label>Vencedor</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.winner}
                      onChange={e => setSettings({ ...settings, winner: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white p-1 rounded"
                    />
                  </div>
                  <div>
                    <label>Empate (Ñ Exato)</label>
                    <input
                      type="number"
                      min="0"
                      value={settings.draw}
                      onChange={e => setSettings({ ...settings, draw: e.target.value === '' ? '' : parseInt(e.target.value) })}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white p-1 rounded"
                    />
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
        </div>
      )}
    </div>
  );
};