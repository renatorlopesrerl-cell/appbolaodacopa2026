import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { Settings, Shield, Database, ArrowLeft, Users, Bell, RefreshCw, Send, AlertTriangle } from 'lucide-react';

export const AdminPageBrasileirao: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addNotification } = useStore();
  const [testPushLoading, setTestPushLoading] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState<{ current: number, total: number } | null>(null);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderProgress, setReminderProgress] = useState<{ current: number, total: number } | null>(null);

  const [proEmails, setProEmails] = useState('');
  const [proLoading, setProLoading] = useState(false);

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

    if (!window.confirm(`🚨 ATENÇÃO: Você está prestes a enviar uma notificação Push em MASSA (via Tópico e Web).\n\nTítulo: ${broadcastTitle}\n\nTem certeza absoluta?`)) {
      return;
    }

    setBroadcastLoading(true);
    
    try {
      const result = await api.admin.sendMassPush({
        title: broadcastTitle,
        message: broadcastMessage,
        urlData: { url: '/leagues-brasileirao' }
      });

      if (result.success) {
        addNotification('Broadcast Concluído', `Mensagem disparada com sucesso!`, 'success');
        setBroadcastTitle('');
        setBroadcastMessage('');
      } else {
        addNotification('Aviso', 'Ocorreram erros parciais durante o disparo.', 'warning');
      }
    } catch (e: any) {
      console.error("Broadcast Push Error:", e);
      addNotification('Erro de Conexão', e.message || 'Não foi possível contatar o servidor.', 'warning');
    } finally {
      setBroadcastLoading(false);
    }
  };

  const handleReminderPush = async () => {
    if (!window.confirm(`🚨 Enviar Lembrete de Palpite Global em massa via Tópico?\n\nIsto será enviado agora.`)) {
      return;
    }

    setReminderLoading(true);
    
    try {
      const result = await api.admin.sendMassPush({
        title: "Lembrete de Palpite! ⏰",
        message: "Ainda dá tempo! Preencha seus palpites para os próximos jogos antes que eles comecem.",
        urlData: { url: '/leagues-brasileirao' },
        targetTopic: 'topic_prediction_reminder'
      });

      if (result.success) {
        addNotification('Lembretes Enviados', `Disparado globalmente via tópicos.`, 'success');
      } else {
        addNotification('Aviso', 'Ocorreram erros parciais durante o disparo.', 'warning');
      }
    } catch (e: any) {
      console.error("Reminder Push Error:", e);
      addNotification('Erro de Conexão', e.message || 'Não foi possível contatar o servidor.', 'warning');
    } finally {
      setReminderLoading(false);
    }
  };

  const handleGrantPro = async () => {
    if (!proEmails.trim()) {
      addNotification('Aviso', 'Insira pelo menos um e-mail.', 'warning');
      return;
    }

    const emailList = proEmails.split(/[\n,]+/).map(e => e.trim().toLowerCase()).filter(e => e.length > 0);
    
    if (emailList.length === 0) {
      return;
    }

    if (!window.confirm(`Você está prestes a conceder acesso PRO (6 meses) para ${emailList.length} usuário(s). Continuar?`)) {
      return;
    }

    setProLoading(true);

    try {
      const result = await api.admin.grantPro(emailList);

      if (result.success && result.count > 0) {
        if (result.missingEmails && result.missingEmails.length > 0) {
          addNotification('Aviso Parcial', `PRO concedido a ${result.count}. Falha (não encontrados): ${result.missingEmails.join(', ')}`, 'warning', 0);
        } else {
          addNotification('Sucesso', `Acesso PRO concedido para ${result.count} usuário(s).`, 'success');
        }
        setProEmails('');
      } else {
        addNotification('Aviso', `Nenhum usuário encontrado com esses e-mails: ${emailList.join(', ')}`, 'warning', 0);
      }

    } catch (error: any) {
      console.error("Erro ao conceder PRO:", error);
      addNotification('Erro', error.message || 'Ocorreu um erro ao atualizar os usuários.', 'warning');
    } finally {
      setProLoading(false);
    }
  };

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncLeague, setSyncLeague] = useState<string>('all');
  const [importCopaLoading, setImportCopaLoading] = useState(false);
  const [importCopaResult, setImportCopaResult] = useState<string | null>(null);

  const [importLibertadoresLoading, setImportLibertadoresLoading] = useState(false);
  const [importLibertadoresResult, setImportLibertadoresResult] = useState<string | null>(null);

  const [importSulamericanaLoading, setImportSulamericanaLoading] = useState(false);
  const [importSulamericanaResult, setImportSulamericanaResult] = useState<string | null>(null);

  const handleImportCopa = async () => {
    if (!window.confirm('⚠️ Isso vai buscar TODOS os jogos da Copa do Brasil na API e inserir/atualizar no banco. Continuar?')) return;
    setImportCopaLoading(true);
    setImportCopaResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('import-copa-do-brasil');
      if (error) throw error;
      const msg = data?.message || 'Importação concluída!';
      setImportCopaResult(msg);
      // M8: Invalidar cache diário dos usuários
      api.brasileiraoMatches.setLastUpdated().catch(() => {});
      addNotification('Sucesso', msg, 'success');
    } catch (e: any) {
      console.error('Import Copa error:', e);
      addNotification('Erro', e.message || 'Erro ao importar jogos.', 'warning');
    } finally {
      setImportCopaLoading(false);
    }
  };

  const handleImportLibertadores = async () => {
    if (!window.confirm('🚨 Isso vai buscar TODOS os jogos da Libertadores na API e inserir/atualizar no banco. Continuar?')) return;
    setImportLibertadoresLoading(true);
    setImportLibertadoresResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('import-libertadores');
      if (error) throw error;
      const msg = data?.message || 'Importação concluída!';
      setImportLibertadoresResult(msg);
      // M8: Invalidar cache diário dos usuários
      api.brasileiraoMatches.setLastUpdated().catch(() => {});
      addNotification('Sucesso', msg, 'success');
    } catch (e: any) {
      console.error('Import Libertadores error:', e);
      addNotification('Erro', e.message || 'Erro ao importar jogos.', 'warning');
    } finally {
      setImportLibertadoresLoading(false);
    }
  };

  const handleImportSulamericana = async () => {
    if (!window.confirm('⚠️ Isso vai buscar TODOS os jogos da Sul-Americana na API e inserir/atualizar no banco. Continuar?')) return;
    setImportSulamericanaLoading(true);
    setImportSulamericanaResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('import-sulamericana');
      if (error) throw error;
      const msg = data?.message || 'Importação concluída!';
      setImportSulamericanaResult(msg);
      // M8: Invalidar cache diário dos usuários
      api.brasileiraoMatches.setLastUpdated().catch(() => {});
      addNotification('Sucesso', msg, 'success');
    } catch (e: any) {
      console.error('Import Sul-Americana error:', e);
      addNotification('Erro', e.message || 'Erro ao importar jogos.', 'warning');
    } finally {
      setImportSulamericanaLoading(false);
    }
  };



  const handleSyncSchedule = async () => {
    let msg = '🚨 Deseja sincronizar todos os jogos das 4 competições (Brasileirão, Copa do Brasil, Libertadores e Sul-Americana) agora?';
    if (syncLeague !== 'all') {
      const names: Record<string, string> = {
        '71': 'Brasileirão',
        '73': 'Copa do Brasil',
        '13': 'Libertadores',
        '11': 'Sul-Americana'
      };
      msg = `🚨 Deseja sincronizar os jogos do(a) ${names[syncLeague]} agora?`;
    }

    if (!window.confirm(msg)) {
      return;
    }
    setSyncLoading(true);
    try {
      const payload = syncLeague !== 'all' ? { body: { league_id: syncLeague } } : undefined;
      const { data, error } = await supabase.functions.invoke('sync-brasileirao-schedule', payload);
      if (error) throw error;
      // M8: Invalidar cache diário dos usuários
      api.brasileiraoMatches.setLastUpdated().catch(() => {});
      addNotification('Sucesso', 'Jogos sincronizados com sucesso!', 'success');

    } catch (e: any) {
      console.error("Sync error:", e);
      addNotification('Erro', e.message || 'Erro ao sincronizar jogos.', 'warning');
    } finally {
      setSyncLoading(false);
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
          onClick={() => navigate('/brasileirao')}
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
          onClick={() => navigate('/admin-brasileirao/leagues')}
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



        {/* Card: Jogos */}
        <button
          id="admin-matches-btn"
          onClick={() => navigate('/admin-brasileirao/matches')}
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

        {/* Card: Sync Schedule */}
        {currentUser?.isAdmin && (
        <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 transition-all hover:shadow-xl text-left overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <RefreshCw size={120} className="text-blue-500 dark:text-blue-400" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div>
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                <RefreshCw size={32} className="text-blue-600 dark:text-blue-400 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Sincronizar Campeonatos</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-6">
                Atualize manualmente datas, horários e locais dos jogos. Escolha uma competição específica ou sincronize todas.
              </p>
            </div>
            
            <div className="mt-auto space-y-4">
              <select
                value={syncLeague}
                onChange={(e) => setSyncLeague(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-3 text-sm font-medium text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">Todas as Competições</option>
                <option value="71">Brasileirão</option>
                <option value="73">Copa do Brasil</option>
                <option value="13">Libertadores</option>
                <option value="11">Sul-Americana</option>
              </select>

              <button
                disabled={syncLoading}
                onClick={handleSyncSchedule}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {syncLoading ? (
                  <>Sincronizando...</>
                ) : (
                  <>Sincronizar Agora <ArrowLeft size={16} className="rotate-180" /></>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Card: Importar Copa do Brasil */}
        {currentUser?.isAdmin && (
        <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-yellow-500 transition-all hover:shadow-xl text-left overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Database size={120} className="text-yellow-500 dark:text-yellow-400" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div>
              <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-yellow-500 transition-colors">
                <Database size={32} className="text-yellow-600 dark:text-yellow-400 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Importar Copa do Brasil</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-4">
                Busca e insere <strong>novos jogos</strong> da Copa do Brasil direto da API (novas fases como Quartas, Semis e Final). Jogos existentes não são alterados.
              </p>
              {importCopaResult && (
                <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4 font-medium">
                  ✅ {importCopaResult}
                </p>
              )}
            </div>
            <div className="mt-auto">
              <button
                disabled={importCopaLoading}
                onClick={handleImportCopa}
                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {importCopaLoading ? (
                  <>Importando da API...</>
                ) : (
                  <>Importar Agora <ArrowLeft size={16} className="rotate-180" /></>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Card: Importar Libertadores */}
        {currentUser?.isAdmin && (
        <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-blue-500 transition-all hover:shadow-xl text-left overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Database size={120} className="text-blue-500 dark:text-blue-400" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div>
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-500 transition-colors">
                <Database size={32} className="text-blue-600 dark:text-blue-400 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Importar Libertadores</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-4">
                Busca e insere <strong>novos jogos</strong> da Libertadores direto da API (novas fases como Quartas, Semis e Final). Jogos existentes não são alterados.
              </p>
              {importLibertadoresResult && (
                <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4 font-medium">
                  ✅ {importLibertadoresResult}
                </p>
              )}
            </div>
            <div className="mt-auto space-y-3">
              <button
                disabled={importLibertadoresLoading}
                onClick={handleImportLibertadores}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {importLibertadoresLoading ? (
                  <>Importando da API...</>
                ) : (
                  <>Importar Agora <ArrowLeft size={16} className="rotate-180" /></>
                )}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Card: Importar Sul-Americana */}
        {currentUser?.isAdmin && (
        <div className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-pink-500 transition-all hover:shadow-xl text-left overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Database size={120} className="text-pink-500 dark:text-pink-400" />
          </div>

          <div className="relative z-10 flex flex-col h-full">
            <div>
              <div className="w-16 h-16 bg-pink-50 dark:bg-pink-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-pink-500 transition-colors">
                <Database size={32} className="text-pink-600 dark:text-pink-400 group-hover:text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Importar Sul-Americana</h2>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-4">
                Busca e insere <strong>novos jogos</strong> da Sul-Americana direto da API (novas fases como Quartas, Semis e Final). Jogos existentes não são alterados.
              </p>
              {importSulamericanaResult && (
                <p className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-4 font-medium">
                  ✅ {importSulamericanaResult}
                </p>
              )}
            </div>
            <div className="mt-auto">
              <button
                disabled={importSulamericanaLoading}
                onClick={handleImportSulamericana}
                className="w-full bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {importSulamericanaLoading ? (
                  <>Importando da API...</>
                ) : (
                  <>Importar Agora <ArrowLeft size={16} className="rotate-180" /></>
                )}
              </button>
            </div>
          </div>
        </div>
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
          
          <div className="p-6 bg-yellow-50 dark:bg-yellow-900/10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white mb-1">Lembrete de Palpites</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Envia o alerta apenas para usuários com a opção "Lembrete de Palpite" ativada.</p>
              </div>
              <button
                onClick={handleReminderPush}
                disabled={reminderLoading}
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 shadow-sm"
              >
                {reminderLoading ? 'Enviando...' : 'Enviar Lembrete'}
              </button>
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
                {broadcastLoading ? 'Processando...' : 'Disparar para todos os usuários'}
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Seção Conceder PRO Manualmente (Somente Super Admin) */}
      {currentUser?.isAdmin && (
        <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 px-6 py-4 border-b border-yellow-100 dark:border-yellow-900/50 flex items-center gap-3">
            <div className="bg-yellow-100 dark:bg-yellow-800/50 p-2 rounded-lg">
              <Shield size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Conceder Acesso PRO</h2>
              <p className="text-yellow-700 dark:text-yellow-500 text-sm font-medium">Ativa o plano PRO por 6 meses para usuários específicos.</p>
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">E-mails (Separados por vírgula ou linha)</label>
              <textarea
                value={proEmails}
                onChange={e => setProEmails(e.target.value)}
                placeholder="email1@teste.com&#10;email2@teste.com"
                rows={4}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-yellow-500 outline-none text-gray-800 dark:text-white resize-none"
              />
            </div>
            <div className="flex items-center gap-2 mb-4 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800/50 text-sm text-blue-700 dark:text-blue-300">
              <Shield size={16} />
              <span>A data de expiração será automaticamente configurada para <strong>6 meses</strong> a partir de hoje. Certifique-se que você tenha criado a coluna <code>pro_expires_at</code> do tipo Timestamp no Supabase.</span>
            </div>
            <button
              onClick={handleGrantPro}
              disabled={proLoading || !proEmails.trim()}
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-xl flex flex-col items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <div className="flex items-center gap-2 uppercase tracking-wide text-gray-900">
                <Shield size={18} fill="currentColor" />
                {proLoading ? 'Processando...' : 'Liberar PRO (6 Meses)'}
              </div>
            </button>
          </div>
        </div>
      )}

    </div >
  );
};