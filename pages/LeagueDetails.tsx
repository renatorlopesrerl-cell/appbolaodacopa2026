import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, Link, Navigate } from 'react-router-dom';
import { useStore, getLeagueLimit } from '../App';
import { MatchStatus, Phase, Match, User, LeaguePlan } from '../types';
import { getTeamFlag, isPredictionLocked, calculatePoints, GROUPS_CONFIG, processImageForUpload } from '../services/dataService';
import { uploadBase64Image } from '../services/storageService';
import {
    Trophy, Users, ArrowLeft, Search, Lock, Globe,
    UserPlus, LogOut, Trash2, Check, X, MousePointerClick,
    Save, Loader2, Medal, AlertCircle, Share2, Info, Filter, Plus, Clock, MapPin, CheckCircle2, Unlock, Calendar, ChevronDown, Crown, Eye,
    Target, Mail, AlertTriangle, Camera, Upload, MessageCircle, Copy, Bell, Star, StarHalf, Infinity as InfinityIcon, Zap
} from 'lucide-react';

export const LeagueDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const {
        currentUser, leagues, matches, predictions, users, currentTime,
        joinLeague, deleteLeague, approveUser, rejectUser,
        removeUserFromLeague, submitPredictions, sendLeagueInvite, updateLeague, loading, refreshPredictions
    } = useStore();

    const [activeTab, setActiveTab] = useState<'palpites' | 'classificacao' | 'regras' | 'admin'>('palpites');

    // --- GLOBAL STATE (HOISTED) ---
    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    // --- PALPITES TAB STATE (HOISTED) ---
    const [pendingEdits, setPendingEdits] = useState<Record<string, { home: string, away: string }>>({});
    const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<string | null>(null);
    const [matchDetailsSearch, setMatchDetailsSearch] = useState('');
    const [isSavingPalpites, setIsSavingPalpites] = useState(false);
    const [filterPhase, setFilterPhase] = useState<string>('all');
    const [filterGroup, setFilterGroup] = useState<string>('all');
    const [filterRound, setFilterRound] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'predicted' | 'missing'>('all');

    // --- CLASSIFICACAO TAB STATE (HOISTED) ---
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [leaderboardSearch, setLeaderboardSearch] = useState('');
    const [leaderboardView, setLeaderboardView] = useState<string>('total');
    const [histPhase, setHistPhase] = useState<string>('all');
    const [histGroup, setHistGroup] = useState<string>('all');
    const [histRound, setHistRound] = useState<string>('all');

    // --- ADMIN TAB STATE (HOISTED) ---
    const [editImage, setEditImage] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPrivate, setEditIsPrivate] = useState(false);
    const [imageProcessing, setImageProcessing] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [adminInviteEmail, setAdminInviteEmail] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isPrivateInitialized = useRef(false);

    // Find League
    const league = leagues.find(l => l.id === id);

    // Initialize Admin State when league loads
    useEffect(() => {
        if (league) {
            if (editImage === '') setEditImage(league.image || '');
            if (editDescription === '') setEditDescription(league.description || '');
            // Sync isPrivate only once when the page first loads to prevent form from
            // "forgetting" the current state (e.g. a Private league appearing as Public)
            if (!isPrivateInitialized.current) {
                setEditIsPrivate(league.isPrivate);
                isPrivateInitialized.current = true;
            }
        }
    }, [league]);

    // Derived State
    const isAdmin = currentUser && league ? league.adminId === currentUser.id : false;

    const validPendingRequestsCount = useMemo(() => {
        if (!league) return 0;
        return league.pendingRequests.filter(uid => users.some(u => u.id === uid)).length;
    }, [league, users]);

    // Auto Cleanup Phantom Requests
    useEffect(() => {
        if (league && isAdmin && users.length > 0) {
            const validRequests = league.pendingRequests.filter(uid => users.some(u => u.id === uid));
            if (validRequests.length !== league.pendingRequests.length) {
                updateLeague(league.id, { pendingRequests: validRequests });
            }
        }
    }, [league, users, isAdmin, updateLeague]);

    // --- SMART POLLING LOGIC ---
    useEffect(() => {
        if (!league) return;

        // Clear any existing timeouts first
        const timeouts: NodeJS.Timeout[] = [];

        matches.forEach(match => {
            const matchDate = new Date(match.date);
            if (isNaN(matchDate.getTime())) return;

            // Lock time is 5 minutes before match
            const lockTime = new Date(matchDate.getTime() - 5 * 60 * 1000);

            // Poll triggers 15 seconds AFTER lock
            const pollTime = new Date(lockTime.getTime() + 15 * 1000);

            const now = new Date();
            const timeUntilPoll = pollTime.getTime() - now.getTime();

            // Only schedule if it's in the future and less than 24h away (avoid massive timeouts)
            if (timeUntilPoll > 0 && timeUntilPoll < 24 * 60 * 60 * 1000) {
                const tid = setTimeout(() => {
                    console.log(`Polling triggered for match ${match.id} lock`);
                    refreshPredictions();
                }, timeUntilPoll);
                timeouts.push(tid);
            }
        });

        return () => {
            timeouts.forEach(clearTimeout);
        };
    }, [matches, league?.id]);

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
    if (!currentUser) return <Navigate to="/" replace />;
    if (!league) return <Navigate to="/leagues" />;

    const isParticipant = league.participants.includes(currentUser.id);
    const isPending = league.pendingRequests.includes(currentUser.id);
    const currentPlan: LeaguePlan = league.settings?.plan || (league.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
    const limit = getLeagueLimit(league);
    const isUnlimited = currentPlan === 'VIP_UNLIMITED';
    const isMaster = currentPlan === 'VIP_MASTER';
    const isVip = currentPlan === 'VIP';
    const isBasic = currentPlan === 'VIP_BASIC';
    const isFree = currentPlan === 'FREE';

    // --- ACTIONS ---

    const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
        setToast({ title, message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleJoin = () => { if (league) joinLeague(league.id); };
    const handleLeave = () => { setShowLeaveConfirm(true); };
    const executeLeave = () => {
        if (league && currentUser) {
            removeUserFromLeague(league.id, currentUser.id);
            navigate('/leagues');
        }
    };
    const handleDelete = async () => {
        if (league && window.confirm('Tem certeza que deseja EXCLUIR esta liga?')) {
            const success = await deleteLeague(league.id);
            if (success) navigate('/leagues');
        }
    };
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (league && inviteEmail) {
            await sendLeagueInvite(league.id, inviteEmail);
            setInviteEmail('');
            setIsInviteModalOpen(false);
        }
    };
    const handleCopyCode = () => {
        if (league.leagueCode) {
            navigator.clipboard.writeText(league.leagueCode);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };
    const initiateRemoveUser = (e: React.MouseEvent, userId: string, userName: string) => {
        e.preventDefault(); e.stopPropagation();
        setUserToRemove({ id: userId, name: userName });
    };
    const confirmRemoveUser = () => {
        if (userToRemove) {
            removeUserFromLeague(league.id, userToRemove.id);
            setUserToRemove(null);
        }
    };
    const executeDeleteLeague = async () => {
        setIsDeleting(true);
        const success = await deleteLeague(league.id);
        setIsDeleting(false);
        if (success) navigate('/leagues');
        else setShowDeleteConfirm(false);
    };

    // --- HELPER: Match Logic ---
    const getMatchRound = (match: Match) => {
        if (match.phase !== Phase.GROUP || !match.group) return null;
        const groupMatches = matches
            .filter(m => m.group === match.group && m.phase === Phase.GROUP)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const index = groupMatches.findIndex(m => m.id === match.id);
        if (index === -1) return null;
        return Math.floor(index / 2) + 1;
    };

    // --- PALPITES LOGIC ---
    const handleScoreChange = (matchId: string, side: 'home' | 'away', value: string, currentPred: any) => {
        setPendingEdits(prev => {
            const existing = prev[matchId] || {
                home: currentPred?.homeScore?.toString() ?? '',
                away: currentPred?.awayScore?.toString() ?? ''
            };
            return { ...prev, [matchId]: { ...existing, [side]: value } };
        });
    };

    const handleSaveAll = async () => {
        const predsToSave: { matchId: string, home: number, away: number }[] = [];
        let hasError = false;
        Object.entries(pendingEdits).forEach(([matchId, val]) => {
            const scores = val as { home: string, away: string };
            if (scores.home !== '' && scores.away !== '') {
                const home = parseInt(scores.home);
                const away = parseInt(scores.away);
                if (home < 0 || away < 0) hasError = true;
                if (!isNaN(home) && !isNaN(away)) predsToSave.push({ matchId, home, away });
            }
        });

        if (hasError) { showToast('Atenção', 'Não é permitido placar negativo.', 'warning'); return; }

        if (predsToSave.length > 0) {
            setIsSavingPalpites(true);
            const success = await submitPredictions(predsToSave, league.id);
            setIsSavingPalpites(false);
            if (success) {
                setPendingEdits({});
                showToast('Sucesso!', `${predsToSave.length} palpite(s) salvo(s).`, 'success');
            }
        }
    };

    const getMatchDetailsData = () => {
        if (!selectedMatchForDetails) return null;
        const match = matches.find(m => m.id === selectedMatchForDetails);
        if (!match) return null;
        const participantPredictions = league.participants.map(userId => {
            const user = users.find(u => u.id === userId) || { name: 'Unknown', id: userId, avatar: '' } as User;
            const pred = predictions.find(p => p.matchId === match.id && p.userId === userId && p.leagueId === league.id);
            let points = 0;
            if (match.homeScore !== null && match.awayScore !== null && pred) {
                points = calculatePoints(Number(pred.homeScore), Number(pred.awayScore), Number(match.homeScore), Number(match.awayScore), league.settings);
            }
            return { user, pred, points };
        });
        return {
            match,
            participants: participantPredictions.sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                return a.user.name.localeCompare(b.user.name);
            })
        };
    };

    // --- ADMIN LOGIC ---
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) { showToast("Erro", "Arquivo inválido.", 'info'); return; }
            try {
                setImageProcessing(true);
                const compressedImage = await processImageForUpload(file);
                setEditImage(compressedImage);
            } catch (err) {
                console.error(err);
                showToast("Erro", "Erro ao processar imagem.", 'warning');
            } finally { setImageProcessing(false); }
        }
    };
    const triggerFileInput = () => { fileInputRef.current?.click(); };
    const handleUpdateLeague = async () => {
        setIsSavingSettings(true);
        let finalImage = editImage;

        // Check if image is new (Base64) and needs upload
        if (editImage && !editImage.startsWith('http')) {
            try {
                // showToast('Info', 'Enviando imagem...', 'info'); // Optimal: feedback
                finalImage = await uploadBase64Image(editImage, 'leagues');
            } catch (e) {
                console.error("Upload failed", e);
                showToast('Erro', 'Falha ao enviar imagem. Tente novamente.', 'warning');
                setIsSavingSettings(false);
                return;
            }
        }

        await updateLeague(league.id, { image: finalImage, description: editDescription, settings: league.settings, isPrivate: editIsPrivate });

        // Update local state to the new URL to avoid re-uploading
        setEditImage(finalImage);

        showToast('Sucesso', 'Alterações salvas.', 'success');
        setIsSavingSettings(false);
    };
    const handleSearchUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminInviteEmail) return;
        setSearchStatus('searching'); setFoundUser(null);
        setTimeout(() => {
            const user = users.find(u => u.email.toLowerCase() === adminInviteEmail.toLowerCase().trim());
            if (user) { setFoundUser(user); setSearchStatus('found'); } else { setSearchStatus('not_found'); }
        }, 500);
    };
    const handleConfirmInvite = async () => {
        if (!foundUser) return;
        setIsSendingInvite(true);
        const success = await sendLeagueInvite(league.id, foundUser.email);
        setIsSendingInvite(false);
        if (success) { setAdminInviteEmail(''); setFoundUser(null); setSearchStatus('idle'); }
    };
    const handleClearSearch = () => { setAdminInviteEmail(''); setFoundUser(null); setSearchStatus('idle'); };


    const getMatchStats = (matchId: string) => {
        const matchPreds = predictions.filter(p => p.matchId === matchId && p.leagueId === league.id);
        const total = matchPreds.length;
        if (total === 0) return null;
        if (!currentUser?.isPro) return null; // PRO Feature: Stats

        let homeWins = 0;
        let draws = 0;
        let awayWins = 0;

        matchPreds.forEach(p => {
            if (p.homeScore > p.awayScore) homeWins++;
            else if (p.awayScore > p.homeScore) awayWins++;
            else draws++;
        });

        return {
            home: Math.round((homeWins / total) * 100),
            draw: Math.round((draws / total) * 100),
            away: Math.round((awayWins / total) * 100),
            total
        };
    };
    // ================= RENDERERS (FORMER COMPONENTS) =================

    const renderPalpitesTab = () => {
        const sortedMatches = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const filteredMatches = sortedMatches.filter(m => {
            if (filterPhase !== 'all' && m.phase !== filterPhase) return false;
            if (filterGroup !== 'all') { if (!m.group || m.group !== filterGroup) return false; }
            if (filterRound !== 'all') {
                if (m.phase !== Phase.GROUP) return false;
                const round = getMatchRound(m);
                if (round?.toString() !== filterRound) return false;
            }
            if (filterStatus !== 'all') {
                const userPred = predictions.find(p => p.matchId === m.id && p.userId === currentUser.id && p.leagueId === league.id);
                const homeVal = pendingEdits[m.id]?.home ?? (userPred?.homeScore?.toString() ?? '');
                const awayVal = pendingEdits[m.id]?.away ?? (userPred?.awayScore?.toString() ?? '');
                const isFilled = homeVal !== '' && awayVal !== '';
                if (filterStatus === 'predicted' && !isFilled) return false;
                if (filterStatus === 'missing' && isFilled) return false;
            }
            return true;
        });

        const hasFilters = filterPhase !== 'all' || filterGroup !== 'all' || filterRound !== 'all' || filterStatus !== 'all';
        const clearFilters = () => { setFilterPhase('all'); setFilterGroup('all'); setFilterRound('all'); setFilterStatus('all'); };
        const detailsData = getMatchDetailsData();
        const filteredDetailsParticipants = detailsData?.participants.filter(p => p.user.name.toLowerCase().includes(matchDetailsSearch.toLowerCase())) || [];
        const hasUnsavedChanges = Object.keys(pendingEdits).length > 0;
        const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        return (
            <div className="space-y-6 pb-24">
                <div className="space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-3 text-xs md:text-sm font-medium border border-blue-100 dark:border-blue-800 rounded-xl flex items-center justify-center gap-2 text-center shadow-sm">
                        <MousePointerClick size={16} /><span>Clique am uma partida com palpite encerrado para conferir os palpites da galera (Atualização auto. 15s após bloqueio).</span>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-4 py-3 text-xs md:text-sm font-medium border border-yellow-100 dark:border-yellow-800 rounded-xl flex items-center justify-center gap-2 text-center shadow-sm">
                        <AlertCircle size={16} /><span>O palpite é encerrado 5 min. antes do inicio do jogo.</span>
                    </div>
                </div>

                {hasUnsavedChanges && createPortal(
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9900] pointer-events-auto animate-in slide-in-from-bottom-6 fade-in duration-300">
                        <button onClick={handleSaveAll} disabled={isSavingPalpites} className="bg-brasil-green hover:bg-green-700 text-white px-8 py-4 rounded-full shadow-2xl shadow-green-900/40 font-bold text-xl md:text-2xl flex items-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 border border-green-400 ring-4 ring-white/20 backdrop-blur-sm whitespace-nowrap">
                            {isSavingPalpites ? <Loader2 size={28} className="animate-spin" /> : <Save size={28} className="stroke-[3]" />}
                            <span>{isSavingPalpites ? 'Salvando...' : `Salvar ${Object.keys(pendingEdits).length} Palpite(s)`}</span>
                        </button>
                    </div>, document.body
                )}

                <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center">
                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Filter size={16} className="text-brasil-blue dark:text-blue-400" /> Filtros</div>
                            {hasFilters && (<button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 ml-3"><X size={12} /> Limpar</button>)}
                            <button onClick={() => refreshPredictions()} className="text-xs font-bold text-brasil-green hover:text-green-700 transition-colors flex items-center gap-1 ml-3 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800"><Loader2 size={12} /> Atualizar Palpites</button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700"><Clock size={12} /> Horários de Brasília (BRT)</div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            <button onClick={() => setFilterStatus('all')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${filterStatus === 'all' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>Todos</button>
                            <button onClick={() => setFilterStatus('missing')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterStatus === 'missing' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}><AlertCircle size={12} /> Pendentes</button>
                            <button onClick={() => setFilterStatus('predicted')} className={`px-4 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1 ${filterStatus === 'predicted' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}><CheckCircle2 size={12} /> Preenchidos</button>
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="relative w-full md:w-auto min-w-[140px]">
                                <select value={filterPhase} onChange={(e) => { setFilterPhase(e.target.value); if (e.target.value !== Phase.GROUP) { setFilterGroup('all'); setFilterRound('all'); } }} className="w-full appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8">
                                    <option value="all">Todas as Fases</option>
                                    {Object.values(Phase).map(p => (<option key={p} value={p}>{p}</option>))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                            </div>
                            {(filterPhase === 'all' || filterPhase === Phase.GROUP) && (
                                <>
                                    <div className="relative w-1/2 md:w-auto min-w-[100px] flex-1 md:flex-none">
                                        <select value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)} className="w-full appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8">
                                            <option value="all">Todos Grupos</option>
                                            {groupsList.map(g => <option key={g} value={g}>Grupo {g}</option>)}
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                    </div>
                                    <div className="relative w-1/2 md:w-auto min-w-[100px] flex-1 md:flex-none">
                                        <select value={filterRound} onChange={(e) => setFilterRound(e.target.value)} className="w-full appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8">
                                            <option value="all">Todas Rodadas</option>
                                            <option value="1">1ª Rodada</option>
                                            <option value="2">2ª Rodada</option>
                                            <option value="3">3ª Rodada</option>
                                        </select>
                                        <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {filteredMatches.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <p className="text-gray-400 font-medium">Nenhum jogo encontrado.</p>
                        <button onClick={clearFilters} className="mt-2 text-sm text-brasil-blue dark:text-blue-400 font-bold hover:underline">Limpar filtros</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredMatches.map(match => {
                            const locked = isPredictionLocked(match.date, currentTime);
                            const userPred = predictions.find(p => p.matchId === match.id && p.userId === currentUser.id && p.leagueId === league.id);
                            const matchDate = new Date(match.date);
                            const isDateValid = !isNaN(matchDate.getTime());
                            const matchRound = getMatchRound(match);
                            const homeValue = pendingEdits[match.id]?.home ?? (userPred?.homeScore?.toString() ?? '');
                            const awayValue = pendingEdits[match.id]?.away ?? (userPred?.awayScore?.toString() ?? '');
                            const isEdited = !!pendingEdits[match.id];
                            let displayPoints = userPred?.points || 0;
                            if ((match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && match.homeScore !== null && match.awayScore !== null && userPred) {
                                displayPoints = calculatePoints(Number(userPred.homeScore), Number(userPred.awayScore), Number(match.homeScore), Number(match.awayScore), league.settings);
                            }

                            const stats = currentUser?.isPro ? getMatchStats(match.id) : null;
                            const showBlurStats = !currentUser?.isPro && getMatchStats(match.id) !== null;

                            return (
                                <div key={match.id} onClick={() => { if (locked) { setSelectedMatchForDetails(match.id); setMatchDetailsSearch(''); } }} className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all relative overflow-hidden ${isEdited ? 'border-brasil-yellow ring-1 ring-brasil-yellow' : 'border-gray-200 dark:border-gray-700'} ${locked ? 'cursor-pointer hover:border-brasil-blue dark:hover:border-blue-500 hover:shadow-md' : ''}`}>
                                    <div className="absolute top-0 right-0">
                                        {locked ? (
                                            match.status === MatchStatus.IN_PROGRESS ? <div className="bg-red-100 text-red-600 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1 animate-pulse"><Lock size={10} /> Em Andamento</div> : match.status === MatchStatus.FINISHED ? <div className="bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Lock size={10} /> Finalizado</div> : <div className="bg-yellow-100 dark:bg-yellow-900 text-orange-600 dark:text-orange-300 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Lock size={10} /> Palpite Encerrado</div>
                                        ) : userPred ? <div className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-300 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Palpite Salvo</div> : <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Unlock size={10} /> Palpite Aberto</div>}
                                    </div>
                                    {locked && <div className="absolute bottom-2 right-2 opacity-50 text-brasil-blue dark:text-blue-400"><Users size={16} /></div>}
                                    <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400 mb-4 gap-1 pr-20">
                                        <span className="font-bold text-brasil-blue dark:text-blue-400 uppercase flex items-center gap-1.5"><Calendar size={12} />{isDateValid ? matchDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Data Inválida'}<span className="text-gray-300 dark:text-gray-600">|</span>{isDateValid ? matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                        <span className="flex items-center gap-1 text-gray-400 dark:text-gray-500 truncate"><MapPin size={12} /> {match.location}</span>
                                        <div className="flex items-center gap-2 mt-1">{match.group && <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded font-medium">Grupo {match.group}</span>}{matchRound && <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-medium border border-blue-100 dark:border-blue-800">{matchRound}ª Rodada</span>}</div>
                                    </div>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex flex-col items-center justify-center w-1/3 gap-2">
                                            <img src={getTeamFlag(match.homeTeamId)} alt={match.homeTeamId} className="w-12 h-9 object-cover rounded shadow-md" />
                                            <span className="text-center font-black text-sm md:text-base text-gray-900 dark:text-gray-100 leading-tight">{match.homeTeamId}</span>
                                            {stats && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{stats.home}%</span>}
                                        </div>

                                        <div className="flex flex-col items-center justify-center relative">
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}><input type="number" min="0" disabled={locked} value={homeValue} onChange={(e) => handleScoreChange(match.id, 'home', e.target.value, userPred)} placeholder="-" className={`w-14 h-12 text-center border rounded-lg font-bold text-xl md:text-2xl focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue outline-none transition-all ${locked ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-pointer' : 'bg-gray-700 border-gray-600 text-white'}`} /><span className="text-gray-300 dark:text-gray-600 text-sm font-bold">X</span><input type="number" min="0" disabled={locked} value={awayValue} onChange={(e) => handleScoreChange(match.id, 'away', e.target.value, userPred)} placeholder="-" className={`w-14 h-12 text-center border rounded-lg font-bold text-xl md:text-2xl focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue outline-none transition-all ${locked ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-pointer' : 'bg-gray-700 border-gray-600 text-white'}`} /></div>
                                            {stats && <span className="text-[10px] font-bold text-gray-400 mt-3">{stats.draw}% Empate</span>}
                                            {showBlurStats && <div className="mt-3 flex items-center gap-1 cursor-pointer bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-[10px] text-gray-500 font-bold" onClick={(e) => { e.stopPropagation(); showToast('Recurso PRO', 'Seja PRO para ver as estatísticas!', 'info'); }}><Lock size={10} /> Estatisticas PRO</div>}
                                        </div>
                                        <div className="flex flex-col items-center justify-center w-1/3 gap-2">
                                            <img src={getTeamFlag(match.awayTeamId)} alt={match.awayTeamId} className="w-12 h-9 object-cover rounded shadow-md" />
                                            <span className="text-center font-black text-sm md:text-base text-gray-900 dark:text-gray-100 leading-tight">{match.awayTeamId}</span>
                                            {stats && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{stats.away}%</span>}
                                        </div>
                                    </div>
                                    {
                                        (match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && (
                                            <div className={`p-2 rounded-lg text-center text-sm border mt-3 ${match.status === MatchStatus.IN_PROGRESS ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-100 dark:border-gray-600'}`}>
                                                <p className={`${match.status === MatchStatus.IN_PROGRESS ? 'text-green-700 dark:text-green-400' : 'text-gray-600 dark:text-gray-300'}`}>{match.status === MatchStatus.IN_PROGRESS ? <span className="flex items-center justify-center gap-1 font-bold animate-pulse"><div className="w-2 h-2 rounded-full bg-red-500"></div> Ao Vivo: <span className="text-gray-900 dark:text-white ml-1 whitespace-nowrap">{match.homeScore} x {match.awayScore}</span></span> : <span>Placar: <span className="font-bold text-gray-900 dark:text-white text-base whitespace-nowrap">{match.homeScore} x {match.awayScore}</span></span>}</p>
                                                {userPred && <p className="text-brasil-green dark:text-green-400 font-black text-base mt-1">{match.status === MatchStatus.IN_PROGRESS ? 'Parcial: ' : 'Pontos: '}+{displayPoints}</p>}
                                            </div>
                                        )
                                    }
                                </div>
                            );
                        })}
                        {selectedMatchForDetails && detailsData && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchForDetails(null)}>
                                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                    <div className="bg-brasil-blue dark:bg-blue-900 text-white p-4 shrink-0">
                                        <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-sm uppercase tracking-wide opacity-80">Palpites da Liga</h3><button onClick={() => setSelectedMatchForDetails(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button></div>
                                        <div className="flex items-center justify-between gap-4"><div className="flex flex-col items-center w-1/3"><img src={getTeamFlag(detailsData.match.homeTeamId)} className="w-10 h-7 object-cover rounded shadow-sm mb-1" /><span className="text-xs font-bold text-center leading-tight">{detailsData.match.homeTeamId}</span></div><div className="flex flex-col items-center"><div className="text-2xl font-black bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20 whitespace-nowrap">{detailsData.match.homeScore ?? '-'} <span className="text-sm mx-1">x</span> {detailsData.match.awayScore ?? '-'}</div><span className={`text-[10px] mt-1 font-bold px-2 py-0.5 rounded-full ${detailsData.match.status === MatchStatus.IN_PROGRESS ? 'bg-red-500 text-white animate-pulse' : detailsData.match.status === MatchStatus.FINISHED ? 'bg-black/30 text-white' : 'bg-blue-800 text-blue-200'}`}>{detailsData.match.status === MatchStatus.IN_PROGRESS ? 'AO VIVO' : detailsData.match.status === MatchStatus.FINISHED ? 'ENCERRADO' : 'AGUARDANDO'}</span></div><div className="flex flex-col items-center w-1/3"><img src={getTeamFlag(detailsData.match.awayTeamId)} className="w-10 h-7 object-cover rounded shadow-sm mb-1" /><span className="text-xs font-bold text-center leading-tight">{detailsData.match.awayTeamId}</span></div></div>
                                    </div>
                                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"><div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={16} /><input type="text" placeholder="Buscar participante..." value={matchDetailsSearch} onChange={(e) => setMatchDetailsSearch(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg pl-9 pr-8 py-2 text-sm focus:ring-1 focus:ring-brasil-blue focus:border-brasil-blue outline-none" />{matchDetailsSearch && (<button onClick={() => setMatchDetailsSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>)}</div></div>
                                    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-0"><div className="divide-y divide-gray-100 dark:divide-gray-700">{filteredDetailsParticipants.length === 0 ? (<div className="text-center py-8 text-gray-400 text-sm">Nenhum participante encontrado.</div>) : (filteredDetailsParticipants.map(({ user, pred, points }, idx) => (<div key={user.id} className={`p-3 flex items-center justify-between ${user.id === currentUser.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-gray-800'}`}><div className="flex items-center gap-3"><div className="relative"><img src={user.avatar} className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" alt="" /><div className="absolute -top-1 -left-1 w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-gray-700 shadow-sm">{idx + 1}</div></div><div><div className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1">{user.name} {user.id === currentUser.id && <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Você)</span>}</div><div className="text-xs text-gray-500 dark:text-gray-400">{pred ? 'Palpite enviado' : 'Não palpitou'}</div></div></div><div className="flex items-center gap-3"><div className="text-lg font-black text-gray-700 dark:text-gray-300 tracking-wider">{pred ? <>{pred.homeScore} <span className="text-gray-300 dark:text-gray-600 text-sm">x</span> {pred.awayScore}</> : <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>}</div><div className={`w-12 text-center rounded py-1 text-xs font-bold ${points > 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : points === 0 && pred ? 'bg-red-50 dark:bg-red-900/30 text-red-400 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>{points > 0 ? `+${points}` : '0'} pts</div></div></div>)))}</div></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const renderClassificacaoTab = () => {
        const groupsList = Object.keys(GROUPS_CONFIG);
        const hasHistoryFilters = histPhase !== 'all' || histGroup !== 'all' || histRound !== 'all';
        const clearHistoryFilters = () => { setHistPhase('all'); setHistGroup('all'); setHistRound('all'); };

        const leaderboard = league.participants.map(userId => {
            const user = users.find(u => u.id === userId) || { name: 'Unknown', id: userId, email: '', avatar: '' } as User;
            const userPreds = predictions.filter(p => p.userId === userId && p.leagueId === league.id);
            let totalPoints = 0, exactScores = 0;
            userPreds.forEach(p => {
                const match = matches.find(m => m.id === p.matchId);
                let includeInSum = false;
                if (match) {
                    const mRound = getMatchRound(match);
                    if (leaderboardView === 'total') includeInSum = true;
                    else if (leaderboardView === '1' && match.phase === Phase.GROUP && mRound === 1) includeInSum = true;
                    else if (leaderboardView === '2' && match.phase === Phase.GROUP && mRound === 2) includeInSum = true;
                    else if (leaderboardView === '3' && match.phase === Phase.GROUP && mRound === 3) includeInSum = true;
                    else if (leaderboardView === 'group_phase' && match.phase === Phase.GROUP) includeInSum = true;
                    else if (leaderboardView === 'knockout' && match.phase !== Phase.GROUP) includeInSum = true;
                }
                if (includeInSum && match && (match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && match.homeScore !== null && match.awayScore !== null) {
                    totalPoints += calculatePoints(Number(p.homeScore), Number(p.awayScore), Number(match.homeScore), Number(match.awayScore), league.settings);
                    if (Number(p.homeScore) === Number(match.homeScore) && Number(p.awayScore) === Number(match.awayScore)) exactScores++;
                }
            });
            return { user, totalPoints, exactScores };
        }).sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            return b.exactScores - a.exactScores;
        });

        const filteredLeaderboard = leaderboard.filter(entry => entry.user.name.toLowerCase().includes(leaderboardSearch.toLowerCase()));
        const getHistory = (userId: string) => {
            const lockedMatches = matches.filter(m => isPredictionLocked(m.date, currentTime)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return lockedMatches.map(m => {
                const pred = predictions.find(p => p.matchId === m.id && p.userId === userId && p.leagueId === league.id);
                return { match: m, pred };
            });
        };
        const selectedUser = selectedUserId ? users.find(u => u.id === selectedUserId) : null;
        const fullHistory = selectedUserId ? getHistory(selectedUserId) : [];
        const filteredHistory = fullHistory.filter(item => {
            if (histPhase !== 'all' && item.match.phase !== histPhase) return false;
            if (histGroup !== 'all' && (!item.match.group || item.match.group !== histGroup)) return false;
            if (histRound !== 'all') { if (item.match.phase !== Phase.GROUP) return false; const round = getMatchRound(item.match); if (round?.toString() !== histRound) return false; }
            return true;
        });

        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm min-h-[500px] relative overflow-hidden">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-3 text-xs md:text-sm font-medium border-b border-blue-100 dark:border-blue-800 flex items-center justify-center gap-2 text-center">
                    <MousePointerClick size={16} /><span>Clique no participante para ver o histórico detalhado.</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center gap-2"><span className="text-sm font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Visualizar Pontos:</span><div className="relative w-full md:w-auto flex-1"><select value={leaderboardView} onChange={(e) => setLeaderboardView(e.target.value)} className="w-full bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow focus:border-brasil-yellow block p-2.5 pr-8 shadow-md transition-colors hover:bg-blue-900 cursor-pointer"><option value="total" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Pontuação Total</option><option value="1" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">1ª Rodada (Grupos)</option><option value="2" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">2ª Rodada (Grupos)</option><option value="3" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">3ª Rodada (Grupos)</option><option value="group_phase" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase de Grupos (Completa)</option><option value="knockout" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Mata-Mata</option></select><ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" /></div></div>
                    <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="Buscar participante..." value={leaderboardSearch} onChange={(e) => setLeaderboardSearch(e.target.value)} className="w-full pl-10 pr-8 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg text-sm focus:ring-1 focus:ring-brasil-blue focus:border-brasil-blue outline-none" />{leaderboardSearch && (<button onClick={() => setLeaderboardSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>)}</div>
                </div>
                <table className="w-full text-sm md:text-base">
                    <thead className="bg-brasil-blue dark:bg-blue-900 text-white"><tr><th className="px-2 py-3 text-center w-12 md:w-16 text-xs md:text-sm">#</th><th className="px-2 py-3 text-left">Participante</th><th className="hidden md:table-cell px-2 py-3 text-center w-24"><span className="flex items-center justify-center gap-1 text-xs uppercase bg-white/20 px-2 py-1 rounded"><Target size={14} /> Cravadas</span></th><th className="px-2 py-3 text-right w-14 md:w-20">Pts</th>{isAdmin ? <th className="px-2 py-3 w-8 md:w-10"></th> : <th className=""></th>}</tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredLeaderboard.length === 0 ? <tr><td colSpan={5} className="text-center py-8 text-gray-400 italic">Nenhum participante encontrado.</td></tr> : filteredLeaderboard.map((entry, idx) => { const rank = idx + 1; return (<tr key={entry.user.id} className={entry.user.id === currentUser.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}><td className="px-2 py-3 font-bold text-center text-sm align-middle">{rank === 1 ? <div className="w-6 h-6 mx-auto bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center shadow-sm font-black text-xs">1</div> : rank === 2 ? <div className="w-6 h-6 mx-auto bg-gray-300 text-gray-800 rounded-full flex items-center justify-center shadow-sm font-black text-xs">2</div> : rank === 3 ? <div className="w-6 h-6 mx-auto bg-orange-400 text-orange-900 rounded-full flex items-center justify-center shadow-sm font-black text-xs">3</div> : <span className="text-gray-500 dark:text-gray-400">#{rank}</span>}</td><td className="px-2 py-3 relative"><div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => setSelectedUserId(entry.user.id)}><img src={entry.user.avatar} className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-200 dark:bg-gray-600 shrink-0" alt="" /><div className="flex flex-col"><span className="font-medium decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-4 group-hover:text-brasil-blue dark:group-hover:text-blue-400 group-hover:underline text-sm md:text-base line-clamp-1 text-gray-900 dark:text-white flex items-center gap-1">{entry.user.name} {entry.user.isPro && <Zap size={12} className="text-yellow-400 fill-yellow-400" />} {entry.user.id === currentUser.id && <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">(Você)</span>}</span><span className="md:hidden text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5"><Target size={10} className="text-brasil-blue dark:text-blue-400" />{entry.exactScores} cravadas</span></div><Eye size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto hidden md:block" /></div></td><td className="hidden md:table-cell px-2 py-3 text-center"><span className="bg-blue-50 dark:bg-blue-900/30 text-brasil-blue dark:text-blue-300 font-bold px-2 py-1 rounded text-sm">{entry.exactScores}</span></td><td className="px-2 py-3 text-right font-bold text-brasil-green dark:text-green-400 text-base md:text-lg">{entry.totalPoints}</td>{isAdmin && <td className="px-2 py-3 text-center">{entry.user.id !== currentUser.id && (<button type="button" onClick={(e) => initiateRemoveUser(e, entry.user.id, entry.user.name)} className="text-red-300 hover:text-red-500 dark:hover:text-red-400 p-2 rounded transition-colors z-10 relative"><Trash2 size={18} /></button>)}</td>}</tr>); })}
                    </tbody>
                </table>
                {selectedUserId && selectedUser && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedUserId(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-brasil-blue dark:bg-blue-900 text-white p-4 flex justify-between items-center shrink-0"><div className="flex items-center gap-3"><img src={selectedUser.avatar} className="w-10 h-10 rounded-full border-2 border-white/30" alt="" /><div><h3 className="font-bold text-lg leading-tight">{selectedUser.name}</h3><p className="text-xs text-blue-200">Histórico de Palpites</p></div></div><button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button></div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-200 dark:border-gray-600 flex flex-col gap-2 shrink-0">
                                <div className="flex justify-between items-center px-1"><div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase flex items-center gap-1"><Filter size={12} /> Filtrar Jogos</span>{hasHistoryFilters && (<button onClick={clearHistoryFilters} className="text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1 bg-white dark:bg-gray-600 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded shadow-sm"><X size={10} /> Limpar</button>)}</div><span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">{filteredHistory.length} resultados</span></div>
                                <div className="flex flex-wrap gap-2 pb-1"><select value={histPhase} onChange={(e) => { setHistPhase(e.target.value); if (e.target.value !== Phase.GROUP) { setHistGroup('all'); setHistRound('all'); } }} className="w-full sm:w-auto flex-1 min-w-[120px] text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue"><option value="all">Todas as Fases</option>{Object.values(Phase).map(p => <option key={p} value={p}>{p}</option>)}</select>{(histPhase === 'all' || histPhase === Phase.GROUP) && (<><select value={histGroup} onChange={(e) => setHistGroup(e.target.value)} className="flex-1 min-w-[45%] text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue"><option value="all">Todos Grupos</option>{groupsList.map(g => <option key={g} value={g}>Grupo {g}</option>)}</select><select value={histRound} onChange={(e) => setHistRound(e.target.value)} className="flex-1 min-w-[45%] text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue"><option value="all">Todas Rodadas</option><option value="1">1ª Rodada</option><option value="2">2ª Rodada</option><option value="3">3ª Rodada</option></select></>)}</div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50 dark:bg-gray-800/50">{filteredHistory.length === 0 ? <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 gap-2"><Search size={32} className="opacity-20" /><p className="text-sm italic">Nenhum palpite encontrado.</p></div> : <div className="divide-y divide-gray-100 dark:divide-gray-700">{filteredHistory.map(({ match, pred }) => { const isLive = match.status === MatchStatus.IN_PROGRESS; const isFinished = match.status === MatchStatus.FINISHED; const mRound = getMatchRound(match); const matchDate = new Date(match.date); const isDateValid = !isNaN(matchDate.getTime()); let histPoints = 0; if ((isLive || isFinished) && match.homeScore !== null && match.awayScore !== null && pred) { histPoints = calculatePoints(Number(pred.homeScore), Number(pred.awayScore), Number(match.homeScore), Number(match.awayScore), league.settings); } return (<div key={match.id} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"><div className="flex justify-between items-center mb-3"><div className="flex items-center gap-2 text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500"><Calendar size={12} /><span>{isDateValid ? matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Data Inválida'}</span><span>•</span><span>{match.phase}</span>{mRound && <span>• {mRound}ª R</span>}</div>{isLive && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">AO VIVO</span>}</div><div className="flex flex-col items-center mb-4"><div className="flex items-center gap-6 mb-2"><img src={getTeamFlag(match.homeTeamId)} className="w-10 h-7 object-cover rounded shadow-sm" alt={match.homeTeamId} /><span className="text-gray-300 dark:text-gray-600 text-xs font-bold">X</span><img src={getTeamFlag(match.awayTeamId)} className="w-10 h-7 object-cover rounded shadow-sm" alt={match.awayTeamId} /></div><div className="text-sm font-black text-gray-900 dark:text-white text-center uppercase tracking-tight">{match.homeTeamId} <span className="text-gray-400 dark:text-gray-500 font-normal mx-1">x</span> {match.awayTeamId}</div></div><div className="flex items-stretch rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"><div className="flex-1 bg-gray-50 dark:bg-gray-700 p-2 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-600"><span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">Placar Oficial</span><div className={`text-xl font-black ${isLive ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-gray-800 dark:text-white'}`}>{match.homeScore ?? '-'} <span className="text-gray-300 dark:text-gray-600 text-sm">x</span> {match.awayScore ?? '-'}</div></div><div className="flex-1 bg-white dark:bg-gray-800 p-2 flex flex-col items-center justify-center relative"><span className="text-[9px] uppercase font-bold text-brasil-blue dark:text-blue-400 mb-1">Palpite</span><div className="text-xl font-black text-gray-800 dark:text-white">{pred ? <>{pred.homeScore} <span className="text-gray-300 dark:text-gray-600 text-sm">x</span> {pred.awayScore}</> : <span className="text-gray-300 dark:text-gray-600">-</span>}</div>{(isFinished || isLive) && pred && (<div className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${histPoints > 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>{histPoints > 0 ? `+${histPoints}` : '0'} pts</div>)}</div></div></div>); })}</div>}</div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderRegrasTab = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><Target size={24} className="text-brasil-blue dark:text-blue-400" /> Sistema de Pontuação</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-brasil-blue dark:text-blue-400 mb-2">{league.settings?.exactScore ?? 10}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Na Mosca</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o placar exato do jogo.<br /><span className="text-blue-600 dark:text-blue-300 font-medium">Ex: Apostou 2x1 e foi 2x1.</span></p></div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-green-700 dark:text-green-400 mb-2">{league.settings?.winnerAndDiff ?? 7}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Vencedor + Saldo</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o vencedor e a diferença de gols.<br /><span className="text-green-700 dark:text-green-300 font-medium">Ex: Apostou 3x1 e foi 2x0.</span></p></div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-xl border border-yellow-100 dark:border-yellow-800 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-yellow-700 dark:text-yellow-400 mb-2">{league.settings?.draw ?? 7}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Empate (Não Exato)</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o empate, mas placar diferente.<br /><span className="text-yellow-800 dark:text-yellow-300 font-medium">Ex: Apostou 1x1 e foi 2x2.</span></p></div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-gray-600 dark:text-gray-400 mb-2">{league.settings?.winner ?? 5}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Apenas Vencedor</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou quem ganhou, mas errou o saldo.<br /><span className="text-gray-500 dark:text-gray-300 font-medium">Ex: Apostou 2x1 e foi 4x0.</span></p></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><Crown size={20} className="text-yellow-600 dark:text-yellow-400" /> Critérios de Desempate</h4>
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300"><li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-brasil-blue dark:bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">1º</span><span>Maior <strong>Pontuação Total</strong> acumulada.</span></li><li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">2º</span><span>Maior número de <strong>Cravadas</strong> (Acerto exato do placar).</span></li><li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">3º</span><span>Maior pontuação obtida na <strong>Fase de Mata-Mata</strong>.</span></li></ul>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4 rounded-r-xl flex gap-3 text-sm text-orange-900 dark:text-orange-200 items-start shadow-sm"><AlertCircle className="shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" size={20} /><div><span className="font-bold block mb-1 text-orange-800 dark:text-orange-300 text-base">Atenção aos Jogos de Mata-Mata</span><p className="leading-relaxed">Em caso de empate no tempo normal que leve à prorrogação, <strong>o placar final considerado será o resultado após os 120 minutos (Tempo Normal + Prorrogação)</strong>.<br /><span className="font-semibold text-red-600 dark:text-red-400">A disputa de pênaltis NÃO conta para o placar do bolão.</span></p></div></div>
            </div>
        );
    };

    const renderAdminTab = () => {
        if (!isAdmin) return null;
        const pendingUsers = league.pendingRequests.map(uid => users.find(u => u.id === uid)).filter(Boolean) as User[];
        const isFull = league.participants.length >= limit;

        // Upgrade Logic
        let targetPlan = '', upgradeText = '', upgradeLimit = '';
        if (isFree) { targetPlan = 'VIP Básico'; upgradeLimit = 'Até 50 Participantes'; upgradeText = 'Liberar VIP Básico'; }
        else if (isBasic) { targetPlan = 'VIP Top'; upgradeLimit = 'Até 100 Participantes'; upgradeText = 'Liberar VIP Top'; }
        else if (isVip) { targetPlan = 'VIP Master'; upgradeLimit = 'Até 200 Participantes'; upgradeText = 'Liberar VIP Master'; }
        else if (isMaster) { targetPlan = 'VIP Ilimitado'; upgradeLimit = 'Participantes ILIMITADOS'; upgradeText = 'Liberar VIP Ilimitado'; }
        const whatsAppLink = `https://wa.me/5515997165772?text=Olá, gostaria de assinar o plano ${targetPlan} para minha liga: ${encodeURIComponent(league.name)}`;
        const isAnyVip = isBasic || isVip || isMaster || isUnlimited;
        const planColor = isAnyVip ? 'bg-gradient-to-r from-gray-900 to-gray-800' : 'bg-white dark:bg-gray-800';
        const planTextColor = isUnlimited ? 'text-yellow-400' : isMaster ? 'text-green-400' : isVip ? 'text-blue-400' : isBasic ? 'text-gray-300' : 'text-gray-800 dark:text-white';
        const planBorder = isUnlimited ? 'border-yellow-600/50' : isMaster ? 'border-green-600/50' : isVip ? 'border-blue-500/50' : isBasic ? 'border-gray-600' : 'border-gray-200 dark:border-gray-700';
        const PlanIcon = isUnlimited ? InfinityIcon : isMaster ? Crown : isVip ? Star : isBasic ? StarHalf : Star;
        const iconClass = isUnlimited ? "text-yellow-400" : isMaster ? "text-green-400" : isVip ? "text-blue-400" : isBasic ? "text-gray-300" : "text-gray-400";

        return (
            <div className="space-y-6">
                <div className={`rounded-xl p-6 shadow-sm border ${planBorder} ${planColor}`}><div className="flex justify-between items-start"><div className="space-y-1"><h3 className={`font-bold text-lg flex items-center gap-2 ${planTextColor}`}><PlanIcon size={20} className={iconClass} fill={!isFree && !isUnlimited && !isBasic ? "currentColor" : "none"} strokeWidth={isUnlimited ? 3 : 2} />Plano da Liga: <span>{isUnlimited ? 'VIP ILIMITADO' : isMaster ? 'VIP MASTER' : isVip ? 'VIP TOP' : isBasic ? 'VIP BÁSICO' : 'GRATUITO'}</span></h3><p className={`text-sm ${isAnyVip ? 'text-gray-400' : 'text-gray-600 dark:text-gray-400'}`}>{isUnlimited ? "Participantes ILIMITADOS!" : `Limite atual: ${league.participants.length} / ${limit} participantes.`}</p></div>{!isUnlimited && (<button onClick={() => setShowUpgradeModal(true)} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg shadow-md shadow-yellow-200 transition-all active:scale-95 text-sm flex items-center gap-2"><Crown size={16} /> Upgrade</button>)}</div>{!isUnlimited && (<div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5 mt-4 overflow-hidden"><div className={`h-2.5 rounded-full ${league.participants.length >= limit ? 'bg-red-500' : 'bg-green-400'}`} style={{ width: `${Math.min(100, (league.participants.length / limit) * 100)}%` }}></div></div>)}</div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">Solicitações Pendentes {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingUsers.length}</span>}</h3>{pendingUsers.length === 0 ? (<p className="text-gray-400 italic">Nenhuma solicitação pendente.</p>) : (<div className="space-y-3">{pendingUsers.map(u => (<div key={u.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"><div className="flex items-center gap-3"><img src={u.avatar} className="w-8 h-8 rounded-full" /><span>{u.name}</span></div><div className="flex gap-2"><button onClick={() => approveUser(league.id, u.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={18} /></button><button onClick={() => rejectUser(league.id, u.id)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={18} /></button></div></div>))}</div>)}</div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2"><Mail size={20} className="text-brasil-blue dark:text-blue-400" /> Convidar Participantes</h3>{isFull ? (<div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center gap-3"><AlertTriangle size={24} className="shrink-0" /><span className="text-sm"><strong>Limite Atingido:</strong> Esta liga já possui o número máximo de {limit} participantes do plano atual. Para convidar mais amigos, faça um upgrade.</span></div>) : (<><form onSubmit={handleSearchUser} className="flex gap-2 mb-4"><input type="email" required value={adminInviteEmail} onChange={(e) => setAdminInviteEmail(e.target.value)} placeholder="E-mail de cadastro do usuário" className="flex-1 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brasil-blue outline-none disabled:opacity-50" disabled={searchStatus === 'found'} />{searchStatus !== 'found' ? (<button type="submit" disabled={searchStatus === 'searching'} className="bg-brasil-blue hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50">{searchStatus === 'searching' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}<span className="hidden sm:inline">Buscar</span></button>) : (<button type="button" onClick={handleClearSearch} className="bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all"><X size={20} /></button>)}</form>{searchStatus === 'found' && foundUser && (<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2"><div className="flex items-center gap-3"><img src={foundUser.avatar} alt={foundUser.name} className="w-12 h-12 rounded-full border-2 border-white shadow-sm" /><div><p className="font-bold text-gray-800 dark:text-white">{foundUser.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{foundUser.email}</p></div></div><button onClick={handleConfirmInvite} disabled={isSendingInvite} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">{isSendingInvite ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} Confirmar Convite</button></div>)}{searchStatus === 'not_found' && (<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2"><AlertCircle size={20} /><span className="font-medium text-sm">Usuário não encontrado. Verifique se o e-mail está correto e se o usuário já possui cadastro no Bolão.</span></div>)}</>)}</div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white">Configurações da Liga</h3><div className="flex flex-col md:flex-row gap-6 items-start"><div className="flex flex-col items-center space-y-2"><input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" /><div onClick={triggerFileInput} className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-brasil-blue dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all relative group overflow-hidden bg-gray-50 dark:bg-gray-700">{editImage ? <img src={editImage} alt="Preview" className={`w-full h-full object-cover ${imageProcessing ? 'opacity-50' : ''}`} /> : <div className="flex flex-col items-center text-gray-400"><Camera size={24} /><span className="text-[10px] mt-1">Logo</span></div>}{imageProcessing && (<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-brasil-blue" size={24} /></div>)}<div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white" size={20} /></div></div><div className="text-center"><span className="text-xs text-gray-500 dark:text-gray-400 block">Alterar Imagem</span><span className="text-[10px] text-gray-400 block mt-0.5">{imageProcessing ? 'Processando...' : 'Qualquer Tamanho'}</span></div></div><div className="flex-1 w-full space-y-4"><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Liga</label><input value={league.name} disabled className="w-full border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg p-2.5 cursor-not-allowed" placeholder="Nome da liga" /><p className="text-xs text-gray-400 mt-1">O nome da liga não pode ser alterado.</p></div><div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-brasil-blue outline-none h-24 resize-none text-sm" placeholder="Adicione uma descrição para sua liga..." /></div><div className="flex items-center justify-between"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Visibilidade da Liga</label><button type="button" onClick={() => setEditIsPrivate(!editIsPrivate)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brasil-blue focus:ring-offset-2 ${editIsPrivate ? 'bg-gray-300' : 'bg-brasil-green'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${editIsPrivate ? 'translate-x-1' : 'translate-x-6'}`} /></button></div><p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 flex items-center gap-1">{editIsPrivate ? <Lock size={12} /> : <Globe size={12} />}{editIsPrivate ? 'Privada: Requer aprovação.' : 'Pública: Aberta a todos.'}</p><button onClick={handleUpdateLeague} disabled={imageProcessing || isSavingSettings} className="bg-brasil-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">{imageProcessing || isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {imageProcessing ? 'Aguarde...' : isSavingSettings ? 'Salvando...' : 'Salvar Alterações'}</button></div></div></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 shadow-sm border border-red-100 dark:border-red-800"><h3 className="font-bold text-lg mb-4 text-red-800 dark:text-red-300 flex items-center gap-2"><AlertTriangle size={20} /> Zona de Perigo</h3><p className="text-sm text-red-700 dark:text-red-300 mb-4">Ao excluir a liga, todos os dados, participantes e palpites serão permanentemente removidos. Esta ação não pode ser desfeita.</p><button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><Trash2 size={18} /> Excluir Liga e Dados</button></div>
                {showUpgradeModal && (<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-0 w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden"><div className={`p-6 text-center ${isMaster ? 'bg-gradient-to-r from-gray-900 to-gray-800' : isVip ? 'bg-gradient-to-r from-green-700 to-green-900' : isBasic ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-teal-500 to-teal-700'}`}><Crown className="w-16 h-16 text-yellow-300 mx-auto mb-2" fill="currentColor" /><h2 className="text-2xl font-black text-white uppercase tracking-wide">{targetPlan.toUpperCase()}</h2><p className="text-blue-100 mt-1 font-bold">{upgradeLimit}</p></div><div className="p-6 space-y-6"><div className="text-center space-y-2"><p className="text-gray-600 dark:text-gray-300">Para aumentar o limite da sua liga, realize o upgrade:</p><p className="text-3xl font-bold text-brasil-green">R$ 25,00</p></div><div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center">Favor entrar em contato via WhatsApp para enviar o comprovante. O desbloqueio é imediato.</div><a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3"><MessageCircle size={24} /> {upgradeText}</a><button onClick={() => setShowUpgradeModal(false)} className="block w-full text-gray-400 font-medium text-sm hover:text-gray-600 py-2">Fechar</button></div></div></div>)}
            </div>
        );
    };

    return (
        <div>
            {toast && (<div className={`fixed top-24 right-4 md:right-8 z-[100] max-w-sm w-full bg-white border-l-4 shadow-xl rounded-r-lg p-4 animate-[slideIn_0.3s_ease-out] flex items-start gap-3 transform transition-all ${toast.type === 'warning' ? 'border-yellow-500' : toast.type === 'success' ? 'border-brasil-green' : 'border-brasil-blue'}`}><div className="mt-0.5"><div className={`p-1.5 rounded-full ${toast.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-brasil-blue'}`}>{toast.type === 'warning' ? <AlertTriangle size={16} /> : toast.type === 'success' ? <Check size={16} /> : <Info size={16} />}</div></div><div className="flex-1"><h3 className="font-bold text-gray-800 text-sm">{toast.title}</h3><p className="text-gray-600 text-xs mt-0.5">{toast.message}</p></div><button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button></div>)}
            {userToRemove && (<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3 mb-4 text-red-600"><div className="bg-red-100 p-2 rounded-full"><AlertTriangle size={24} /></div><h3 className="text-lg font-bold text-gray-800 dark:text-white">Remover Participante?</h3></div><p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">Você tem certeza que deseja remover <strong>{userToRemove.name}</strong> desta liga? Essa ação removerá o acesso do usuário e não poderá ser desfeita imediatamente.</p><div className="flex gap-3"><button onClick={() => setUserToRemove(null)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-colors text-sm">Cancelar</button><button onClick={confirmRemoveUser} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md shadow-red-200 transition-all active:scale-95 text-sm">Confirmar</button></div></div></div>)}
            {showDeleteConfirm && (<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border-2 border-red-100 dark:border-red-900"><div className="flex items-center gap-3 mb-4 text-red-700 dark:text-red-400"><div className="bg-red-100 dark:bg-red-900 p-2 rounded-full"><Trash2 size={24} /></div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir Liga Permanentemente?</h3></div><div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 text-xs text-red-800 dark:text-red-200 border border-red-100 dark:border-red-800"><p className="font-bold mb-1">ATENÇÃO:</p><p>Esta ação é irreversível e apagará todos os dados.</p></div><p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">Você está prestes a excluir a liga <strong>{league.name}</strong>. Todos os palpites de todos os usuários e o ranking serão <strong>apagados do banco de dados</strong>.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-colors text-sm disabled:opacity-50">Cancelar</button><button onClick={executeDeleteLeague} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md shadow-red-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50">{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</button></div></div></div>)}
            {showLeaveConfirm && (<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3 mb-4 text-red-600"><div className="bg-red-100 p-2 rounded-full"><LogOut size={24} /></div><h3 className="text-lg font-bold text-gray-800 dark:text-white">Sair da Liga?</h3></div><p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">Tem certeza que deseja sair da liga <strong>{league.name}</strong>? Seus palpites <strong>não serão apagados</strong>, mas você deixará de pontuar no ranking.</p><div className="flex gap-3"><button onClick={() => setShowLeaveConfirm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-colors text-sm">Cancelar</button><button onClick={executeLeave} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md shadow-red-200 transition-all active:scale-95 text-sm">Sair</button></div></div></div>)}

            <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => navigate('/leagues')} className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"><div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700"><ArrowLeft size={18} /></div> Voltar para Ligas</button>
                    {isAdmin && validPendingRequestsCount > 0 && (<button onClick={() => setActiveTab('admin')} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-md transition-all animate-pulse hover:animate-none"><Bell size={16} fill="currentColor" /> {validPendingRequestsCount} Solicitações Pendentes</button>)}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {league.image ? (<img src={league.image} alt={league.name} className="w-16 h-16 rounded-full object-cover border-4 border-gray-50 dark:border-gray-700 shadow-sm" />) : (<div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-brasil-blue dark:text-blue-400"><Trophy size={32} /></div>)}
                        <div>
                            <h1 className="text-2xl font-black text-gray-800 dark:text-white">{league.name}</h1>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <span className="flex items-center gap-1">{league.isPrivate ? <Lock size={12} /> : <Globe size={12} />}{league.isPrivate ? 'Privada' : 'Aberta'}</span><span>•</span>
                                <span className="flex items-center gap-1">
                                    {isUnlimited ? (<InfinityIcon size={14} className="text-yellow-500" strokeWidth={3} />) : isMaster ? (<Crown size={14} className="text-green-600 dark:text-green-400" fill="currentColor" />) : isVip ? (<Star size={14} className="text-blue-500 dark:text-blue-400" fill="currentColor" />) : isBasic ? (<StarHalf size={14} className="text-teal-600 dark:text-teal-400" fill="currentColor" />) : null}
                                    <span className={isUnlimited ? "font-bold text-yellow-700 dark:text-yellow-400" : isMaster ? "font-bold text-green-700 dark:text-green-400" : isVip ? "font-bold text-blue-700 dark:text-blue-400" : isBasic ? "font-bold text-teal-700 dark:text-teal-400" : "text-gray-600 dark:text-gray-400"}>{isUnlimited ? 'VIP Ilimitado' : isMaster ? 'VIP Master' : isVip ? 'VIP Top' : isBasic ? 'VIP Básico' : 'Grátis'}</span>
                                </span>
                                {league.leagueCode && (<div className="hidden md:flex items-center gap-1"><span>•</span><div onClick={handleCopyCode} className="flex items-center gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-0.5 rounded transition-all select-none border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 group" title="Clique para copiar o código"><span className="font-bold text-gray-700 dark:text-gray-300 text-xs font-mono tracking-wide">Código da Liga: {league.leagueCode}</span>{copiedCode ? <Check size={12} className="text-green-600 dark:text-green-400" /> : <Copy size={12} className="text-gray-400 dark:text-gray-500 group-hover:text-brasil-blue dark:group-hover:text-blue-400" />}</div></div>)}
                            </div>
                            {league.leagueCode && (<div className="md:hidden mt-3"><div onClick={handleCopyCode} className="inline-flex items-center gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-0.5 rounded transition-all select-none border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 group" title="Clique para copiar o código"><span className="font-bold text-gray-700 dark:text-gray-300 text-xs font-mono tracking-wide">Código da Liga: {league.leagueCode}</span>{copiedCode ? <Check size={12} className="text-green-600 dark:text-green-400" /> : <Copy size={12} className="text-gray-400 dark:text-gray-500 group-hover:text-brasil-blue dark:group-hover:text-blue-400" />}</div></div>)}
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {isParticipant ? (<><button onClick={() => setIsInviteModalOpen(true)} className="flex-1 md:flex-none bg-brasil-blue text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-900 transition-colors flex items-center justify-center gap-2"><Share2 size={16} /> Convidar</button>{!isAdmin && (<button onClick={handleLeave} className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800" title="Sair da Liga"><LogOut size={18} /></button>)}</>) : (isPending ? (<button disabled className="w-full md:w-auto bg-yellow-100 text-yellow-700 px-6 py-2 rounded-lg font-bold text-sm cursor-not-allowed">Solicitação Enviada</button>) : (<button onClick={handleJoin} className="w-full md:w-auto bg-brasil-green text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"><UserPlus size={16} /> Participar da Liga</button>))}
                    </div>
                </div>
                {league.description && (<div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300"><h3 className="font-bold text-gray-800 dark:text-white mb-1">Sobre a Liga</h3><p>{league.description}</p></div>)}
            </div>

            <div className="flex gap-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-6 overflow-x-auto">
                <button onClick={() => setActiveTab('palpites')} className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'palpites' ? 'bg-white dark:bg-gray-600 shadow text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Palpites</button>
                <button onClick={() => setActiveTab('classificacao')} className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'classificacao' ? 'bg-white dark:bg-gray-600 shadow text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Classificação</button>
                <button onClick={() => setActiveTab('regras')} className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'regras' ? 'bg-white dark:bg-gray-600 shadow text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Regras</button>
                {isAdmin && <button onClick={() => setActiveTab('admin')} className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'bg-white dark:bg-gray-600 shadow text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Admin {validPendingRequestsCount > 0 && <span className="ml-2 w-2 h-2 inline-block bg-red-500 rounded-full"></span>}</button>}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'palpites' && renderPalpitesTab()}
                {activeTab === 'classificacao' && renderClassificacaoTab()}
                {activeTab === 'regras' && renderRegrasTab()}
                {activeTab === 'admin' && renderAdminTab()}
            </div>

            {isInviteModalOpen && (<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200"><h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">Convidar Amigo</h3><p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Envie um convite por e-mail para participar da liga.</p><form onSubmit={handleInvite}><input type="email" required placeholder="E-mail do amigo" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg p-3 mb-4 text-sm focus:ring-2 focus:ring-brasil-blue outline-none" /><div className="flex gap-2 justify-end"><button type="button" onClick={() => setIsInviteModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm">Cancelar</button><button type="submit" className="px-4 py-2 bg-brasil-blue text-white rounded-lg font-bold text-sm hover:bg-blue-900">Enviar Convite</button></div></form></div></div>)}
        </div>
    );
};