import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { api } from '../services/api';
import { ArrowLeft, Search, CheckCircle, XCircle, Loader2, Zap, Shield, Mail } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useStore();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [processing, setProcessing] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.isAdmin) {
            navigate('/');
            return;
        }
        loadUsers();
    }, [currentUser]);

    const loadUsers = async () => {
        setLoading(true);
        try {
            const data = await api.admin.listUsers();
            setUsers(data || []);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePro = async (userId: string, currentStatus: boolean) => {
        if (!window.confirm(`Deseja ${currentStatus ? 'remover' : 'adicionar'} o status PRO deste usuário?`)) return;

        setProcessing(userId);
        try {
            await api.admin.togglePro(userId, !currentStatus);
            // Optimistic update
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_pro: !currentStatus } : u));
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar status');
        } finally {
            setProcessing(null);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500">
            <div className="flex items-center gap-4 mb-4">
                <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={20} /> Voltar
                </button>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                    <UsersIcon /> Gerenciar Usuários
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome ou e-mail..."
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-500 transition-all font-medium text-gray-700 dark:text-white"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="animate-spin text-purple-600" size={48} />
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 text-xs uppercase text-gray-500 font-bold">
                                <tr>
                                    <th className="px-6 py-4">Usuário</th>
                                    <th className="px-6 py-4 text-center">Status PRO</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative">
                                                    <img src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=random`} className="w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
                                                    {user.is_admin && <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5" title="Admin"><Shield size={10} /></div>}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800 dark:text-white flex items-center gap-1">
                                                        {user.name}
                                                        {user.is_pro && <Zap size={14} className="text-yellow-400 fill-yellow-400" />}
                                                    </div>
                                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Mail size={10} /> {user.email || 'Sem e-mail'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.is_pro ? (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-black uppercase tracking-wide">
                                                    <Zap size={12} className="fill-yellow-600 dark:fill-yellow-400" /> PRO ATIVO
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wide">
                                                    GRATUITO
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleTogglePro(user.id, user.is_pro)}
                                                disabled={processing === user.id}
                                                className={`p-2 rounded-lg transition-all ${user.is_pro ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40' : 'bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40'}`}
                                                title={user.is_pro ? "Remover PRO" : "Tornar PRO"}
                                            >
                                                {processing === user.id ? (
                                                    <Loader2 size={20} className="animate-spin" />
                                                ) : user.is_pro ? (
                                                    <XCircle size={20} />
                                                ) : (
                                                    <CheckCircle size={20} />
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-gray-500 dark:text-gray-400 font-medium">
                                Nenhum usuário encontrado.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
);
