import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { Settings, Shield, Database, ArrowLeft, Users, Bell, RefreshCw, Send, AlertTriangle } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addNotification } = useStore();
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number, total: number } | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  const handleTestPush = async () => {
    setTestPushLoading(true);
    try {
      const data = await api.admin.testPush();

      if (data.success) {
        addNotification('Sucesso', data.message, 'success');
      } else {
        const errorMsg = data.message || data.error || "Erro desconhecido no servidor.";
        const fullMsg = data.details ? `${errorMsg} - ${data.details}` : errorMsg;
        addNotification('Erro no Servidor', fullMsg, 'warning');
      }
    } catch (e: any) {
      console.error("Test Push Error:", e);
      addNotification('Erro de Conexão', e.message || 'Não foi possível contatar o servidor. Verifique sua rede.', 'warning');
    } finally {
      setTestPushLoading(false);
    }
  };

  const handleBroadcastPush = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      addNotification('Campos obrigatórios', 'Preencha o título e a mensagem para enviar o broadcast.', 'warning');
      return;
    }

    if (!window.confirm(`🚨 ATENÇÃO: Você está prestes a enviar uma notificação Push para TODOS os usuários ativos do sistema.\n\nTítulo: ${broadcastTitle}\n\nTem certeza absoluta?`)) {
      return;
    }

    setBroadcastLoading(true);
    setBroadcastProgress({ current: 0, total: 0 });
    
    try {
      // 1. Obter todos os tokens
      const tokenData = await api.admin.broadcastPush({ action: 'get_tokens' });
      
      if (!tokenData.success || !tokenData.tokens) {
        addNotification('Erro', tokenData.message || tokenData.error || 'Erro ao buscar dispositivos.', 'warning');
        setBroadcastLoading(false);
        setBroadcastProgress(null);
        return;
      }
      
      const tokens: string[] = tokenData.tokens;
      if (tokens.length === 0) {
        addNotification('Aviso', 'Nenhum dispositivo encontrado.', 'info');
        setBroadcastLoading(false);
        setBroadcastProgress(null);
        return;
      }

      setBroadcastProgress({ current: 0, total: tokens.length });
      
      // 2. Disparar em lotes de 500 (Agora enviado para a Edge Function que aguenta milhares)
      const CHUNK_SIZE = 500;
      let sentCount = 0;
      
      for (let i = 0; i < tokens.length; i += CHUNK_SIZE) {
        const chunk = tokens.slice(i, i + CHUNK_SIZE);
        
        const chunkData = await api.admin.broadcastPush({ 
          action: 'send_chunk', 
          title: broadcastTitle, 
          message: broadcastMessage, 
          tokens: chunk 
        });
        
        if (!chunkData.success) {
          console.error('Falha no envio de um lote:', chunkData);
        }
        
        sentCount += chunk.length;
        setBroadcastProgress({ current: sentCount, total: tokens.length });
      }

      addNotification('Broadcast Concluído', `Mensagem disparada para ${tokens.length} dispositivos.`, 'success');
      setBroadcastTitle('');
      setBroadcastMessage('');
      
    } catch (e: any) {
      console.error("Broadcast Push Error:", e);
      addNotification('Erro de Conexão', e.message || 'Não foi possível contatar o servidor.', 'warning');
    } finally {
      setBroadcastLoading(false);
      setTimeout(() => setBroadcastProgress(null), 3000);
    }
  };

  // If not admin and not match admin, redirect
  if (!currentUser?.isAdmin && !currentUser?.isMatchAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300">
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

      <div className="text-center md:text-left border-b border-gray-200 dark:border-gray-700 pb-6">
        <h1 className="text-3xl md:text-4xl font-black text-gray-800 dark:text-white flex items-center justify-center md:justify-start gap-3">
          <Settings size={32} className="text-brasil-blue dark:text-blue-400" />
          Painel do Criador
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-lg">Selecione uma área para gerenciar o sistema.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">

        {/* Card: Ligas */}
        {currentUser?.isAdmin && (
        <button
          id="admin-leagues-btn"
          onClick={() => navigate('/admin/leagues')}
          className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-700 dark:hover:border-blue-500 transition-all hover:shadow-xl text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Users size={120} className="text-blue-700 dark:text-blue-400" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-700 dark:group-hover:bg-blue-600 transition-colors">
              <Users size={32} className="text-blue-700 dark:text-blue-400 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Gerenciar Ligas</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Controle o status de ligas Padrão (Gratuito vs Ilimitado), visualize participantes e monitore a criação de grupos.
            </p>
            <div className="mt-6 flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold group-hover:underline">
              Acessar painel <ArrowLeft size={16} className="rotate-180" />
            </div>
          </div>
        </button>
        )}

        {/* Card: Modo BR */}
        {currentUser?.isAdmin && (
        <button
          id="admin-brazil-leagues-btn"
          onClick={() => navigate('/admin/brazil-leagues')}
          className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-brasil-blue dark:hover:border-blue-500 transition-all hover:shadow-xl text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Shield size={120} className="text-brasil-blue dark:text-blue-400" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brasil-blue dark:group-hover:bg-blue-600 transition-colors">
              <Shield size={32} className="text-brasil-blue dark:text-blue-400 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Gerenciar Modo BR</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Controle o status de ligas do modo Jogos do Brasil (Gratuito vs Ilimitado) e gerencie participantes.
            </p>
            <div className="mt-6 flex items-center gap-2 text-brasil-blue dark:text-blue-400 font-bold group-hover:underline">
              Acessar painel <ArrowLeft size={16} className="rotate-180" />
            </div>
          </div>
        </button>
        )}

        {/* Card: Jogos */}
        <button
          id="admin-matches-btn"
          onClick={() => navigate('/admin/matches')}
          className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-brasil-green dark:hover:border-green-500 transition-all hover:shadow-xl text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Database size={120} className="text-brasil-green dark:text-green-400" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-green-50 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brasil-green dark:group-hover:bg-green-600 transition-colors">
              <Database size={32} className="text-brasil-green dark:text-green-400 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Gerenciar Jogos</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Edite placares, datas e horários. Utilize a ferramenta de Simulação de Tempo e sincronize dados.
            </p>
            <div className="mt-6 flex items-center gap-2 text-brasil-green dark:text-green-400 font-bold group-hover:underline">
              Acessar painel <ArrowLeft size={16} className="rotate-180" />
            </div>
          </div>
        </button>

        {/* Card: Test Push */}
        {currentUser?.isAdmin && (
        <button
          id="admin-test-push-btn"
          disabled={testPushLoading}
          onClick={handleTestPush}
          className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-yellow-500 transition-all hover:shadow-xl text-left overflow-hidden disabled:opacity-50"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Bell size={120} className="text-yellow-500 dark:text-yellow-400" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-yellow-500 transition-colors">
              <Bell size={32} className="text-yellow-600 dark:text-yellow-400 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Testar Push</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Envia uma notificação de teste para você mesmo. Útil para verificar se as chaves do Firebase estão corretas no servidor.
            </p>
            <div className="mt-6 flex items-center gap-2 text-yellow-600 dark:text-yellow-400 font-bold">
              {testPushLoading ? 'Enviando...' : 'Enviar teste agora'} <ArrowLeft size={16} className="rotate-180" />
            </div>
          </div>
        </button>
        )}

      </div>

      {/* Seção Broadcast (Somente Super Admin) */}
      {currentUser?.isAdmin && (
        <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/50 flex items-center gap-3">
            <div className="bg-red-100 dark:bg-red-800/50 p-2 rounded-lg">
              <AlertTriangle size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Disparo Global (Broadcast)</h2>
              <p className="text-red-600 dark:text-red-400 text-sm font-medium">Envia uma notificação Push para TODOS os usuários ativos.</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Título da Notificação</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="Ex: Novo Jogo Adicionado!"
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brasil-blue outline-none text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Mensagem</label>
              <textarea
                value={broadcastMessage}
                onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="Digite a mensagem que aparecerá na tela do usuário..."
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brasil-blue outline-none text-gray-800 dark:text-white resize-none"
              />
            </div>
            <button
              onClick={handleBroadcastPush}
              disabled={broadcastLoading || !broadcastTitle.trim() || !broadcastMessage.trim()}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <div className="flex items-center gap-2 uppercase tracking-wide">
                <Send size={18} />
                {broadcastLoading ? 'Processando Lotes...' : 'Disparar para todos os usuários'}
              </div>
              {broadcastProgress && (
                <div className="mt-2 text-xs font-semibold bg-black/20 px-3 py-1 rounded-full">
                  Enviando: {Math.min(broadcastProgress.current, broadcastProgress.total)} / {broadcastProgress.total}
                </div>
              )}
            </button>
          </div>
        </div>
      )}

    </div >
  );
};