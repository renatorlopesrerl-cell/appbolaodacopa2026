import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Navigate, useNavigate } from 'react-router-dom';
import { useStore } from '../App';
import { Shield, Crown, Search, ArrowLeft, Star, StarHalf, Infinity as InfinityIcon, Users, Trash2, AlertCircle, Lock, Unlock, ChevronLeft, ChevronRight } from 'lucide-react';
import { LeaguePlan, LeagueSettings } from '../types';
import { api } from '../services/api';
import { supabase } from '../services/supabase';

const PAGE_SIZE = 100;

export const AdminLeaguesPageBrasileirao: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser, users, brasileiraoLeagues: leagues, updateBrasileiraoLeague: updateLeague, deleteBrasileiraoLeague: deleteLeague, isSyncing } = useStore();
    const [leagueSearch, setLeagueSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageInput, setPageInput] = useState('');

    const [toast, setToast] = useState<string | null>(null);
    const [deletingLeagueId, setDeletingLeagueId] = useState<string | null>(null);
    const [addingCompetitionsLeagueId, setAddingCompetitionsLeagueId] = useState<string | null>(null);
    const [selectedNewCompetitions, setSelectedNewCompetitions] = useState<string[]>([]);
    const [adminNames, setAdminNames] = useState<Record<string, string>>({});
    const [isGrantingPro, setIsGrantingPro] = useState<string | null>(null);
    const [allAdminLeagues, setAllAdminLeagues] = useState<any[]>([]); // M2b: lista completa para admin geral
    const [isLoadingAll, setIsLoadingAll] = useState(false);

    // M2b: Admin geral — carrega TODAS as ligas apenas ao montar esta página (não ao entrar no modo Brasileirão)
    useEffect(() => {
        if (!currentUser?.isAdmin) return;
        setIsLoadingAll(true);
        supabase
            .from('brasileirao_leagues')
            .select('id, name, admin_id, pending_requests, settings, image, description, is_private, participants, league_code')
            .then(({ data }) => {
                if (data) {
                    setAllAdminLeagues(data.map((l: any) => ({
                        id: l.id, name: l.name, image: l.image, description: l.description,
                        leagueCode: l.league_code, adminId: l.admin_id, isPrivate: l.is_private,
                        participants: l.participants || [], pendingRequests: l.pending_requests || [],
                        settings: {
                            ...l.settings,
                            isUnlimited: l.settings?.isUnlimited === true,
                            plan: l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE')
                        }
                    })));
                }
                setIsLoadingAll(false);
            });
    }, [currentUser?.isAdmin]);

    // M2b: Para admin usa lista completa carregada diretamente; para usuário comum usa o store
    const leaguesSource: any[] = currentUser?.isAdmin && allAdminLeagues.length > 0 ? allAdminLeagues : leagues;

    useEffect(() => {
        const fetchAdmins = async () => {
            const adminIds = Array.from(new Set(leaguesSource.map(l => l.adminId).filter(Boolean)));
            const missingIds = adminIds.filter(id => !users.find(u => u.id === id) && !adminNames[id]);
            
            if (missingIds.length > 0) {
                try {
                    const profiles = await api.profiles.getByIds(missingIds);
                    if (profiles) {
                        const newNames: Record<string, string> = {};
                        profiles.forEach((p: any) => {
                            newNames[p.id] = p.name || p.email?.split('@')[0] || 'Usuário';
                        });
                        setAdminNames(prev => ({ ...prev, ...newNames }));
                    }
                } catch (e) {
                    console.error("Failed to fetch admin names", e);
                }
            }
        };
        fetchAdmins();
    }, [allAdminLeagues, leagues, users]);

    // Reset to page 1 whenever search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [leagueSearch]);

    if (!currentUser?.isAdmin) {
        return <Navigate to="/" />;
    }

    const showToast = (message: string) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    };

    const cycleLeaguePlan = async (leagueId: string, currentPlan: LeaguePlan) => {
        const league = leaguesSource.find(l => l.id === leagueId);
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

        try {
            await updateLeague(leagueId, { settings: newSettings });
            showToast(`Plano alterado para: ${nextPlan.replace('_', ' ')}`);
        } catch (e) {
            console.error("Error updating league plan:", e);
        }
    };

    const handleDeleteLeague = async (leagueId: string) => {
        const success = await deleteLeague(leagueId);
        if (success) {
            showToast('Liga excluída com sucesso.');
        }
        setDeletingLeagueId(null);
    };

    const handleGrantProToLeague = async (leagueId: string, participants: string[], leagueName: string) => {
        if (!window.confirm(`Deseja conceder acesso PRO a todos os ${participants.length} participantes da liga ${leagueName}?`)) {
            return;
        }

        setIsGrantingPro(leagueId);
        try {
            const result = await api.admin.grantProByIds(participants);
            if (result.success && result.count > 0) {
                showToast(`PRO concedido para ${result.count} usuários da liga!`);
            } else {
                showToast(`Nenhum usuário foi atualizado.`);
            }
        } catch (e: any) {
            console.error("Error granting PRO:", e);
            showToast("Erro ao conceder PRO.");
        } finally {
            setIsGrantingPro(null);
        }
    };

    const handleRevokeProFromLeague = async (leagueId: string, participants: string[], leagueName: string) => {
        if (!window.confirm(`Deseja TIRAR o acesso PRO de todos os ${participants.length} participantes da liga ${leagueName}?`)) {
            return;
        }

        setIsGrantingPro(leagueId + '_revoke');
        try {
            const result = await api.admin.revokeProByIds(participants);
            if (result.success && result.count > 0) {
                showToast(`PRO removido de ${result.count} usuários da liga!`);
            } else {
                showToast(`Nenhum usuário foi atualizado.`);
            }
        } catch (e: any) {
            console.error("Error revoking PRO:", e);
            showToast("Erro ao remover PRO.");
        } finally {
            setIsGrantingPro(null);
        }
    };

    const filteredLeagues = leaguesSource
        .filter(l =>
            l.name.toLowerCase().includes(leagueSearch.toLowerCase()) ||
            (l.leagueCode && l.leagueCode.toLowerCase().includes(leagueSearch.toLowerCase()))
        )
        .sort((a, b) => {
            if (b.participants.length !== a.participants.length) {
                return b.participants.length - a.participants.length;
            }
            return a.name.localeCompare(b.name);
        });

    const totalPages = Math.max(1, Math.ceil(filteredLeagues.length / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const pagedLeagues = filteredLeagues.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const PlanBadge = ({ plan }: { plan: string }) => {
        if (plan === 'VIP_UNLIMITED') return (
            <span className="bg-gray-900 text-yellow-400 border-yellow-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                <InfinityIcon size={12} strokeWidth={3} /> ILIMITADO
            </span>
        );
        if (plan === 'VIP_MASTER') return (
            <span className="bg-gray-900 text-green-400 border-green-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                <Crown size={12} fill="currentColor" /> MASTER
            </span>
        );
        if (plan === 'VIP') return (
            <span className="bg-gray-900 text-blue-400 border-blue-900/50 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                <Star size={12} fill="currentColor" /> TOP
            </span>
        );
        if (plan === 'VIP_BASIC') return (
            <span className="bg-gray-900 text-gray-300 border-gray-700 px-2 py-1 rounded text-xs font-bold inline-flex items-center gap-1 border shadow-sm">
                <StarHalf size={12} fill="currentColor" /> BÁSICO
            </span>
        );
        return (
            <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 px-2 py-1 rounded text-xs font-bold border inline-flex items-center gap-1">
                GRÁTIS
            </span>
        );
    };

    const getBadgeStyle = (comp: string) => {
        switch (comp) {
            case 'brasileirao': return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50';
            case 'copa_do_brasil': return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50';
            case 'libertadores': return 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50';
            case 'sul_americana': return 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800/50';
            default: return 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
        }
    };

    const Pagination = () => (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                <span className="font-bold text-gray-700 dark:text-gray-200">{filteredLeagues.length}</span> ligas encontradas
                {' · '}página <span className="font-bold text-gray-700 dark:text-gray-200">{safePage}</span> de <span className="font-bold text-gray-700 dark:text-gray-200">{totalPages}</span>
                {' · '}mostrando {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredLeagues.length)}
            </div>
            <div className="flex items-center gap-2">
                {/* Page jump */}
                <form
                    className="flex items-center gap-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        const n = parseInt(pageInput);
                        if (!isNaN(n)) goToPage(n);
                        setPageInput('');
                    }}
                >
                    <span className="text-xs text-gray-500">Ir para:</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={pageInput}
                        onChange={e => setPageInput(e.target.value)}
                        placeholder={String(safePage)}
                        className="w-14 text-center bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white rounded px-2 py-1 text-xs outline-none focus:border-brasil-blue"
                    />
                </form>
                <button
                    onClick={() => goToPage(safePage - 1)}
                    disabled={safePage <= 1}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Página anterior"
                >
                    <ChevronLeft size={16} />
                </button>
                {/* Page pills — show at most 5 around current */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let page: number;
                    if (totalPages <= 5) {
                        page = i + 1;
                    } else if (safePage <= 3) {
                        page = i + 1;
                    } else if (safePage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                    } else {
                        page = safePage - 2 + i;
                    }
                    return (
                        <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors border ${page === safePage
                                ? 'bg-brasil-blue text-white border-brasil-blue shadow-sm'
                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {page}
                        </button>
                    );
                })}
                <button
                    onClick={() => goToPage(safePage + 1)}
                    disabled={safePage >= totalPages}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Próxima página"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-20">
            {toast && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 999999,
                        pointerEvents: 'none',
                        padding: '16px',
                    }}
                >
                    <div
                        style={{ pointerEvents: 'auto' }}
                        className="bg-brasil-green text-white px-8 py-5 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-300 font-bold max-w-[85vw] text-center border-2 border-white/20 backdrop-blur-sm"
                    >
                        {toast}
                    </div>
                </div>,
                document.body
            )}

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

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="bg-brasil-yellow text-brasil-blue p-2 rounded-lg"><Shield size={24} /></span>
                            Gerenciamento de Ligas
                        </h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                            Total no banco: <span className="font-bold text-gray-700 dark:text-gray-200">{leaguesSource.length}</span> ligas{isLoadingAll && <span className="ml-1 text-gray-400">(carregando...)</span>} · exibindo {PAGE_SIZE} por página
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <button
                            onClick={async () => {
                                if (window.confirm('Deseja BLOQUEAR a edição de pontos de TODAS as ligas padrão?')) {
                                    for (const l of filteredLeagues) {
                                        await updateLeague(l.id, { settings: { ...(l.settings || {}), manualScoringLock: true } as LeagueSettings });
                                    }
                                }
                            }}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 dark:border-red-800 flex items-center gap-1 hover:bg-red-100 transition-colors"
                        >
                            <Lock size={14} /> Travar Pontos Todas
                        </button>
                        <button
                            onClick={async () => {
                                if (window.confirm('Deseja DESBLOQUEAR a edição de pontos de TODAS as ligas padrão?')) {
                                    for (const l of filteredLeagues) {
                                        await updateLeague(l.id, { settings: { ...(l.settings || {}), manualScoringLock: false } as LeagueSettings });
                                    }
                                }
                            }}
                            className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-3 py-2 rounded-lg text-xs font-bold border border-green-100 dark:border-green-800 flex items-center gap-1 hover:bg-green-100 transition-colors"
                        >
                            <Unlock size={14} /> Destravar Pontos Todas
                        </button>
                        <div className="relative w-full md:w-64">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nome ou código..."
                                value={leagueSearch}
                                onChange={(e) => setLeagueSearch(e.target.value)}
                                className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-white placeholder-gray-400 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="max-h-[65vh] overflow-y-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 uppercase text-xs sticky top-0 z-10 border-b border-gray-200 dark:border-gray-600">
                            <tr>
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Nome da Liga</th>
                                <th className="px-4 py-3">Código</th>
                                <th className="px-4 py-3">Campeonatos</th>
                                <th className="px-4 py-3">Admin</th>
                                <th className="px-4 py-3 text-center">Part.</th>
                                <th className="px-4 py-3 text-center">Plano</th>
                                <th className="px-4 py-3 text-center">Trava Pontos</th>

                                <th className="px-4 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {pagedLeagues.map((l, idx) => {
                                const plan = l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
                                const adminName = users.find(u => u.id === l.adminId)?.name || adminNames[l.adminId];
                                const globalIdx = (safePage - 1) * PAGE_SIZE + idx + 1;

                                return (
                                    <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{globalIdx}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{l.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{l.leagueCode || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-col gap-1 items-start">
                                                <div className="flex flex-wrap gap-1">
                                                    {(l.settings?.competitions || ['brasileirao']).map(c => (
                                                        <span key={c} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getBadgeStyle(c)}`}>
                                                            {c === 'brasileirao' ? 'BR' : c === 'copa_do_brasil' ? 'CDB' : c === 'libertadores' ? 'LIB' : 'SUL'}
                                                        </span>
                                                    ))}
                                                </div>
                                                {['brasileirao', 'copa_do_brasil', 'libertadores', 'sul_americana'].some(c => !(l.settings?.competitions || ['brasileirao']).includes(c as any)) && (
                                                    <button
                                                        onClick={() => setAddingCompetitionsLeagueId(l.id)}
                                                        className="text-[10px] font-bold text-brasil-blue dark:text-red-400 hover:underline text-left mt-1"
                                                    >
                                                        + Adicionar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{adminName || (isSyncing ? 'Carregando...' : l.adminId?.slice(0, 8) + '...')}</td>
                                        <td className="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-100">{l.participants.length}</td>
                                        <td className="px-4 py-3 text-center">
                                            <PlanBadge plan={plan} />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={async () => {
                                                    const currentLock = l.settings?.manualScoringLock || false;
                                                    await updateLeague(l.id, {
                                                        settings: {
                                                            ...(l.settings || {}),
                                                            manualScoringLock: !currentLock
                                                        } as LeagueSettings
                                                    });
                                                }}
                                                className={`p-1.5 rounded-lg transition-colors ${l.settings?.manualScoringLock ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'}`}
                                                title={l.settings?.manualScoringLock ? "Desbloquear pontuações" : "Bloquear pontuações manualmente"}
                                            >
                                                {l.settings?.manualScoringLock ? <Lock size={16} /> : <Unlock size={16} />}
                                            </button>
                                        </td>


                                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                                            <button
                                                onClick={() => handleGrantProToLeague(l.id, l.participants, l.name)}
                                                disabled={isGrantingPro === l.id || isGrantingPro === l.id + '_revoke'}
                                                className="px-3 py-1.5 rounded text-xs font-bold transition-colors bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 disabled:opacity-50 flex items-center gap-1"
                                                title="Dar PRO para todos os membros desta liga"
                                            >
                                                {isGrantingPro === l.id ? <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div> : <Crown size={14} />} PRO
                                            </button>
                                            <button
                                                onClick={() => handleRevokeProFromLeague(l.id, l.participants, l.name)}
                                                disabled={isGrantingPro === l.id || isGrantingPro === l.id + '_revoke'}
                                                className="px-3 py-1.5 rounded text-xs font-bold transition-colors bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 disabled:opacity-50 flex items-center gap-1"
                                                title="Tirar PRO de todos os membros desta liga"
                                            >
                                                {isGrantingPro === l.id + '_revoke' ? <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> : null} Tirar PRO
                                            </button>
                                            <button
                                                onClick={() => cycleLeaguePlan(l.id, plan)}
                                                className="px-3 py-1.5 rounded text-xs font-bold transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"
                                                title="Alternar: FREE -> BÁSICO -> TOP -> MASTER -> ILIMITADO -> FREE"
                                            >
                                                Plano
                                            </button>
                                            <button
                                                onClick={() => setDeletingLeagueId(l.id)}
                                                className="px-3 py-1.5 rounded text-xs font-bold transition-colors bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800"
                                                title="Excluir liga"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {pagedLeagues.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="text-center py-8 text-gray-400 italic">Nenhuma liga encontrada.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {pagedLeagues.map((l, idx) => {
                    const plan = l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
                    const adminName = users.find(u => u.id === l.adminId)?.name || adminNames[l.adminId];
                    const globalIdx = (safePage - 1) * PAGE_SIZE + idx + 1;

                    return (
                        <div key={l.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col gap-4 relative overflow-hidden">
                            {/* Status Stripe */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${plan === 'VIP_UNLIMITED' ? 'bg-yellow-400' :
                                plan === 'VIP_MASTER' ? 'bg-green-400' :
                                    plan === 'VIP' ? 'bg-blue-400' :
                                        plan === 'VIP_BASIC' ? 'bg-gray-400' : 'bg-gray-200 dark:bg-gray-600'
                                }`}></div>

                            <div className="flex justify-between items-start pl-3">
                                <div>
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                        <span className="text-[10px] font-mono text-gray-400">#{globalIdx}</span>
                                    </div>
                                    <h3 className="font-bold text-gray-800 dark:text-white text-lg leading-tight">{l.name}</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                                        <Users size={12} /> Admin: <span className="font-medium text-gray-700 dark:text-gray-300">{adminName || (isSyncing ? 'Carregando...' : l.adminId?.slice(0, 8) + '...')}</span>
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
                                    <PlanBadge plan={plan} />
                                </div>
                            </div>

                            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg mx-3 flex justify-between items-center">
                                <div className="flex flex-wrap gap-1">
                                    {(l.settings?.competitions || ['brasileirao']).map(c => (
                                        <span key={c} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${getBadgeStyle(c)}`}>
                                            {c === 'brasileirao' ? 'BR' : c === 'copa_do_brasil' ? 'CDB' : c === 'libertadores' ? 'LIB' : 'SUL'}
                                        </span>
                                    ))}
                                </div>
                                {['brasileirao', 'copa_do_brasil', 'libertadores', 'sul_americana'].some(c => !(l.settings?.competitions || ['brasileirao']).includes(c as any)) && (
                                    <button
                                        onClick={() => setAddingCompetitionsLeagueId(l.id)}
                                        className="text-[10px] font-bold text-brasil-blue dark:text-red-400 bg-blue-50 dark:bg-red-900/20 px-2 py-1 rounded hover:bg-blue-100 dark:hover:bg-red-900/40 transition-colors"
                                    >
                                        + Adicionar
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 ml-3 mt-1 mr-3">
                                <button
                                    onClick={() => handleGrantProToLeague(l.id, l.participants, l.name)}
                                    disabled={isGrantingPro === l.id || isGrantingPro === l.id + '_revoke'}
                                    className="py-2.5 px-3 rounded-lg font-bold text-xs transition-colors bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 border border-yellow-300 dark:border-yellow-700 flex items-center justify-center gap-1 flex-1 uppercase tracking-wide disabled:opacity-50"
                                    title="Dar PRO para a liga"
                                >
                                    {isGrantingPro === l.id ? <div className="w-3 h-3 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div> : <Crown size={14} />} PRO
                                </button>
                                <button
                                    onClick={() => handleRevokeProFromLeague(l.id, l.participants, l.name)}
                                    disabled={isGrantingPro === l.id || isGrantingPro === l.id + '_revoke'}
                                    className="py-2.5 px-3 rounded-lg font-bold text-xs transition-colors bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 flex items-center justify-center gap-1 flex-1 uppercase tracking-wide disabled:opacity-50"
                                    title="Tirar PRO para a liga"
                                >
                                    {isGrantingPro === l.id + '_revoke' ? <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div> : null} Tirar PRO
                                </button>
                                <button
                                    onClick={() => cycleLeaguePlan(l.id, plan)}
                                    className="py-2.5 rounded-lg font-bold text-xs transition-colors bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 uppercase tracking-wide flex-1"
                                >
                                    Plano
                                </button>
                                <button
                                            onClick={async () => {
                                                const currentLock = l.settings?.manualScoringLock || false;
                                                await updateLeague(l.id, {
                                                    settings: {
                                                        ...(l.settings || {}),
                                                        manualScoringLock: !currentLock
                                                    } as LeagueSettings
                                                });
                                            }}
                                            className={`py-2.5 px-3 rounded-lg font-bold text-xs transition-colors border flex items-center justify-center gap-1 uppercase tracking-wide flex-1 ${l.settings?.manualScoringLock ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'}`}
                                            title="Trava de Pontos"
                                        >
                                            {l.settings?.manualScoringLock ? <Lock size={14} /> : <Unlock size={14} />}
                                            Pts
                                        </button>
                                <button
                                    onClick={() => setDeletingLeagueId(l.id)}
                                    className="py-2.5 px-3 rounded-lg font-bold text-xs transition-colors bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 uppercase tracking-wide flex items-center justify-center"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
                {pagedLeagues.length === 0 && (
                    <div className="text-center py-8 text-gray-400 italic">Nenhuma liga encontrada.</div>
                )}

                {/* Mobile Pagination */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <Pagination />
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deletingLeagueId && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setDeletingLeagueId(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded-full">
                                <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-white">Excluir Liga</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                            Tem certeza que deseja excluir a liga <strong>{leaguesSource.find(l => l.id === deletingLeagueId)?.name}</strong>?
                        </p>
                        <p className="text-xs text-red-500 dark:text-red-400 mb-6">
                            Esta ação é irreversível. Todos os dados da liga serão removidos.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeletingLeagueId(null)}
                                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => handleDeleteLeague(deletingLeagueId)}
                                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} /> Excluir
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Add Competitions Modal */}
            {addingCompetitionsLeagueId && createPortal(
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setAddingCompetitionsLeagueId(null); setSelectedNewCompetitions([]); }}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-sm shadow-2xl border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Adicionar Campeonatos</h3>
                        {(() => {
                            const league = leaguesSource.find(l => l.id === addingCompetitionsLeagueId);
                            if (!league) return null;
                            const currentComps = league.settings?.competitions || ['brasileirao'];
                            const available = ['brasileirao', 'copa_do_brasil', 'libertadores', 'sul_americana'].filter(c => !currentComps.includes(c as any));

                            return (
                                <>
                                    <div className="space-y-3 mb-6">
                                        {available.length === 0 ? (
                                            <p className="text-sm text-gray-500">Esta liga já possui todos os campeonatos disponíveis.</p>
                                        ) : (
                                            available.map(c => (
                                                <label key={c} className="flex items-center gap-2 cursor-pointer bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedNewCompetitions.includes(c)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) setSelectedNewCompetitions(prev => [...prev, c]);
                                                            else setSelectedNewCompetitions(prev => prev.filter(x => x !== c));
                                                        }}
                                                        className="w-4 h-4 text-brasil-blue border-gray-300 rounded focus:ring-brasil-blue focus:ring-2"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        {c === 'brasileirao' ? 'Brasileirão Série A' : c === 'copa_do_brasil' ? 'Copa do Brasil' : c === 'libertadores' ? 'Libertadores' : 'Sul-Americana'}
                                                    </span>
                                                </label>
                                            ))
                                        )}
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => { setAddingCompetitionsLeagueId(null); setSelectedNewCompetitions([]); }}
                                            className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-bold text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                if (selectedNewCompetitions.length > 0) {
                                                    const newComps = [...currentComps, ...selectedNewCompetitions];
                                                    await updateLeague(league.id, { 
                                                        settings: { ...(league.settings || {}), competitions: newComps as any } as LeagueSettings
                                                    });
                                                    showToast('Campeonatos adicionados com sucesso.');
                                                }
                                                setAddingCompetitionsLeagueId(null);
                                                setSelectedNewCompetitions([]);
                                            }}
                                            disabled={selectedNewCompetitions.length === 0}
                                            className="flex-1 px-4 py-2 bg-brasil-blue text-white rounded-lg font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
                                        >
                                            Adicionar
                                        </button>
                                    </div>
                                </>
                            )
                        })()}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};