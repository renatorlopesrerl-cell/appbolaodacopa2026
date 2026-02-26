import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { Settings, Shield, Database, ArrowLeft, Users, Bell } from 'lucide-react';

export const AdminPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addNotification } = useStore();
  const [testPushLoading, setTestPushLoading] = useState(false);

  const handleTestPush = async () => {
    setTestPushLoading(true);
    try {
      const response = await fetch(`${window.location.origin}/api/admin/test-push`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('sb-sjianpqzozufnobftksp-auth-token') ? JSON.parse(localStorage.getItem('sb-sjianpqzozufnobftksp-auth-token')!).access_token : ''}`
        }
      });
      const data = await response.json();
      if (data.success) {
        addNotification('Sucesso', data.message, 'success');
      } else {
        addNotification('Erro no Servidor', data.message, 'warning');
      }
    } catch (e: any) {
      addNotification('Erro de Conexão', 'Não foi possível contatar o servidor das Cloudflare Functions.', 'warning');
    } finally {
      setTestPushLoading(false);
    }
  };

  // If not admin, redirect
  if (!currentUser?.isAdmin) {
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
        <button
          id="admin-leagues-btn"
          onClick={() => navigate('/admin/leagues')}
          className="group relative bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md border-2 border-transparent hover:border-brasil-blue dark:hover:border-blue-500 transition-all hover:shadow-xl text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 group-hover:scale-110 transition-all duration-500">
            <Shield size={120} className="text-brasil-blue dark:text-blue-400" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brasil-blue dark:group-hover:bg-blue-600 transition-colors">
              <Shield size={32} className="text-brasil-blue dark:text-blue-400 group-hover:text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Gerenciar Ligas</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
              Controle o status de ligas (Gratuito vs Ilimitado), visualize participantes e monitore a criação de grupos.
            </p>
            <div className="mt-6 flex items-center gap-2 text-brasil-blue dark:text-blue-400 font-bold group-hover:underline">
              Acessar painel <ArrowLeft size={16} className="rotate-180" />
            </div>
          </div>
        </button>

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



      </div>
    </div >
  );
};