import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useStore } from '../App';
import { User as UserIcon, Save, Camera, Upload, AlertCircle, ArrowLeft, Phone, Loader2, Bell, PlayCircle, Flag, Sun, Moon, Clock, Trash2, Lock } from 'lucide-react';
import { processImageForUpload } from '../services/dataService';

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateUserProfile, deleteAccount, loading: globalLoading, theme: globalTheme, logout } = useStore();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Notification State
  const [notifyStart, setNotifyStart] = useState(true);
  const [notifyEnd, setNotifyEnd] = useState(true);
  const [notifyPrediction, setNotifyPrediction] = useState(true);

  // Theme State
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setAvatar(currentUser.avatar);
      setWhatsapp(currentUser.whatsapp || '');
      // Set notifications from user settings (default true if undefined)
      setNotifyStart(currentUser.notificationSettings?.matchStart ?? true);
      setNotifyEnd(currentUser.notificationSettings?.matchEnd ?? true);
      setNotifyPrediction(currentUser.notificationSettings?.predictionReminder ?? true);
      // Set theme from user preference or fallback to global/current
      setSelectedTheme(currentUser.theme || globalTheme);
    }
  }, [currentUser, globalTheme]);

  if (globalLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
  }

  // Guaranteed by ProtectedRoute
  if (!currentUser) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('O nome não pode estar vazio.');
      return;
    }
    if (!avatar.trim()) {
      setError('A foto é obrigatória. Por favor, faça o upload de uma imagem.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateUserProfile(
        name,
        avatar,
        whatsapp,
        currentUser.pix || '',
        { matchStart: notifyStart, matchEnd: notifyEnd, predictionReminder: notifyPrediction }, // Pass notification settings
        selectedTheme // Pass theme preference
      );
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate type
      if (!file.type.startsWith('image/')) {
        setError("Por favor, selecione um arquivo de imagem válido.");
        return;
      }

      try {
        setImageProcessing(true);
        const compressedImage = await processImageForUpload(file);
        setAvatar(compressedImage);
        setError('');
      } catch (err) {
        console.error(err);
        setError('Erro ao processar imagem. Tente outra.');
      } finally {
        setImageProcessing(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
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

      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-brasil-blue text-white rounded-lg">
          <UserIcon size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Meu Perfil</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Banner Decoration */}
        <div className="h-32 bg-gradient-to-r from-brasil-green to-brasil-blue"></div>

        <div className="px-8 pb-8">
          {/* Avatar Preview & Upload Trigger */}
          <div className="relative -mt-12 mb-6 flex justify-center sm:justify-start">
            <div
              className="relative group cursor-pointer"
              onClick={triggerFileInput}
              title="Alterar foto"
            >
              <img
                src={avatar || 'https://via.placeholder.com/150'}
                alt="Avatar"
                className={`w-24 h-24 rounded-full border-4 border-white dark:border-gray-800 shadow-lg object-cover bg-gray-200 dark:bg-gray-700 group-hover:brightness-75 transition-all ${imageProcessing ? 'opacity-50' : ''}`}
                onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/150?text=Error'; }}
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <Camera className="text-white drop-shadow-md" size={32} />
              </div>
              {imageProcessing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/20">
                  <Loader2 className="animate-spin text-white" size={32} />
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-brasil-yellow text-brasil-blue p-1.5 rounded-full shadow-sm border-2 border-white dark:border-gray-800 group-hover:scale-110 transition-transform">
                <Camera size={14} />
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-3 rounded-lg text-sm flex items-center gap-2 animate-pulse border border-red-100 dark:border-red-800">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {/* Basic Info */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Apelido (Nome Exibido)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all text-white placeholder-gray-400"
                placeholder="Seu nome ou apelido"
              />
              <p className="text-xs text-gray-400 mt-1">Este nome aparecerá nas tabelas de classificação.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Foto de Perfil</label>

              {/* File Upload Option */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={triggerFileInput}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-brasil-blue dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all group"
              >
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full mb-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-900 transition-colors">
                  <Upload className="text-brasil-blue dark:text-blue-300" size={24} />
                </div>
                <p className="text-sm font-bold text-gray-600 dark:text-gray-300 group-hover:text-brasil-blue dark:group-hover:text-blue-300">Clique para fazer upload da foto</p>
                <p className="text-xs text-gray-400 mt-1">
                  {imageProcessing ? 'Processando imagem...' : 'Qualquer tamanho (Otimização Automática)'}
                </p>
              </div>
            </div>

            {/* WhatsApp Field */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                <Phone size={14} /> WhatsApp
              </label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full border border-gray-600 bg-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue outline-none transition-all text-white placeholder-gray-400"
                placeholder="(00) 00000-0000"
              />
            </div>

            {/* Theme Settings */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                {selectedTheme === 'dark' ? <Moon size={20} className="text-brasil-blue dark:text-blue-400" /> : <Sun size={20} className="text-brasil-blue dark:text-blue-400" />}
                Aparência e Tema
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedTheme('light')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${selectedTheme === 'light' ? 'border-brasil-blue bg-blue-50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}
                >
                  <Sun size={24} />
                  <span className="font-bold">Claro</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTheme('dark')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${selectedTheme === 'dark' ? 'border-brasil-blue bg-blue-50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-300' : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}
                >
                  <Moon size={24} />
                  <span className="font-bold">Escuro</span>
                </button>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Bell size={20} className="text-brasil-blue dark:text-blue-400" />
                Configurar Notificações
              </h3>

              <div className="space-y-4">
                {/* Match Start Toggle */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-700 dark:text-blue-300">
                      <PlayCircle size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Início de Jogo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Receber alerta quando a bola rolar.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyStart(!notifyStart)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brasil-blue ${notifyStart ? 'bg-brasil-green' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${notifyStart ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Match End Toggle */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg text-green-700 dark:text-green-300">
                      <Flag size={20} />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">Fim de Jogo</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Receber alerta com o placar final.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyEnd(!notifyEnd)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brasil-blue ${notifyEnd ? 'bg-brasil-green' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${notifyEnd ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                {/* Prediction Reminder Toggle (30 min before) */}
                <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                    <div className="bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-lg text-yellow-700 dark:text-yellow-300 flex-shrink-0">
                      <Clock size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm truncate">Lembrete de Palpite</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate md:whitespace-normal md:overflow-visible">Receber alerta 30 min antes do jogo.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNotifyPrediction(!notifyPrediction)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brasil-blue flex-shrink-0 ${notifyPrediction ? 'bg-brasil-green' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${notifyPrediction ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-4">
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || imageProcessing}
                  className="bg-brasil-green text-white px-6 py-2.5 rounded-lg font-bold shadow-sm hover:bg-green-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>

              {/* Privacy Policy Toggle */}
              <div className="flex justify-center mt-4">
                <button
                  type="button"
                  onClick={() => setShowPrivacy(!showPrivacy)}
                  className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-brasil-blue dark:hover:text-blue-400 underline transition-colors"
                >
                  Política de Privacidade
                </button>
              </div>

              {/* Privacy Policy Content */}
              {showPrivacy && (
                <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Política de Privacidade</h3>
                  <p>Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações dos usuários do aplicativo Simulador e Gerenciador de Palpites da Copa do Mundo 2026. Ao utilizar o aplicativo, você concorda com as práticas descritas nesta política.</p>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">1. Coleta de Informações</h4>
                  <p>Podemos coletar as seguintes informações:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Dados de cadastro (como nome, e-mail e imagem de perfil)</li>
                    <li>Informações necessárias para criação e participação em ligas</li>
                    <li>Palpites, simulações e preferências do usuário</li>
                    <li>Dados técnicos, como tipo de dispositivo, navegador e endereço IP (de forma anonimizada)</li>
                  </ul>
                  <p>Não coletamos dados sensíveis além do necessário para o funcionamento do aplicativo.</p>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">2. Uso das Informações</h4>
                  <p>As informações coletadas são utilizadas para:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Permitir o funcionamento das ligas e simulador</li>
                    <li>Identificar usuários e autenticar acessos</li>
                    <li>Salvar palpites, simulações e classificações</li>
                    <li>Melhorar a experiência do usuário</li>
                    <li>Garantir segurança e prevenção de uso indevido</li>
                  </ul>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">3. Armazenamento e Segurança</h4>
                  <p>As informações são armazenadas em servidores seguros e protegidas por medidas técnicas e organizacionais adequadas para evitar acesso não autorizado, perda, alteração ou divulgação indevida.</p>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">4. Compartilhamento de Informações</h4>
                  <p>Não vendemos, alugamos ou compartilhamos informações pessoais com terceiros, exceto:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Quando exigido por obrigação legal</li>
                    <li>Para cumprir ordens judiciais</li>
                    <li>Para proteger nossos direitos, usuários ou a integridade da plataforma</li>
                  </ul>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">5. Responsabilidade sobre Ligas</h4>
                  <p>O aplicativo fornece apenas ferramentas para criação e gerenciamento de ligas privadas ou públicas. Quaisquer acordos, premiações ou combinações realizadas entre usuários ocorrem fora da plataforma e são de responsabilidade exclusiva dos participantes.</p>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">6. Alterações nesta Política</h4>
                  <p>Esta Política de Privacidade pode ser atualizada a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação nesta página.</p>

                  <h4 className="font-bold text-gray-900 dark:text-white mt-2">7. Contato</h4>
                  <p>Em caso de dúvidas ou solicitações relacionadas a esta Política de Privacidade, entre em contato pelo e-mail:</p>
                  <p className="font-bold text-brasil-blue dark:text-blue-400">📧 renatorlopes.rerl@gmail.com</p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Lock size={20} className="text-brasil-blue dark:text-blue-400" />
          Segurança
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          Deseja alterar sua senha atual? Clique no botão abaixo para ir para a página de redefinição.
        </p>
        <button
          onClick={() => navigate('/reset-password')}
          className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 border border-gray-200 dark:border-gray-600"
        >
          <Lock size={16} />
          Redefinir Senha
        </button>
      </div>

      {/* Delete Account Section */}
      <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl p-6">
        <h3 className="text-red-800 dark:text-red-400 font-bold mb-2 flex items-center gap-2">
          <Trash2 size={20} /> Excluir Conta
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4">
          Esta ação é irreversível. Todos os seus dados, palpites e participações em ligas serão permanentemente removidos.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-bold text-sm bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 px-4 py-2 rounded-lg transition-colors hover:shadow-md"
          >
            Quero excluir minha conta
          </button>
        ) : (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-800 animate-in fade-in slide-in-from-top-2">
            <p className="font-bold text-gray-800 dark:text-white mb-3">Tem certeza absoluta?</p>
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  setLoading(true);
                  const success = await deleteAccount();
                  if (!success) setLoading(false);
                }}
                disabled={loading}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : null}
                Sim, excluir tudo
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};