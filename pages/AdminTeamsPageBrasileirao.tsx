import React, { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { api } from '../services/api';
import { ArrowLeft, Edit2, Save, X, Search, Shield, Database } from 'lucide-react';
import { BrasileiraoTeam } from '../types';

export const AdminTeamsPageBrasileirao: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, addNotification, brasileiraoTeams } = useStore();
  const [teams, setTeams] = useState<BrasileiraoTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await api.brasileiraoTeams.list();
      setTeams(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      console.error(e);
      addNotification('Erro', 'Não foi possível carregar os times.', 'warning');
      if (brasileiraoTeams && brasileiraoTeams.length > 0) {
        setTeams([...brasileiraoTeams].sort((a, b) => a.name.localeCompare(b.name)));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (team: BrasileiraoTeam) => {
    setEditingId(team.id);
    setEditName(team.name || '');
    setEditShortName(team.short_name || '');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditName('');
    setEditShortName('');
  };

  const handleSave = async (id: string | number) => {
    if (!editName.trim()) {
      addNotification('Aviso', 'O nome do time não pode ser vazio.', 'warning');
      return;
    }
    
    setSaving(true);
    try {
      await api.brasileiraoTeams.update(id, editName.trim(), editShortName.trim());
      addNotification('Sucesso', 'Time atualizado com sucesso.', 'success');
      
      // Forçar atualização global para todos os usuários através do timestamp de matches (força sync)
      try {
        await api.brasileiraoMatches.setLastUpdated();
        const today = new Date().toISOString().split('T')[0];
        localStorage.removeItem(`br_daily_teams_${today}`);
        localStorage.removeItem('cache_brasileirao_teams_v2');
      } catch (e) {}

      // Atualizar a lista localmente sem recarregar a página
      setTeams(prev => prev.map(t => 
        t.id === id ? { ...t, name: editName.trim(), short_name: editShortName.trim() } : t
      ).sort((a, b) => a.name.localeCompare(b.name)));

      // Limpar formulário
      setEditingId(null);
      setEditName('');
      setEditShortName('');
      
    } catch (e: any) {
      console.error("Erro ao salvar time:", e);
      addNotification('Erro', 'Ocorreu um erro ao atualizar o time.', 'warning');
    } finally {
      setSaving(false);
    }
  };

  // If not admin and not match admin, redirect
  if (!currentUser?.isAdmin && !currentUser?.isMatchAdmin) {
    return <Navigate to="/" />;
  }

  const filteredTeams = teams.filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 relative pb-20 animate-in fade-in zoom-in-95 duration-300">
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin-brasileirao')}
          className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group mb-4"
        >
          <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
            <ArrowLeft size={18} />
          </div>
          Voltar ao Painel
        </button>

        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <span className="bg-brasil-blue text-white p-2 rounded-lg"><Shield size={24} /></span>
          Gerenciamento de Times
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Edite os nomes dos times que aparecem no modo Brasileirão.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-lg md:text-xl font-bold text-gray-800 dark:text-white">Lista de Times</h2>
            <div className="relative w-full md:w-64">
              <input
                type="text"
                placeholder="Buscar time..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-brasil-blue focus:border-brasil-blue text-gray-800 dark:text-white transition-all"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            </div>
          </div>
        </div>

        <div className="relative w-full overflow-x-auto">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="w-8 h-8 border-2 border-brasil-blue border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase font-bold text-xs border-b border-gray-200 dark:border-gray-600">
                <tr>
                  <th className="px-4 py-3 w-16 text-center">ID / Escudo</th>
                  <th className="px-4 py-3">Nome do Time</th>
                  <th className="px-4 py-3 w-32 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTeams.map(team => (
                  <tr key={team.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <img 
                          src={`/img/teams/brasileirao/${team.id}.png`}
                          onError={(e) => { (e.target as HTMLImageElement).src = 'https://upload.wikimedia.org/wikipedia/commons/a/ac/No_image_available.svg'; }}
                          alt={team.name}
                          className="w-8 h-8 object-contain"
                        />
                        <span className="text-[10px] text-gray-400 font-mono">ID: {team.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                      {editingId === team.id ? (
                        <div className="flex flex-col gap-2">
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nome Completo</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full border border-brasil-blue bg-white dark:bg-gray-900 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brasil-blue text-gray-800 dark:text-white"
                            autoFocus
                            placeholder="Nome Completo"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(team.id);
                              if (e.key === 'Escape') handleCancel();
                            }}
                          />
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Nome Curto (Tabela/Cards)</label>
                          <input
                            type="text"
                            value={editShortName}
                            onChange={(e) => setEditShortName(e.target.value)}
                            className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-brasil-blue text-gray-800 dark:text-white"
                            placeholder="Nome Curto (ex: CAP, Vasco)"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSave(team.id);
                              if (e.key === 'Escape') handleCancel();
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col">
                          <span>{team.name}</span>
                          {team.short_name && <span className="text-xs text-gray-400 font-bold">Curto: {team.short_name}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingId === team.id ? (
                          <>
                            <button
                              onClick={() => handleSave(team.id)}
                              disabled={saving}
                              className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors disabled:opacity-50"
                              title="Salvar"
                            >
                              <Save size={16} />
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={saving}
                              className="p-1.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                              title="Cancelar"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEdit(team)}
                            className="p-1.5 bg-brasil-blue text-white rounded hover:bg-blue-700 transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTeams.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      Nenhum time encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
