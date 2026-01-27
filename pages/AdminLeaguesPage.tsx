import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { Shield, Crown, Search, ArrowLeft, Star, StarHalf, Infinity as InfinityIcon, Users } from 'lucide-react';
import { LeaguePlan } from '../types';

export const AdminLeaguesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, users, leagues, updateLeague } = useStore();
  const [leagueSearch, setLeagueSearch] = useState('');
  
  const [toast, setToast] = useState<string | null>(null);

  if (!currentUser?.isAdmin) {
    return <Navigate to="/" />;
  }

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const cycleLeaguePlan = async (leagueId: string, currentPlan: LeaguePlan) => {
      const league = leagues.find(l => l.id === leagueId);
      if (!league) return;

      // Cycle: FREE -> VIP_BASIC -> VIP -> VIP_MASTER -> VIP_UNLIMITED -> FREE
      let nextPlan: LeaguePlan = 'FREE';
      let isUnlimited = false;

      if (currentPlan === 'FREE') {
          nextPlan = 'VIP_BASIC';
      } else if (currentPlan === 'VIP_BASIC') {
          nextPlan = 'VIP';
      } else if (currentPlan === 'VIP') {
          nextPlan = 'VIP_MASTER';
      } else if (currentPlan === 'VIP_MASTER') {
          nextPlan = 'VIP_UNLIMITED';
          isUnlimited = true;
      } else {
          nextPlan = 'FREE';
      }

      // Ensure isUnlimited flag is only true for VIP_UNLIMITED to maintain backward compatibility logic
      if (nextPlan !== 'VIP_UNLIMITED') isUnlimited = false;

      const newSettings = { ...league.settings, plan: nextPlan, isUnlimited };
      
      await updateLeague(leagueId, { settings: newSettings });
      showToast(`Plano alterado para: ${nextPlan.replace('_', ' ')}`);
  };

  const filteredLeagues = leagues.filter(l => 
    l.name.toLowerCase().includes(leagueSearch.toLowerCase()) || 
    (l.leagueCode && l.leagueCode.toLowerCase().includes(leagueSearch.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-20">
      {toast && (
        <div className="fixed top-24 right-4 z-[100] bg-green-600 text-white px-6 py-3 rounded-lg shadow-xl animate-[slideIn_0.3s_ease-out] font-bold">
          {toast}
        </div>
      )}

      <div className="mb-6">
         <button 
           onClick={() => navigate('/admin')}
           className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group mb-4"
         >
           <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
             <ArrowLeft size={18} />
           </div>
           Voltar ao Painel
         </button>

         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <span className="bg-brasil-yellow text-brasil-blue p-2 rounded-lg"><Shield size={24} /></span>
                Gerenciamento de Ligas
            </h1>
            
            <div className="relative w-full md:w-64">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou código..." 
                    value={leagueSearch}
                    onChange={(e) => setLeagueSearch(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue"
                />
            </div>
         </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto">
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase text-xs sticky top-0 z-10 border-b border-gray-200 dark:border-gray-600">
                    <tr>
                        <th className="px-4 py-3">Nome da Liga</th>
                        <th className="px-4 py-3">Código</th>
                        <th className="px-4 py-3">Admin</th>
                        <th className="px-4 py-3 text-center">Part.</th>
                        <th className="px-4 py-3 text-center">Plano</th>
                        <th className="px-4 py-3 text-right">Mudar Plano</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredLeagues.map(l => {
                        const plan = l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
                        const adminUser = users.find(u => u.id === l.adminId);
                        
                        return (
                            <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{l.name}</td>
                                <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{l.leagueCode || '-'}</td>
                                <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{adminUser?.name || 'Unknown'}</td>
                                <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-100">{l.participants.length}</td>
                                <td className="px-4 py-3 text-center">
                                    {plan === 'VIP_UNLIMITED' ? (
                                        <span className="bg-gray-900 text-yellow-400 border-yellow-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                            <InfinityIcon size={12} strokeWidth={3} /> ILIMITADO
                                        </span>
                                    ) : plan === 'VIP_MASTER' ? (
                                        <span className="bg-gray-900 text-green-400 border-green-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                            <Crown size={12} fill="currentColor" /> MASTER
                                        </span>
                                    ) : plan === 'VIP' ? (
                                        <span className="bg-gray-900 text-blue-400 border-blue-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                            <Star size={12} fill="currentColor" /> TOP
                                        </span>
                                    ) : plan === 'VIP_BASIC' ? (
                                        <span className="bg-gray-900 text-gray-300 border-gray-700 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                            <StarHalf size={12} fill="currentColor" /> BÁSICO
                                        </span>
                                    ) : (
                                        <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-xs font-bold border inline-flex items-center gap-1">
                                            GRÁTIS
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 text-right flex justify-end gap-2">
                                    <button 
                                        onClick={() => cycleLeaguePlan(l.id, plan)}
                                        className="px-3 py-1.5 rounded text-xs font-bold transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                                        title="Alternar: FREE -> BÁSICO -> TOP -> MASTER -> ILIMITADO -> FREE"
                                    >
                                        Alternar
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                    {filteredLeagues.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-400 italic">Nenhuma liga encontrada.</td>
                        </tr>
                    )}
                </tbody>
             </table>
          </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredLeagues.map(l => {
            const plan = l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
            const adminUser = users.find(u => u.id === l.adminId);
            
            return (
                <div key={l.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden">
                    {/* Status Stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                        plan === 'VIP_UNLIMITED' ? 'bg-yellow-400' : 
                        plan === 'VIP_MASTER' ? 'bg-green-400' :
                        plan === 'VIP' ? 'bg-blue-400' :
                        plan === 'VIP_BASIC' ? 'bg-gray-400' : 'bg-gray-200 dark:bg-gray-600'
                    }`}></div>

                    <div className="flex justify-between items-start pl-3">
                        <div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{l.name}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                <Users size={12} /> Admin: <span className="font-medium text-gray-700 dark:text-gray-300">{adminUser?.name || 'Desconhecido'}</span>
                            </p>
                        </div>
                        <div className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                            {l.leagueCode || '-'}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pl-3 border-t border-gray-100 dark:border-gray-700 pt-3">
                        <div className="flex flex-col">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Participantes</span>
                             <span className="text-lg font-black text-gray-800 dark:text-white">{l.participants.length}</span>
                        </div>
                        
                        <div className="flex flex-col items-end">
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Plano Atual</span>
                             {plan === 'VIP_UNLIMITED' ? (
                                <span className="bg-gray-900 text-yellow-400 border-yellow-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                    <InfinityIcon size={12} strokeWidth={3} /> ILIMITADO
                                </span>
                            ) : plan === 'VIP_MASTER' ? (
                                <span className="bg-gray-900 text-green-400 border-green-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                    <Crown size={12} fill="currentColor" /> MASTER
                                </span>
                            ) : plan === 'VIP' ? (
                                <span className="bg-gray-900 text-blue-400 border-blue-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                    <Star size={12} fill="currentColor" /> TOP
                                </span>
                            ) : plan === 'VIP_BASIC' ? (
                                <span className="bg-gray-900 text-gray-300 border-gray-700 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                                    <StarHalf size={12} fill="currentColor" /> BÁSICO
                                </span>
                            ) : (
                                <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-xs font-bold border inline-flex items-center gap-1">
                                    GRÁTIS
                                </span>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={() => cycleLeaguePlan(l.id, plan)}
                        className="ml-3 mt-1 py-2.5 rounded-lg font-bold text-xs transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 uppercase tracking-wide"
                    >
                        Alternar Plano
                    </button>
                </div>
            );
        })}
        {filteredLeagues.length === 0 && (
            <div className="text-center py-8 text-gray-400 italic">Nenhuma liga encontrada.</div>
        )}
      </div>
    </div>
  );
};