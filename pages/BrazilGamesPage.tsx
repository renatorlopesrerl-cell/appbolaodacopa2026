import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../App';
import { Plus, Lock, Globe, ArrowRight, Search, ArrowLeft, Upload, Camera, Trophy, Loader2, X, Info } from 'lucide-react';
import { processImageForUpload } from '../services/dataService';
import { OptimizedImage } from '../components/OptimizedImage';

export const BrazilGamesPage: React.FC = () => {
  const navigate = useNavigate();
  const { brazilLeagues, currentUser, createBrazilLeague, joinBrazilLeague, loading, users } = useStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueDescription, setNewLeagueDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [leagueImage, setLeagueImage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  const [settings, setSettings] = useState({
    exactScore: 10,
    winnerAndDiff: 7,
    winnerAndWinnerGoals: 6,
    draw: 6,
    winner: 5,
    goalscorer: 2,
    plan: 'FREE' as any,
    isUnlimited: false
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
  }

  if (!currentUser) return <Navigate to="/" replace />;

  const resetForm = () => {
    setNewLeagueName('');
    setNewLeagueDescription('');
    setLeagueImage('');
    setIsPrivate(true);
    setSettings({
      exactScore: 10,
      winnerAndDiff: 7,
      winnerAndWinnerGoals: 6,
      draw: 6,
      winner: 5,
      goalscorer: 2,
      plan: 'FREE' as any,
      isUnlimited: false
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Verificar se já existe uma liga com o mesmo nome
    const nameExists = brazilLeagues.some(l => l.name.trim().toLowerCase() === newLeagueName.trim().toLowerCase());
    if (nameExists) {
      alert("Já existe uma liga com este nome. Por favor, escolha outro.");
      return;
    }

    setIsCreating(true);
    try {
      const success = await createBrazilLeague(newLeagueName, isPrivate, leagueImage, newLeagueDescription, settings);
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

  const myLeagues = brazilLeagues.filter(l => l.participants.includes(currentUser.id));
  const otherLeagues = brazilLeagues.filter(l => !l.participants.includes(currentUser.id));

  const filterFn = (l: any) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.leagueCode && l.leagueCode.toLowerCase().includes(searchTerm.toLowerCase()));

  const sortedMyLeagues = myLeagues.sort((a, b) => {
    const aIsAdmin = a.adminId === currentUser.id;
    const bIsAdmin = b.adminId === currentUser.id;
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return a.name.localeCompare(b.name);
  });

  const filteredOtherLeagues = otherLeagues
    .filter(l => {
      if (l.isPrivate) {
        return searchTerm.length > 0 && l.leagueCode && l.leagueCode.toLowerCase() === searchTerm.toLowerCase();
      }
      return filterFn(l);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <span className="text-3xl">🇧🇷</span>
          Jogos do Brasil
        </h1>

        <button
          id="create-brazil-league-btn"
          onClick={() => setShowCreateModal(true)}
          className="bg-brasil-yellow text-brasil-blue px-4 py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-yellow-300 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus size={20} />
          Criar Liga
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm text-green-800 dark:text-green-200 flex items-start gap-3">
        <Info size={20} className="mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <strong>Modo BR (Jogos do Brasil):</strong> Neste modo você palpita <strong>todos os jogos do Brasil</strong> e escolhe 1 jogador em cada partida que pode marcar gol.
          <br />
        </div>
      </div>

      {/* My Leagues */}
      <section>
        <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-3">Minhas Ligas (Jogos do Brasil)</h2>
        {sortedMyLeagues.length === 0 ? (
          <p className="text-gray-500 italic">Você ainda não participa de nenhuma liga de Jogos do Brasil.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sortedMyLeagues.map(l => {
              const validPendingCount = l.pendingRequests.filter(uid => users.some(u => u.id === uid)).length;
              return (
                <Link to={`/brazil-league/${l.id}`} key={l.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-brasil-green dark:hover:border-green-500 transition-all group relative overflow-hidden">
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
                        <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-2xl">
                          🇧🇷
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-100 group-hover:text-brasil-green dark:group-hover:text-green-400 transition-colors flex items-center gap-2">
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
                    <ArrowRight className="text-gray-300 dark:text-gray-600 group-hover:text-brasil-green dark:group-hover:text-green-400 mt-2" />
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
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm text-blue-700 dark:text-blue-300">
          <Info size={16} className="mt-0.5 flex-shrink-0" />
          <span>Para encontrar ligas <strong>PRIVADAS</strong> digite o <strong>CÓDIGO DA LIGA</strong> no campo abaixo.</span>
        </div>
        <div className="relative w-full mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            id="brazil-leagues-search"
            type="text"
            className="block w-full pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 placeholder-gray-400 focus:outline-none focus:placeholder-gray-300 focus:ring-1 focus:ring-brasil-green focus:border-brasil-green sm:text-sm transition-all shadow-sm text-gray-800 dark:text-white select-text"
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
                      <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-2xl">
                        🇧🇷
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
                      id={`join-brazil-league-${l.id}`}
                      onClick={() => joinBrazilLeague(l.id)}
                      className="text-sm font-bold text-brasil-green dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
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
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white flex items-center gap-2">🇧🇷 Criar Liga - Jogos do Brasil</h2>
            <form onSubmit={handleCreate} className="space-y-4">

              {/* Image Upload */}
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
                  className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-brasil-green dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-gray-700 transition-all relative group overflow-hidden bg-gray-50 dark:bg-gray-700"
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
                      <Loader2 className="animate-spin text-brasil-green" size={24} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload className="text-white" size={20} />
                  </div>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  {imageProcessing ? 'Processando...' : 'Qualquer tamanho (Otimização Automática)'}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Liga</label>
                <input id="brazil-league-name" required value={newLeagueName} onChange={e => setNewLeagueName(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg p-2 focus:ring-2 focus:ring-brasil-green outline-none" placeholder="Ex: Torcida Brasileira" />
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
                <input type="checkbox" id="brazil-private" checked={isPrivate} onChange={e => setIsPrivate(e.target.checked)} className="rounded text-brasil-green focus:ring-brasil-green" />
                <label htmlFor="brazil-private" className="text-sm text-gray-700 dark:text-gray-300 select-none cursor-pointer">Liga Privada (Requer aprovação)</label>
              </div>

              {/* Configurable Scoring Display */}
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-3 border border-green-200 dark:border-green-800">
                <p className="text-sm font-bold text-green-800 dark:text-green-300 flex items-center gap-2">
                  <Trophy size={16} /> Configuração de Pontuação
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Placar Exato</span>
                    <input type="number" min="0" value={settings.exactScore} onChange={e => setSettings({ ...settings, exactScore: parseInt(e.target.value) || 0 })} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-green outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Vencedor + Saldo</span>
                      <span className="text-[10px] text-gray-400">Acertou time vencedor e saldo de gols</span>
                    </div>
                    <input type="number" min="0" value={settings.winnerAndDiff} onChange={e => setSettings({ ...settings, winnerAndDiff: parseInt(e.target.value) || 0 })} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-green outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Vencedor + Gols do Vencedor</span>
                      <span className="text-[10px] text-gray-400">Acertou quem vence e gols do vencedor</span>
                    </div>
                    <input type="number" min="0" value={settings.winnerAndWinnerGoals} onChange={e => setSettings({ ...settings, winnerAndWinnerGoals: parseInt(e.target.value) || 0 })} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-green outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Empate (Não Exato)</span>
                      <span className="text-[10px] text-gray-400">Acertou que seria empate (ex: 1x1 e foi 2x2)</span>
                    </div>
                    <input type="number" min="0" value={settings.draw} onChange={e => setSettings({ ...settings, draw: parseInt(e.target.value) || 0 })} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-green outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800/50 shadow-sm">
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Apenas Vencedor</span>
                    <input type="number" min="0" value={settings.winner} onChange={e => setSettings({ ...settings, winner: parseInt(e.target.value) || 0 })} className="w-16 p-1 text-center border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white font-bold focus:ring-1 focus:ring-brasil-green outline-none" />
                  </div>
                  <div className="flex justify-between items-center bg-yellow-50 dark:bg-yellow-900/20 px-3 py-2 rounded-lg border border-yellow-200 dark:border-yellow-800 shadow-sm">
                    <div className="flex flex-col">
                      <span className="text-sm text-yellow-800 dark:text-yellow-400 font-bold">⚽ Jogador Escolhido Faz Gol</span>
                      <span className="text-[10px] text-yellow-600 dark:text-yellow-500">A prtir do 2º gol na partida, soma +1 pt por gol extra.</span>
                    </div>
                    <input type="number" min="0" value={settings.goalscorer} onChange={e => setSettings({ ...settings, goalscorer: parseInt(e.target.value) || 0 })} className="w-16 p-1 text-center border border-yellow-300 rounded bg-white dark:bg-gray-700 text-yellow-800 dark:text-yellow-400 font-bold focus:ring-1 focus:ring-yellow-400 outline-none" />
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
                  id="create-brazil-league-submit"
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
    </div>
  );
};
