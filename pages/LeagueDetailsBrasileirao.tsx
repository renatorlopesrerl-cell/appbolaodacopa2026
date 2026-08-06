import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { toJpeg } from 'html-to-image';
import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { useParams, useNavigate, Link, Navigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../App';
import { getLeagueLimit } from '../leagueUtils';
import { api } from '../services/api';
import { BrasileiraoMatch as Match, MatchStatus, Phase, User, Prediction, LeaguePlan, BrasileiraoPrediction, BrasileiraoTeam } from '../types';
import { isPredictionLocked, calculatePoints, getPredictionHitType, GROUPS_CONFIG, processImageForUpload } from '../services/dataService';
import { uploadBase64Image } from '../services/storageService';
import {
    Trophy, Users, ArrowLeft, Search, Lock, Globe,
    UserPlus, LogOut, Trash2, Check, X, MousePointerClick,
    Save, Loader2, Medal, AlertCircle, Share2, Info, Filter, Plus, Clock, MapPin, CheckCircle2, Unlock, Calendar, ChevronDown, Crown, Eye,
    Target, Mail, AlertTriangle, Camera, Upload, MessageCircle, Copy, Bell, Star, StarHalf, Infinity as InfinityIcon, Zap, BarChart2,
    ChevronLeft, ChevronRight, PlayCircle, Activity
} from 'lucide-react';
import { OptimizedImage } from '../components/OptimizedImage';
import { LiveCountdown } from '../components/LiveCountdown';
import { supabase } from '../services/supabase';
import { getHistoryForTeam } from '../historyUtils';
import { fetchLeagueRankings } from '../services/rankingService';
import { useAdMobBanner } from '../hooks/useAdMobBanner';
import { fetchMatchDetails, MatchDetails } from '../services/matchDetailsService';
import { TabEscalacao, TabLances, TabScouts } from '../components/MatchTabs';

const BR_LOGOS: Record<number, string> = {
    118: '/img/teams/brasileirao/118.png?v=3',
    119: '/img/teams/brasileirao/119.png?v=3',
    120: '/img/teams/brasileirao/120.png?v=3',
    121: '/img/teams/brasileirao/121.png?v=3',
    124: '/img/teams/brasileirao/124.png?v=3',
    126: '/img/teams/brasileirao/126.png?v=3',
    127: '/img/teams/brasileirao/127.png?v=3',
    128: '/img/teams/brasileirao/128.png?v=3',
    129: '/img/teams/brasileirao/129.png?v=3',
    130: '/img/teams/brasileirao/130.png?v=3',
    131: '/img/teams/brasileirao/131.png?v=3',
    132: '/img/teams/brasileirao/132.png?v=3',
    133: '/img/teams/brasileirao/133.png?v=3',
    134: '/img/teams/brasileirao/134.png?v=3',
    135: '/img/teams/brasileirao/135.png?v=3',
    136: '/img/teams/brasileirao/136.png?v=3',
    144: '/img/teams/brasileirao/144.png?v=3',
    146: '/img/teams/brasileirao/146.png?v=3',
    147: '/img/teams/brasileirao/147.png?v=3',
    149: '/img/teams/brasileirao/149.png?v=3',
    151: '/img/teams/brasileirao/151.png?v=3',
    152: '/img/teams/brasileirao/152.png?v=3',
    154: '/img/teams/brasileirao/154.png?v=3',
    794: '/img/teams/brasileirao/794.png?v=3',
    1062: '/img/teams/brasileirao/1062.png?v=3',
    1198: '/img/teams/brasileirao/1198.png?v=3',
    1223: '/img/teams/brasileirao/1223.png?v=3',
    7772: '/img/teams/brasileirao/7772.png?v=3',
    7831: '/img/teams/brasileirao/7831.png?v=3',
    7848: '/img/teams/brasileirao/7848.png?v=3',
    13975: '/img/teams/brasileirao/13975.png?v=3',
    18271: '/img/teams/brasileirao/18271.png?v=3',
};

const LOGO_FALLBACK = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOTk5OTk5IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDJzOCAzIDggOGMwIDUtOCAxMC04IDEwUzQgMTUgNCAxMGMwLTUgOC04IDgtOHoiLz48L3N2Zz4=';

const getSafeLogo = (id: number | string | undefined, logoUrl: string | undefined) => {
    if (!id) return LOGO_FALLBACK;
    const numId = Number(id);
    if (BR_LOGOS[numId]) return BR_LOGOS[numId];
    if (logoUrl) {
        if (logoUrl.startsWith('http') || logoUrl.startsWith('/')) {
            return logoUrl;
        }
    }
    return LOGO_FALLBACK;
};
export const LeagueDetailsBrasileirao: React.FC = () => {

    const getTeamName = (id: string | number, teamsArr: any[]) => {
        if (!id) return 'TBD';
        const team = teamsArr?.find(t => String(t.id) === String(id));
        return team ? team.name : String(id);
    };

    const getTeamNameForDisplay = (id) => {
        if (!id) return String(id);
        const team = teams?.find(t => String(t.id) === String(id));
        if (!team) return String(id);
        return team.name;
    };

    const getTeamFlag = (id: string | number, teamsArr: any[]) => {
        if (!id) return LOGO_FALLBACK;
        // Agora todos os 165 times foram baixados localmente para garantir estabilidade
        return `/img/teams/brasileirao/${id}.png?v=3`;
    };

    const queryClient = useQueryClient();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const {
        currentUser, brasileiraoLeagues: leagues, brasileiraoMatches: allMatches, brasileiraoPredictions: predictions, brasileiraoTeams: teams, users, currentTime, invitations,
        joinBrasileiraoLeague: joinLeague, deleteBrasileiraoLeague: deleteLeague, approveBrasileiraoUser: approveUser, rejectBrasileiraoUser: rejectUser,
        removeUserFromBrasileiraoLeague: removeUserFromLeague, submitPredictions, sendBrasileiraoLeagueInvite: sendLeagueInvite, updateBrasileiraoLeague: updateLeague, loading, refreshPredictions, isRefreshingPredictions,
        topFinisherPredictions, topFinishersResult, submitTopFinisherPrediction, loadLeagueData, fetchLeagueTopFinisherPredictions,
        fetchMatchPredictions, syncLiveBrasileiraoMatches,
        hasWatchedPredictionAd, setHasWatchedPredictionAd,
        hasWatchedStatsAd, setHasWatchedStatsAd
    } = useStore();

    const league = leagues.find(l => l.id === id);
    const allowedCompetitions: string[] = useMemo(() => league?.settings?.competitions || ['brasileirao', 'copa_do_brasil', 'libertadores'], [league?.settings?.competitions]);

    // Preload dos escudos dos times para evitar demora na renderização
    useEffect(() => {
        Object.values(BR_LOGOS).forEach(url => {
            const img = new Image();
            img.src = url as string;
        });
    }, []);

    // Os palpites do próprio usuário são baixados dentro do loadLeagueData (linha ~640),
    // que bloqueia a tela via isLeagueLoading. Não é necessário um refreshPredictions
    // paralelo aqui — ele causava delay/flash nos palpites após a tela abrir.

    const matches = useMemo(() => {
        return allMatches.filter(m => {
            if (!allowedCompetitions.includes(m.championship || 'brasileirao')) return false;
            if (m.phase) {
                const p = m.phase.toLowerCase();
                if ((m.championship === 'libertadores' || m.championship === 'sul_americana') && (p.includes('group stage') || p.includes('qualification') || p.includes('play-offs'))) {
                    return false;
                }
                if ((m.championship === 'sul_americana' || m.championship === 'copa_do_brasil') && p.includes('round of 32')) {
                    return false;
                }
                
                // Excluir jogos do Brasileirǜo antes da rodada 20
                if (m.championship === 'brasileirao' || m.championship === 'undefined' || !m.championship) {
                    if (p.includes('rodada ')) {
                        const num = parseInt(p.split('rodada ')[1], 10);
                        if (!isNaN(num) && num < 20) return false;
                    } else if (p.includes('regular season - ')) {
                        const num = parseInt(p.split('regular season - ')[1], 10);
                        if (!isNaN(num) && num < 20) return false;
                    }
                }
            }
            return true;
        });
    }, [allMatches, allowedCompetitions]);
    const [activeTab, setActiveTab] = useState<'palpites' | 'classificacao' | 'regras' | 'admin'>('palpites');
    const [roundParticipants, setRoundParticipants] = useState<Record<string, string[]> | null>(null);

    useEffect(() => {
        if ((activeTab === 'classificacao' || activeTab === 'admin') && roundParticipants === null && league?.id) {
            const fetchRoundParticipants = async () => {
                try {
                    const { data } = await supabase
                        .from('brasileirao_leagues')
                        .select('round_participants')
                        .eq('id', league.id)
                        .single();
                    
                    setRoundParticipants(data?.round_participants || {});
                } catch (e) {
                    console.error('Error fetching round participants', e);
                    setRoundParticipants({});
                }
            };
            fetchRoundParticipants();
        }
    }, [activeTab, roundParticipants, league?.id]);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [leaderboardView, setLeaderboardView] = useState<string>('total');
    
    // Sub-pool admin configuration states
    const [adminSubpoolComp, setAdminSubpoolComp] = useState('brasileirao');
    const [adminSubpoolPeriod, setAdminSubpoolPeriod] = useState('');
    const [adminSubpoolUsers, setAdminSubpoolUsers] = useState<string[]>([]);

    useEffect(() => {
        if (adminSubpoolPeriod && roundParticipants) {
            setAdminSubpoolUsers(roundParticipants[adminSubpoolPeriod] || []);
        }
    }, [roundParticipants, adminSubpoolPeriod]);
    const [isSavingSubpool, setIsSavingSubpool] = useState(false);
    
    // Leaderboard toggle state
    const [showOnlyRoundParticipants, setShowOnlyRoundParticipants] = useState(false);
    // competitionFilter: 'total' = ambas, 'brasileirao' = só Brasileirão, 'copa' = só Copa do Brasil
    const [competitionFilter, setCompetitionFilter] = useState<'total' | 'brasileirao' | 'copa' | 'libertadores' | 'sul_americana'>('total');
    // subPeriod: para Brasileirão = rodada (ex: '19'), para Copa = fase (ex: 'copa_oitavas')
    const [subPeriod, setSubPeriod] = useState<string>('all');

    const [rankingsByPeriod, setRankingsByPeriod] = useState<Record<string, any[]>>({});
    const [loadingPeriod, setLoadingPeriod] = useState<number | null>(null);

    const loadRankingsForPeriod = async (period: string, forceRefresh = false) => {
        if (!id) return;
        if (!forceRefresh && rankingsByPeriod[period]) {
            return;
        }
        setLoadingPeriod(period as any);
        try {
            const data = await fetchLeagueRankings(id, 'brasileirao', period);
            setRankingsByPeriod(prev => ({
                ...prev,
                [period]: data
            }));
        } catch (error) {
            console.error(`Error loading rankings for period ${period}:`, error);
        } finally {
            setLoadingPeriod(null);
        }
    };
    // Computar o período efetivo para busca no banco com base nos filtros de competição + subPeriodo
    const effectivePeriod = (() => {
        // Se for liga mono-competição, o competitionFilter fica 'total' mas precisamos respeitar o subPeriod
        if (allowedCompetitions.length === 1) {
            if (allowedCompetitions.includes('brasileirao')) {
                if (subPeriod !== 'all') return subPeriod;
                return 'total';
            }
            if (allowedCompetitions.includes('copa_do_brasil') || allowedCompetitions.includes('libertadores') || allowedCompetitions.includes('sul_americana')) {
                if (subPeriod !== 'all') return subPeriod;
                return 'total';
            }
        }

        if (competitionFilter === 'brasileirao') {
            if (subPeriod !== 'all') return subPeriod;
            return 'brasileirao_total';
        }
        if (competitionFilter === 'copa') {
            if (subPeriod !== 'all') return subPeriod;
            return 'copa_total';
        }
        if (competitionFilter === 'libertadores') {
            if (subPeriod !== 'all') return subPeriod;
            return 'libertadores_total';
        }
        if (competitionFilter === 'sul_americana') {
            if (subPeriod !== 'all') return subPeriod;
            return 'sul_americana_total';
        }
        if (competitionFilter === 'total') {
            if (subPeriod !== 'all') return subPeriod;
            return 'total';
        }

        return 'total';
    })();

    useEffect(() => {
        if (id) {
            loadRankingsForPeriod(effectivePeriod);
        }
        
        if (activeTab === 'classificacao' && id) {
            // Sync leaderboardView with effectivePeriod for the leaderboard calculation
            setLeaderboardView(effectivePeriod);
        }
    }, [activeTab, id, effectivePeriod]);



    useEffect(() => {
        if (activeTab === 'classificacao' && id && isRefreshingPredictions === false) {
            loadRankingsForPeriod(effectivePeriod, true);
        }
    }, [isRefreshingPredictions]);

    const prevMatchesRef = useRef(allMatches);
    useEffect(() => {
        if (prevMatchesRef.current !== allMatches) {
            prevMatchesRef.current = allMatches;
            // Quando os placares são atualizados no App.tsx pelo polling a cada 30 seg
            if (activeTab === 'classificacao' && id) {
                loadRankingsForPeriod(effectivePeriod, true);
            } else {
                // Invalida o cache se estiver em outra aba
                setRankingsByPeriod({});
            }
        }
    }, [allMatches, activeTab, effectivePeriod, id]);

    useEffect(() => {
        if (activeTab === 'palpites' && league) {
            syncLiveBrasileiraoMatches(allowedCompetitions);
        }
    }, [activeTab, league]);

    useEffect(() => {
        if (!window.visualViewport) return;
        const handleResize = () => {
            setIsKeyboardOpen(window.visualViewport!.height < window.innerHeight * 0.8);
        };
        window.visualViewport.addEventListener('resize', handleResize);
        return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }, []);

    const adMobModuleRef = useRef<any>(null); // used for rewarded interstitial below

    // --- ADMOB REWARDED INTERSTITIAL ---
    const [pendingMatchModal, setPendingMatchModal] = useState<string | null>(null);
    const [pendingStatsModal, setPendingStatsModal] = useState<string | null>(null);
    const [isPreparingAd, setIsPreparingAd] = useState<boolean>(false);
    const adStateRef = useRef({ hasWatched: hasWatchedPredictionAd, hasWatchedStats: hasWatchedStatsAd, pendingMatch: pendingMatchModal, pendingStats: pendingStatsModal });
    adStateRef.current = { hasWatched: hasWatchedPredictionAd, hasWatchedStats: hasWatchedStatsAd, pendingMatch: pendingMatchModal, pendingStats: pendingStatsModal };

    useEffect(() => {
        if (!Capacitor.isNativePlatform()) return;

        const foundLeague = leagues.find(l => l.id === id);
        const leaguePlan = foundLeague?.settings?.plan || (foundLeague?.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
        const isVipLeague = leaguePlan !== 'FREE';
        const isProUser = !!currentUser?.isPro;

        if (isProUser || isVipLeague) return;

        let isMounted = true;
        let listeners: any[] = [];

        (async () => {
            try {
                if (!adMobModuleRef.current) {
                    adMobModuleRef.current = await import('@capacitor-community/admob');
                }
                await adMobModuleRef.current.AdMob.initialize();
                if (!isMounted) return;
                const { AdMob, RewardInterstitialAdPluginEvents } = adMobModuleRef.current;

                const rewardListener = await AdMob.addListener(RewardInterstitialAdPluginEvents.Rewarded, (rewardItem: any) => {
                    const { pendingStats } = adStateRef.current;
                    if (pendingStats) {
                        setHasWatchedStatsAd(true);
                    } else {
                        setHasWatchedPredictionAd(true);
                    }
                });

                const dismissListener = await AdMob.addListener(RewardInterstitialAdPluginEvents.Dismissed, () => {
                    const { hasWatched, hasWatchedStats, pendingMatch, pendingStats } = adStateRef.current;
                    if (pendingStats && hasWatchedStats) {
                        setSelectedMatchForStats(Number(pendingStats));
                    } else if (pendingMatch && hasWatched) {
                        setSelectedMatchForDetails(Number(pendingMatch));
                        setMatchDetailsSearch('');
                    }
                    setPendingMatchModal(null);
                    setPendingStatsModal(null);
                    // Prepare next ad
                    AdMob.prepareRewardInterstitialAd({ adId: 'ca-app-pub-7684468298593275/3499840425', isTesting: false }).catch(() => { });
                });

                listeners.push(rewardListener, dismissListener);

                await AdMob.prepareRewardInterstitialAd({ adId: 'ca-app-pub-7684468298593275/3499840425', isTesting: false });
            } catch (e) { console.error('AdMob prepare error:', e); }
        })();

        return () => {
            isMounted = false;
            listeners.forEach(l => l.remove());
        };
    }, [id, currentUser?.isPro]);

    // Handle Deep Linking Tabs
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'admin') setActiveTab('admin');
        else if (tabParam === 'classificacao') setActiveTab('classificacao');
        else if (tabParam === 'regras') setActiveTab('regras');
    }, [searchParams]);

    // --- GLOBAL STATE (HOISTED) ---

    const [toast, setToast] = useState<{ title: string; message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [userToRemove, setUserToRemove] = useState<{ id: string; name: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showPricingModal, setShowPricingModal] = useState(false);
    const [copiedCode, setCopiedCode] = useState(false);

    // --- PALPITES TAB STATE (HOISTED) ---
    const [pendingEdits, setPendingEdits] = useState<Record<string, { home: string, away: string }>>({});

    const validHistoryRef = useRef<string[]>([]);
    const [targetMatchForButton, setTargetMatchForButton] = useState<string | null>(null);

    useEffect(() => {
        const currentValid = Object.entries(pendingEdits)
            .filter(([_, val]) => val.home !== '' && val.away !== '')
            .map(([id, _]) => id);

        validHistoryRef.current = validHistoryRef.current.filter(id => currentValid.includes(id));

        currentValid.forEach(id => {
            if (!validHistoryRef.current.includes(id)) {
                validHistoryRef.current.push(id);
            }
        });

        const latest = validHistoryRef.current.length > 0
            ? validHistoryRef.current[validHistoryRef.current.length - 1]
            : null;

        setTargetMatchForButton(latest);
    }, [pendingEdits]);

    const [selectedMatchForDetails, setSelectedMatchForDetails] = useState<string | number | null>(null);
    const [matchDetailedStats, setMatchDetailedStats] = useState<any>(null);
    const [isLoadingDetailedStats, setIsLoadingDetailedStats] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [selectedMatchForStats, setSelectedMatchForStats] = useState<string | number | null>(null);
    const [apiMatchStats, setApiMatchStats] = useState<any>(null);
    const [statsStandings, setStatsStandings] = useState<any[]>([]);


    const [teamHistoryData, setTeamHistoryData] = useState<any[]>([]);
    const teamHistoryCacheRef = useRef<Record<string | number, any[]>>({}); // M5: cache de sessão por matchId

    useEffect(() => {
        if (!selectedMatchForStats || !league) {
            setTeamHistoryData(prev => prev.length === 0 ? prev : []);
            return;
        }

        // M5: Verificar cache em memória antes de ir ao banco (dados FINISHED são imutuáveis)
        if (teamHistoryCacheRef.current[selectedMatchForStats]) {
            setTeamHistoryData(teamHistoryCacheRef.current[selectedMatchForStats]);
            return;
        }

        const fetchHistory = async () => {
            const sm = matches.find(m => m.id == selectedMatchForStats);
            if (!sm) return;
            
            const comps = allowedCompetitions.length ? allowedCompetitions : ['brasileirao', 'copa_do_brasil', 'libertadores', 'sul_americana'];
            
            const { data, error } = await supabase
                .from('brasileirao_matches')
                .select('id, home_team_id, away_team_id, date, location, phase, status, home_score, away_score, championship, is_blocked, match_time')
                .or(`home_team_id.eq.${sm.home_team_id},away_team_id.eq.${sm.home_team_id},home_team_id.eq.${sm.away_team_id},away_team_id.eq.${sm.away_team_id}`)
                .in('championship', comps)
                .lt('date', sm.date)
                .eq('status', 'FINISHED')
                .order('date', { ascending: false })
                .limit(40);
                
            if (!error && data) {
                teamHistoryCacheRef.current[selectedMatchForStats] = data as any[]; // M5: salvar no cache
                setTeamHistoryData(data as any[]);
            }
        };

        fetchHistory();
    }, [selectedMatchForStats, matches, league?.id, allowedCompetitions]);

    const [matchDetailsSearch, setMatchDetailsSearch] = useState('');
    const [matchDetailsPage, setMatchDetailsPage] = useState(1);
    const [statsSearch, setStatsSearch] = useState('');
    const [statsPageSaved, setStatsPageSaved] = useState(1);
    const [statsPagePending, setStatsPagePending] = useState(1);
    const [isSavingPalpites, setIsSavingPalpites] = useState(false);
    const [palpitesCompetition, setPalpitesCompetition] = useState<'all' | 'brasileirao' | 'copa' | 'libertadores' | 'sul_americana'>('all');
    const [palpitesSubPeriod, setPalpitesSubPeriod] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'predicted' | 'missing' | 'upcoming' | 'live' | 'finished'>('upcoming');

    // --- CLASSIFICACAO TAB STATE (HOISTED) ---
    const [showUnsavedModal, setShowUnsavedModal] = useState<{ action: () => void } | null>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    const [leaderboardSearch, setLeaderboardSearch] = useState('');
    const [leaderboardPage, setLeaderboardPage] = useState(1);
    const [histCompetition, setHistCompetition] = useState<'all' | 'brasileirao' | 'copa' | 'libertadores' | 'sul_americana'>('all');
    const [histSubPeriod, setHistSubPeriod] = useState<string>('all');

    // --- SHARE STATE ---
    const [isSharingImage, setIsSharingImage] = useState(false);

    const [activeDetailsTab, setActiveDetailsTab] = useState<'palpites'|'escalacao'|'lances'|'scouts'>('palpites');
    const [activeStatsTab, setActiveStatsTab] = useState<'estatisticas'|'escalacao'|'lances'|'scouts'>('estatisticas');
    const [matchLazyDetails, setMatchLazyDetails] = useState<MatchDetails | null>(null);
    const [isLoadingLazyDetails, setIsLoadingLazyDetails] = useState(false);

    useEffect(() => {
        if (selectedMatchForDetails && activeDetailsTab !== 'palpites') {
            if (!matchLazyDetails) {
                setIsLoadingLazyDetails(true);
                fetchMatchDetails(selectedMatchForDetails).then(res => {
                    setMatchLazyDetails(res);
                    setIsLoadingLazyDetails(false);
                });
            }
        }
    }, [selectedMatchForDetails, activeDetailsTab]);

    useEffect(() => {
        if (selectedMatchForStats && activeStatsTab !== 'estatisticas') {
            if (!matchLazyDetails) {
                setIsLoadingLazyDetails(true);
                fetchMatchDetails(selectedMatchForStats).then(res => {
                    setMatchLazyDetails(res);
                    setIsLoadingLazyDetails(false);
                });
            }
        }
    }, [selectedMatchForStats, activeStatsTab]);

    useEffect(() => {
        if (!selectedMatchForDetails && !selectedMatchForStats) {
            setMatchLazyDetails(null);
            setActiveDetailsTab('palpites');
            setActiveStatsTab('estatisticas');
        }
    }, [selectedMatchForDetails, selectedMatchForStats]);
    const shareRef = useRef<HTMLDivElement>(null);

    const handleShareLeaderboard = async () => {
        if (!shareRef.current || !league) return;
        setIsSharingImage(true);
        setToast({ title: 'Aguarde', message: 'Gerando imagem do Top 10...', type: 'info' });
        await new Promise(resolve => setTimeout(resolve, 300));
        try {
            const dataUrl = await toJpeg(shareRef.current, {
                pixelRatio: 0.5,
                quality: 0.8,
                width: 1080,
                height: 1920,
                style: { transform: 'none' },
                skipFonts: true,
                imagePlaceholder: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            });

            if (Capacitor.isNativePlatform()) {
                const fileName = `Top10_${league.id}_${new Date().getTime()}.jpg`;
                const base64Data = dataUrl.split(',')[1];

                const savedFile = await Filesystem.writeFile({
                    path: fileName,
                    data: base64Data,
                    directory: Directory.Cache
                });

                await Share.share({
                    title: `Top 10 - ${league.name}`,
                    url: savedFile.uri,
                });
                setToast(null);
            } else {
                const res = await fetch(dataUrl);
                const blob = await res.blob();

                if (blob) {
                    const file = new File([blob], 'top10.jpg', { type: 'image/jpeg' });
                    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: `Top 10 - ${league.name}`,
                            files: [file]
                        });
                        setToast(null);
                    } else {
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Top10_${league.name}.jpg`;
                        a.click();
                        URL.revokeObjectURL(url);
                        setToast({ title: 'Sucesso', message: 'Imagem baixada com sucesso!', type: 'success' });
                    }
                }
            }
        } catch (error: any) {
            console.error('Error sharing image:', error);
            if (error?.name === 'AbortError') {
                setToast(null);
            } else {
                setToast({ title: 'Erro', message: `Erro: ${error?.message || 'Desconhecido. Verifique CORS.'}`, type: 'warning' });
            }
        } finally {
            setIsSharingImage(false);
        }
    };
    // --- ADMIN TAB STATE (HOISTED) ---
    const [editImage, setEditImage] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPrivate, setEditIsPrivate] = useState(false);
    const [imageProcessing, setImageProcessing] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isSavingScoring, setIsSavingScoring] = useState(false);
    const [editExactScore, setEditExactScore] = useState<number | string>(10);
    const [editWinnerAndDiff, setEditWinnerAndDiff] = useState<number | string>(7);
    const [editWinnerAndWinnerGoals, setEditWinnerAndWinnerGoals] = useState<number | string>(6);
    const [editDraw, setEditDraw] = useState<number | string>(7);
    const [editWinner, setEditWinner] = useState<number | string>(5);
    const [adminInviteEmail, setAdminInviteEmail] = useState('');
    const [isSendingInvite, setIsSendingInvite] = useState(false);
    const [foundUser, setFoundUser] = useState<User | null>(null);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'searching' | 'found' | 'not_found'>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const isPrivateInitialized = useRef(false);

    // --- TOP FINISHERS STATE ---
    const [tfChampion, setTfChampion] = useState('');
    const [tfRunnerUp, setTfRunnerUp] = useState('');
    const [tfThird, setTfThird] = useState('');
    const [tfFourth, setTfFourth] = useState('');
    const [isSavingTopFinishers, setIsSavingTopFinishers] = useState(false);
    const [editTopFinishersEnabled, setEditTopFinishersEnabled] = useState(false);
    const [editTopFinishersPoints, setEditTopFinishersPoints] = useState({ champion: 20, runnerUp: 15, third: 10, fourth: 5 });
    const [showTopFinishersModal, setShowTopFinishersModal] = useState(false);
    const [isTop4FieldsExpanded, setIsTop4FieldsExpanded] = useState(false);
    const [isFetchingTopFinishers, setIsFetchingTopFinishers] = useState(false);
    const [tfModalSearch, setTfModalSearch] = useState('');
    const [tfModalPage, setTfModalPage] = useState(1);

    // --- PAGINATION STATE ---
    const [palpitesVisibleCount, setPalpitesVisibleCount] = useState(20);
    const [histVisibleCount, setHistVisibleCount] = useState(20);

    const [userHistoryPredictions, setUserHistoryPredictions] = useState<Prediction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const userHistoryCacheRef = useRef<Record<string, any[]>>({}); // M6: cache de sessão por userId

    useEffect(() => {
        setPalpitesVisibleCount(20);
    }, [palpitesCompetition, palpitesSubPeriod, filterStatus, matchDetailsSearch]);

    useEffect(() => {
        setHistVisibleCount(20);
    }, [histCompetition, histSubPeriod]);

    useEffect(() => {
        if (selectedUserId && league?.id) {
            // M6: Verificar cache de sessão antes de ir ao banco
            if (userHistoryCacheRef.current[selectedUserId]) {
                setUserHistoryPredictions(userHistoryCacheRef.current[selectedUserId]);
                return;
            }
            setIsLoadingHistory(true);
            const fetchHistory = async () => {
                const { data } = await supabase
                    .from('brasileirao_predictions')
                    .select('*')
                    .eq('league_id', league.id)
                    .eq('user_id', selectedUserId);

                if (data) {
                    const mapped = data.map(p => ({
                        userId: p.user_id,
                        matchId: p.match_id,
                        leagueId: p.league_id,
                        homeScore: p.home_score,
                        awayScore: p.away_score,
                        points: p.points
                    }));
                    userHistoryCacheRef.current[selectedUserId] = mapped; // M6: salvar no cache
                    setUserHistoryPredictions(mapped);
                }
                setIsLoadingHistory(false);
            };
            fetchHistory();
        } else {
            setUserHistoryPredictions([]);
        }
    }, [selectedUserId, league?.id]);

    const [isLeagueLoading, setIsLeagueLoading] = useState(true);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    useEffect(() => {
        if (zoomedImage) {
            window.history.pushState({ zoomed: true }, '');
            const handlePopState = () => setZoomedImage(null);
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, [zoomedImage]);

    useEffect(() => {
        if (league) {
            setIsLeagueLoading(true);
            loadLeagueData(league.id, 'brasileirao')
                .finally(() => setIsLeagueLoading(false));
        }
    }, [league?.id]);

    // --- APP STATE REF FOR CAPACITOR BACK BUTTON ---
    const appStateRef = useRef({
        pendingEdits, tfChampion, tfRunnerUp, tfThird, tfFourth, topFinisherPredictions,
        showUnsavedModal, zoomedImage, currentUser, league, activeTab, selectedUserId
    });
    appStateRef.current = {
        pendingEdits, tfChampion, tfRunnerUp, tfThird, tfFourth, topFinisherPredictions,
        showUnsavedModal, zoomedImage, currentUser, league, activeTab, selectedUserId
    };

    useEffect(() => {
        const handleAppBack = (e: any) => {
            const state = appStateRef.current;

            if (state.zoomedImage) {
                setZoomedImage(null);
                e.preventDefault();
                return;
            }
            if (state.selectedUserId) {
                setSelectedUserId(null);
                e.preventDefault();
                return;
            }
            if (state.showUnsavedModal) {
                setShowUnsavedModal(null);
                e.preventDefault();
                return;
            }

            if (!state.league || !state.currentUser) return;

            const existingPred = state.topFinisherPredictions.find(p => p.userId === state.currentUser!.id && p.leagueId === state.league!.id);
            const tfC = state.tfChampion || '';
            const tfR = state.tfRunnerUp || '';
            const tfT = state.tfThird || '';
            const tfF = state.tfFourth || '';
            const anyFieldFilled = !!(tfC || tfR || tfT || tfF);
            const differsFromSaved = !existingPred
                ? anyFieldFilled
                : ((existingPred.champion || '') !== tfC || 
                   (existingPred.runnerUp || '') !== tfR || 
                   (existingPred.third || '') !== tfT || 
                   (existingPred.fourth || '') !== tfF);

            const hasUnsaved = Object.keys(state.pendingEdits).length > 0 || (anyFieldFilled && differsFromSaved);

            if (hasUnsaved) {
                setShowUnsavedModal({
                    action: () => {
                        window.history.back();
                    }
                });
                e.preventDefault();
                return;
            }

            if (state.activeTab !== 'palpites') {
                window.history.back();
                e.preventDefault();
            }
        };

        window.addEventListener('appBackButton', handleAppBack);

        return () => {
            window.removeEventListener('appBackButton', handleAppBack);
        };
    }, [league?.id]);

    const mergedUsers = users;

    // Initialize Admin State when league loads
    useEffect(() => {
        if (league) {
            if (editImage === '') setEditImage(league.image || '');
            if (editDescription === '') setEditDescription(league.description || '');
            if (!isPrivateInitialized.current) {
                setEditIsPrivate(league.isPrivate);
                isPrivateInitialized.current = true;
            }
            if (league.settings) {
                setEditExactScore(league.settings.exactScore ?? 10);
                setEditWinnerAndDiff(league.settings.winnerAndDiff ?? 7);
                setEditWinnerAndWinnerGoals(league.settings.winnerAndWinnerGoals ?? 6);
                setEditDraw(league.settings.draw ?? 7);
                setEditWinner(league.settings.winner ?? 5);
                setEditTopFinishersEnabled(league.settings.topFinishersEnabled ?? false);
                setEditTopFinishersPoints({
                    champion: league.settings.topFinishersPoints?.champion ?? 20,
                    runnerUp: league.settings.topFinishersPoints?.runnerUp ?? 15,
                    third: league.settings.topFinishersPoints?.third ?? 10,
                    fourth: league.settings.topFinishersPoints?.fourth ?? 5,
                });
            }
        }
    }, [league]);

    const isScoringLocked = useMemo(() => {
        // Manual lock from system admin
        return !!league?.settings?.manualScoringLock;
    }, [league?.settings?.manualScoringLock]);

    // Derived State
    const isAdmin = currentUser && league ? (league.adminId === currentUser.id) : false;

    const validPendingRequestsCount = useMemo(() => {
        if (!league) return 0;
        return league.pendingRequests.filter(uid => mergedUsers.some(u => u.id === uid)).length;
    }, [league, mergedUsers]);

    // --- HELPER: Match Logic ---
    const getMatchRound = (match: Match) => {
        if (!match.phase) return null;

        const phaseLower = match.phase.toLowerCase();

        // Formato Brasileirão (ex: "Rodada 19")
        if (phaseLower.includes('rodada ')) {
            const num = parseInt(phaseLower.split('rodada ')[1], 10);
            if (!isNaN(num)) return num;
        }

        if (phaseLower.includes('regular season')) {
            // Pode ser "Regular Season - 19" (nova api)
            const parts = phaseLower.split('-');
            if (parts.length > 1) {
                const num = parseInt(parts[1].trim(), 10);
                if (!isNaN(num)) return num;
            } else {
                // Fallback legado Copa do Mundo
                const matchStr = String(match.id).split('-')[1];
                if (!matchStr) return null;
                const matchNumber = parseInt(matchStr.replace(/[^0-9]/g, ''));
                if (isNaN(matchNumber)) return null;
                return Math.floor((matchNumber - 1) / 2) + 1;
            }
        }

        return null;
    };

    const rawLeaderboard = useMemo(() => {
        if (!league) return [];

        const currentPeriodRankings = rankingsByPeriod[leaderboardView];

        // If the database rankings are loaded, use them!
        if (currentPeriodRankings && currentPeriodRankings.length > 0) {
            return league.participants.map(userId => {
                const dbRank = currentPeriodRankings.find(r => r.user_id === userId);
                // Prefer profile data from API join (always available) over store lookup (may lag)
                const userFromDb = dbRank?.user;
                const userFromStore = mergedUsers.find(u => u.id === userId);
                const user = userFromDb || userFromStore || { name: 'Usuário', id: userId, email: '', avatar: '' } as User;

                let tfTotal = 0;
                if (leaderboardView === 'total' && league.settings?.topFinishersEnabled && topFinishersResult) {
                    const tfPred = topFinisherPredictions.find(p => p.userId === userId && p.leagueId === league.id);
                    if (tfPred) {
                        const tfPts = league.settings.topFinishersPoints ?? { champion: 20, runnerUp: 15, third: 10, fourth: 5 };
                        if (topFinishersResult.champion && tfPred.champion === topFinishersResult.champion) tfTotal += tfPts.champion;
                        if (topFinishersResult.runnerUp && tfPred.runnerUp === topFinishersResult.runnerUp) tfTotal += tfPts.runnerUp;
                        if (topFinishersResult.third && tfPred.third === topFinishersResult.third) tfTotal += tfPts.third;
                        if (topFinishersResult.fourth && tfPred.fourth === topFinishersResult.fourth) tfTotal += tfPts.fourth;
                    }
                }

                if (dbRank) {
                    return {
                        user,
                        totalPoints: Number(dbRank.total_points) + tfTotal,
                        exactScores: Number(dbRank.exact_scores),
                        winnerAndDiffCount: Number(dbRank.winner_and_diff_count),
                        winnerAndWinnerGoalsCount: Number(dbRank.winner_and_winner_goals_count),
                        drawCount: Number(dbRank.draw_count),
                        onlyWinnerCount: Number(dbRank.only_winner_count),
                        knockoutPoints: Number(dbRank.knockout_points),
                        tfTotal
                    };
                }

                // Fallback if user not found in dbRank
                return {
                    user,
                    totalPoints: tfTotal,
                    exactScores: 0,
                    winnerAndDiffCount: 0,
                    winnerAndWinnerGoalsCount: 0,
                    drawCount: 0,
                    onlyWinnerCount: 0,
                    knockoutPoints: 0,
                    tfTotal
                };
            }).sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
                if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
                if (b.winnerAndDiffCount !== a.winnerAndDiffCount) return b.winnerAndDiffCount - a.winnerAndDiffCount;
                if (b.winnerAndWinnerGoalsCount !== a.winnerAndWinnerGoalsCount) return b.winnerAndWinnerGoalsCount - a.winnerAndWinnerGoalsCount;
                if (b.drawCount !== a.drawCount) return b.drawCount - a.drawCount;
                if (b.onlyWinnerCount !== a.onlyWinnerCount) return b.onlyWinnerCount - a.onlyWinnerCount;
                return 0;
            });
        }

        // Fallback: client-side calculations (same as before) for speed before first load/fallback
        let calculatedBoard = league.participants.map(userId => {
            const user = mergedUsers.find(u => u.id === userId) || { name: 'Usuário', id: userId, email: '', avatar: '' } as User;

            const userPreds = predictions.filter(p => p.userId === userId && p.leagueId === league.id);
            let totalPoints = 0, exactScores = 0, winnerAndDiffCount = 0, winnerAndWinnerGoalsCount = 0, drawCount = 0, onlyWinnerCount = 0, knockoutPoints = 0;
            userPreds.forEach(p => {
                const match = matches.find(m => m.id === p.matchId);
                let includeInSum = false;
                if (match) {
                    let periods: string[] = ['total'];
                    if (match.championship === 'brasileirao') {
                        periods.push('brasileirao_total');
                        const mRound = getMatchRound(match);
                        if (mRound !== null) periods.push(mRound.toString());
                        // Support legacy Regular Season format if it exists
                        else if (match.phase.toLowerCase().includes('regular season') || match.phase.toLowerCase().includes('rodada')) {
                            // Added to brasileirao_total above 
                        }
                    } else if (match.championship === 'copa_do_brasil') {
                        periods.push('copa_total');
                        const phaseLower = match.phase.toLowerCase();
                        if (phaseLower.includes('oitavas') || phaseLower === 'round of 16') periods.push('copa_oitavas');
                        else if (phaseLower.includes('quartas') || phaseLower.includes('quarter')) periods.push('copa_quartas');
                        else if (phaseLower.includes('semi') || (phaseLower.includes('final') && !phaseLower.includes('semi'))) periods.push('copa_fase_final');
                    } else if (match.championship === 'libertadores') {
                        periods.push('libertadores_total');
                        const phaseLower = match.phase.toLowerCase();
                        if (phaseLower.includes('oitavas') || phaseLower === 'round of 16') periods.push('libertadores_oitavas');
                        else if (phaseLower.includes('quartas') || phaseLower.includes('quarter')) periods.push('libertadores_quartas');
                        else if (phaseLower.includes('semi') || (phaseLower.includes('final') && !phaseLower.includes('semi'))) periods.push('libertadores_fase_final');
                    } else if (match.championship === 'sul_americana') {
                        periods.push('sul_americana_total');
                        const phaseLower = match.phase.toLowerCase();
                        if (phaseLower.includes('oitavas') || phaseLower === 'round of 16') periods.push('sul_americana_oitavas');
                        else if (phaseLower.includes('quartas') || phaseLower.includes('quarter')) periods.push('sul_americana_quartas');
                        else if (phaseLower.includes('semi') || (phaseLower.includes('final') && !phaseLower.includes('semi'))) periods.push('sul_americana_fase_final');
                    }
                    if (periods.includes(leaderboardView)) includeInSum = true;
                }
                if (match && !match.is_blocked && (match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && match.home_score !== null && match.away_score !== null) {
                    const points = calculatePoints(Number(p.homeScore), Number(p.awayScore), Number(match.home_score), Number(match.away_score), league.settings);

                    if (includeInSum) {
                        totalPoints += points;
                        if ((!match.phase.includes('Regular Season'))) knockoutPoints += points;

                        const hitType = getPredictionHitType(Number(p.homeScore), Number(p.awayScore), Number(match.home_score), Number(match.away_score), league.settings);
                        if (hitType === 'EXACT') exactScores++;
                        else if (hitType === 'WINNER_DIFF') winnerAndDiffCount++;
                        else if (hitType === 'WINNER_GOALS') winnerAndWinnerGoalsCount++;
                        else if (hitType === 'DRAW') drawCount++;
                        else if (hitType === 'WINNER') onlyWinnerCount++;
                    }
                }
            });

            // TOP 4 FINISHERS POINTS (only for total)
            let tfTotal = 0;
            if (leaderboardView === 'total' && league.settings?.topFinishersEnabled && topFinishersResult) {
                const tfPred = topFinisherPredictions.find(p => p.userId === userId && p.leagueId === league.id);
                if (tfPred) {
                    const tfPts = league.settings.topFinishersPoints ?? { champion: 20, runnerUp: 15, third: 10, fourth: 5 };
                    if (topFinishersResult.champion && tfPred.champion === topFinishersResult.champion) tfTotal += tfPts.champion;
                    if (topFinishersResult.runnerUp && tfPred.runnerUp === topFinishersResult.runnerUp) tfTotal += tfPts.runnerUp;
                    if (topFinishersResult.third && tfPred.third === topFinishersResult.third) tfTotal += tfPts.third;
                    if (topFinishersResult.fourth && tfPred.fourth === topFinishersResult.fourth) tfTotal += tfPts.fourth;

                    totalPoints += tfTotal;
                }
            }

            return { user, totalPoints, exactScores, winnerAndDiffCount, winnerAndWinnerGoalsCount, drawCount, onlyWinnerCount, knockoutPoints, tfTotal };
        });

        return calculatedBoard.sort((a, b) => {
            if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
            if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
            if (b.winnerAndDiffCount !== a.winnerAndDiffCount) return b.winnerAndDiffCount - a.winnerAndDiffCount;
            if (b.winnerAndWinnerGoalsCount !== a.winnerAndWinnerGoalsCount) return b.winnerAndWinnerGoalsCount - a.winnerAndWinnerGoalsCount;
            if (b.drawCount !== a.drawCount) return b.drawCount - a.drawCount;
            if (b.onlyWinnerCount !== a.onlyWinnerCount) return b.onlyWinnerCount - a.onlyWinnerCount;
            return 0;
        });
    }, [league, mergedUsers, predictions, matches, leaderboardView, topFinishersResult, topFinisherPredictions, rankingsByPeriod]);

    const leaderboard = useMemo(() => {
        if (showOnlyRoundParticipants && roundParticipants?.[leaderboardView] && roundParticipants[leaderboardView].length > 0) {
            const allowedIds = new Set(roundParticipants[leaderboardView]);
            return rawLeaderboard.filter(entry => allowedIds.has(entry.user.id));
        }
        return rawLeaderboard;
    }, [rawLeaderboard, showOnlyRoundParticipants, roundParticipants, leaderboardView]);

    // Cleanup is now handled securely by the database during account deletion.

    // Handle Deep Linking Tabs
    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam === 'admin') setActiveTab('admin');
        else if (tabParam === 'classificacao') setActiveTab('classificacao');
        else if (tabParam === 'regras') setActiveTab('regras');
        else setActiveTab('palpites');
    }, [searchParams]);

    const handleTabChange = (newTab: 'palpites' | 'classificacao' | 'regras' | 'admin') => {
        if (newTab === activeTab) return;

        confirmNavigation(() => {
            window.scrollTo(0, 0);

            if (newTab === 'palpites') {
                navigate('', { replace: true });
            } else {
                if (activeTab === 'palpites') {
                    navigate(`?tab=${newTab}`); // Empurra no histórico (Essencial para a versão Web)
                } else {
                    navigate(`?tab=${newTab}`, { replace: true });
                }
            }
        });
    };

    // --- MOBILE BACK BUTTON HANDLER FOR MODALS ---
    useEffect(() => {
        const isModalOpen = !!(selectedMatchForDetails || selectedMatchForStats || selectedUserId || showDeleteConfirm || showLeaveConfirm || showUpgradeModal || showTopFinishersModal || userToRemove || showPricingModal);

        if (isModalOpen) {
            if (window.location.hash !== '#modal') {
                window.history.pushState(null, '', window.location.pathname + window.location.search + '#modal');
            }
        } else {
            if (window.location.hash === '#modal') {
                window.history.back();
            }
        }

        const handleHashChange = () => {
            if (window.location.hash !== '#modal') {
                setSelectedMatchForDetails(null);
                setSelectedMatchForStats(null);
                setSelectedUserId(null);
                setShowDeleteConfirm(false);
                setShowLeaveConfirm(false);
                setShowUpgradeModal(false);
                setShowPricingModal(false);
                setShowTopFinishersModal(false);
                setUserToRemove(null);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [selectedMatchForDetails, selectedMatchForStats, selectedUserId, showDeleteConfirm, showLeaveConfirm, showUpgradeModal, showTopFinishersModal, userToRemove, showPricingModal]);

    useEffect(() => {
        if (showTopFinishersModal && league) {
            setIsFetchingTopFinishers(true);
            fetchLeagueTopFinisherPredictions(league.id).finally(() => setIsFetchingTopFinishers(false));
        }
    }, [showTopFinishersModal, league?.id]);

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

    useEffect(() => {
        setStatsSearch('');
        setStatsPageSaved(1);
        setStatsPagePending(1);
    }, [selectedMatchForStats]);

    useEffect(() => {
        if (selectedMatchForDetails && league) {
            setIsLoadingDetailedStats(true);
            api.matches.getDetailedMatchStats(String(selectedMatchForDetails), league.id, false, 'brasileirao')
                .then(data => {
                    setMatchDetailedStats(data);
                })
                .catch(e => {
                    console.error("Failed to load match detailed stats", e);
                    setMatchDetailedStats(null);
                })
                .finally(() => {
                    setIsLoadingDetailedStats(false);
                });
        } else {
            setMatchDetailedStats(null);
        }
    }, [selectedMatchForDetails, league?.id]);

    const smForStats = useMemo(() => matches.find(m => m.id == selectedMatchForStats), [matches, selectedMatchForStats]);
    const isLockedStats = smForStats ? isPredictionLocked(smForStats.date, currentTime) : false;

    const { data: statsData, isLoading: isLoadingStatsQuery } = useQuery({
        queryKey: ['matchStats', league?.id, selectedMatchForStats],
        queryFn: async () => {
            if (!selectedMatchForStats || !league) return null;
            const stats = await api.matches.getStats(String(selectedMatchForStats), String(league.id), 'brasileirao');
            let standings: any[] = [];
            const match = matches.find(m => m.id == selectedMatchForStats);
            if (match && (match.championship === 'brasileirao' || !match.championship)) {
                standings = await api.brasileiraoTeams.getStandingsForTeams([match.home_team_id, match.away_team_id]);
            }
            return { stats, history: [], standings };
        },
        enabled: !!selectedMatchForStats && !!league,
        staleTime: isLockedStats ? 60 * 60 * 1000 : 30 * 1000,
    });

    useEffect(() => {
        if (statsData) {
            setApiMatchStats(statsData.stats);
            if (statsData.standings) {
                setStatsStandings(statsData.standings);
            } else {
                setStatsStandings([]);
            }
            setLoadingStats(false);
        } else if (!isLoadingStatsQuery) {
            setApiMatchStats(null);
            setStatsStandings([]);
            setLoadingStats(false);
        } else {
            setLoadingStats(true);
        }
    }, [statsData, isLoadingStatsQuery]);

    if (loading || isLeagueLoading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin text-brasil-green" size={48} /></div>;
    if (!currentUser) return <Navigate to="/" replace />;
    if (!league) return <Navigate to="/leagues-brasileirao" />;

    const isParticipant = league.participants.includes(currentUser.id);
    const isPending = league.pendingRequests.includes(currentUser.id);
    const currentPlan: LeaguePlan = league.settings?.plan || (league.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
    const limit = getLeagueLimit(league, true);
    const isUnlimited = currentPlan === 'VIP_UNLIMITED';
    const isMaster = currentPlan === 'VIP_MASTER';
    const isVip = currentPlan === 'VIP';
    const isBasic = currentPlan === 'VIP_BASIC';
    const isFree = currentPlan === 'FREE';

    // Top 4 Finishers Lock Logic: 5 minutes after the first match starts
    const firstMatchDate = matches.length > 0
        ? new Date(Math.min(...matches.map(m => new Date(m.date).getTime())))
        : null;
    const topFinishersLockDate = firstMatchDate
        ? new Date(firstMatchDate.getTime())
        : null;
    const isTopFinishersLocked = league.settings?.topFinishersUnlocked
        ? false
        : (topFinishersLockDate ? currentTime > topFinishersLockDate : false);

    // --- ACTIONS ---

    const showToast = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'success') => {
        setToast({ title, message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleJoin = () => {
        if (league) joinLeague(league.id, {
            name: league.name,
            leagueCode: league.leagueCode,
            adminId: league.adminId,
            isPrivate: league.isPrivate,
            settings: league.settings
        });
    };
    const handleLeave = () => { setShowLeaveConfirm(true); };
    const executeLeave = () => {
        if (league && currentUser) {
            removeUserFromLeague(league.id, currentUser.id);
            navigate('/leagues-brasileirao');
        }
    };
    const handleDelete = async () => {
        if (league && window.confirm('Tem certeza que deseja EXCLUIR esta liga?')) {
            const success = await deleteLeague(league.id);
            if (success) navigate('/leagues-brasileirao');
        }
    };
    const handleShareWhatsApp = () => {
        if (!league?.leagueCode) return;

        const compNames: Record<string, string> = {
            'brasileirao': 'Brasileirão',
            'copa_do_brasil': 'Copa do Brasil',
            'libertadores': 'Libertadores',
            'sul_americana': 'Sul-Americana',
        };

        const allowedCompetitions: string[] = league?.settings?.competitions || ['brasileirao', 'copa_do_brasil', 'libertadores'];
        const compsText = allowedCompetitions.map(c => compNames[c] || c).join(' e ');

        const text = `Venha participar da minha liga *${league.name}* de palpites do ${compsText}! ⚽🏆\n\nCopie o código:\n*${league.leagueCode}*\n\nE clique no link para acessar:\nhttps://bolaodacopa2026.app/leagues-brasileirao?code=${league.leagueCode}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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
        if (success) navigate('/leagues-brasileirao');
        else setShowDeleteConfirm(false);
    };

    const renderMatchBadge = (match: Match | any) => {
        let champLabel = '';
        let champColorClass = '';

        const champ = match.championship;
        if (champ === 'copa_do_brasil') {
            champLabel = 'Copa do Brasil';
            champColorClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
        } else if (champ === 'libertadores') {
            champLabel = 'Libertadores';
            champColorClass = 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border-sky-200 dark:border-sky-800';
        } else {
            champLabel = 'Brasileirão';
            champColorClass = 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800';
        }
        const isCopa = champ === 'copa_do_brasil' || champ === 'libertadores';
        const roundColorClass = match.phase ? getRoundColorClass(match.phase, isCopa) : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';

        return (
            <div className="flex gap-1 items-center flex-nowrap shrink-0">
                <span className={`text-[8px] min-[360px]:text-[8.5px] min-[380px]:text-[9px] ${champColorClass} px-1.5 py-0.5 rounded font-black border uppercase tracking-wider shadow-sm whitespace-nowrap shrink-0`}>
                    {champLabel}
                </span>
                {match.phase && (
                    <span className={`text-[8px] min-[360px]:text-[8.5px] min-[380px]:text-[9px] ${roundColorClass} px-1.5 py-0.5 rounded font-black border uppercase tracking-wider shadow-sm whitespace-nowrap shrink-0`}>
                        {translatePhase(match.phase)}
                    </span>
                )}
            </div>
        );
    };


    const handleScoreChange = (matchId: string, side: 'home' | 'away', value: string, currentPred: any) => {
        const digitsOnly = value.replace(/\D/g, '');
        if (digitsOnly.length > 2) return;

        setPendingEdits(prev => {
            const existing = prev[matchId] || {
                home: currentPred?.homeScore?.toString() ?? '',
                away: currentPred?.awayScore?.toString() ?? ''
            };
            const updatedMatch = { ...existing, [side]: digitsOnly };

            if (updatedMatch.home === '' && updatedMatch.away === '') {
                const newEdits = { ...prev };
                delete newEdits[matchId];
                return newEdits;
            }

            return { ...prev, [matchId]: updatedMatch };
        });
    };

    const handleSaveAll = async (): Promise<boolean> => {
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

        if (hasError) { showToast('Atenção', 'Não é permitido placar negativo.', 'warning'); return false; }

        if (predsToSave.length > 0) {
            setIsSavingPalpites(true);
            const success = await submitPredictions(predsToSave, league.id, 'brasileirao');
            setIsSavingPalpites(false);
            if (success) {
                setPendingEdits(prev => {
                    const next = { ...prev };
                    predsToSave.forEach(pred => {
                        delete next[pred.matchId];
                    });
                    return next;
                });
                showToast('Sucesso!', `${predsToSave.length} palpite(s) salvo(s).`, 'success');
                // Invalidate query
                predsToSave.forEach(pred => {
                    queryClient.invalidateQueries({ queryKey: ['matchStats', league.id, Number(pred.matchId)] });
                });
                return true;
            } else {
                showToast('Erro', 'Ocorreu um erro ao salvar os palpites.', 'warning');
                return false;
            }
        }
        return true;
    };

    const checkTopFinisherChanges = () => {
        const isLockedForTopFinishers = (topFinishersResult !== null && (topFinishersResult.champion !== '' || topFinishersResult.runnerUp !== '')) || isTopFinishersLocked;
        if (isLockedForTopFinishers) return false;

        const existingPred = topFinisherPredictions.find(p => p.userId === currentUser.id && p.leagueId === league.id);
        const tfC = tfChampion || '';
        const tfR = tfRunnerUp || '';
        const tfT = tfThird || '';
        const tfF = tfFourth || '';
        const anyFieldFilled = !!(tfC || tfR || tfT || tfF);
        
        const differsFromSaved = !existingPred
            ? anyFieldFilled
            : ((existingPred.champion || '') !== tfC || 
               (existingPred.runnerUp || '') !== tfR || 
               (existingPred.third || '') !== tfT || 
               (existingPred.fourth || '') !== tfF);
               
        return anyFieldFilled && differsFromSaved;
    };

    const confirmNavigation = async (action: () => void) => {
        const hasTopFinisherChanges = checkTopFinisherChanges();
        const hasUnsaved = Object.keys(pendingEdits).length > 0 || hasTopFinisherChanges;

        if (hasUnsaved) {
            setShowUnsavedModal({ action });
        } else {
            action();
        }
    };

    const getMatchDetailsData = () => {
        if (!selectedMatchForDetails) return null;
        const match = matches.find(m => m.id == selectedMatchForDetails);
        if (!match) return null;

        // Create Maps for O(1) lookup
        const usersMap = new Map<string, User>(mergedUsers.map(u => [u.id, u]));
        const matchPredictionsMap = new Map<string, any>(
            (matchDetailedStats?.predictions || []).map((p: any) => [p.user_id, {
                userId: p.user_id,
                matchId: match.id,
                leagueId: league.id,
                homeScore: p.homeScore,
                awayScore: p.awayScore,
                points: p.points
            }])
        );

        const participantPredictions = league.participants.map(userId => {
            const user = usersMap.get(userId) || { name: 'Usuário', id: userId, avatar: '' } as User;
            const pred = matchPredictionsMap.get(userId);
            let points = 0;
            if (match.is_blocked) {
                points = 0;
            } else if (match.home_score !== null && match.away_score !== null && pred) {
                points = calculatePoints(Number(pred.homeScore), Number(pred.awayScore), Number(match.home_score), Number(match.away_score), league.settings);
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
                finalImage = await uploadBase64Image(editImage, 'leagues', league.image);
            } catch (e) {
                console.error("Upload failed", e);
                showToast('Erro', 'Falha ao enviar imagem. Tente novamente.', 'warning');
                setIsSavingSettings(false);
                return;
            }
        }

        try {
            await updateLeague(league.id, { image: finalImage, description: editDescription, isPrivate: editIsPrivate });
            setEditImage(finalImage);
            showToast('Sucesso', 'Alterações salvas.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Erro', 'Falha ao salvar as alterações.', 'warning');
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleUpdateScoring = async () => {
        if (isScoringLocked) return;
        setIsSavingScoring(true);
        try {
            const updatedSettings = {
                ...league.settings,
                exactScore: Math.min(99, Math.max(1, Number(editExactScore) || 1)),
                winnerAndDiff: Math.min(99, Math.max(1, Number(editWinnerAndDiff) || 1)),
                winnerAndWinnerGoals: Math.min(99, Math.max(1, Number(editWinnerAndWinnerGoals) || 1)),
                draw: Math.min(99, Math.max(1, Number(editDraw) || 1)),
                winner: Math.min(99, Math.max(1, Number(editWinner) || 1)),
                topFinishersEnabled: editTopFinishersEnabled,
                topFinishersPoints: {
                    champion: Math.max(1, Number(editTopFinishersPoints.champion) || 20),
                    runnerUp: Math.max(1, Number(editTopFinishersPoints.runnerUp) || 15),
                    third: Math.max(1, Number(editTopFinishersPoints.third) || 10),
                    fourth: Math.max(1, Number(editTopFinishersPoints.fourth) || 5),
                }
            };
            await updateLeague(league.id, { settings: updatedSettings });
            showToast('Sucesso', 'Pontuações atualizadas.', 'success');
        } catch (e) {
            console.error(e);
            showToast('Erro', 'Falha ao salvar pontuações.', 'warning');
        } finally {
            setIsSavingScoring(false);
        }
    };
    const handleSearchUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!adminInviteEmail) return;
        setSearchStatus('searching'); setFoundUser(null);

        try {
            const email = adminInviteEmail.toLowerCase().trim();
            let user = mergedUsers.find(u => u.email?.toLowerCase() === email);

            if (!user) {
                user = await api.profiles.getByEmail(email);
            }

            if (user) {
                if (league.participants.includes(user.id)) {
                    showToast('Aviso', 'Este usuário já participa da liga.', 'info');
                    setSearchStatus('idle');
                } else if (league.pendingRequests?.includes(user.id)) {
                    showToast('Aviso', 'Este usuário já solicitou entrada. Aprove-o na lista acima.', 'info');
                    setSearchStatus('idle');
                } else {
                    setFoundUser(user);
                    setSearchStatus('found');
                }
            } else {
                setSearchStatus('not_found');
            }
        } catch (err) {
            console.error("Search error", err);
            setSearchStatus('not_found');
        }
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
        return null;
    };

    // Check if a knockout match has real teams defined (not placeholder names)

    const getRoundColorClass = (phase: string, isCopa: boolean = false) => {
        if (isCopa) return 'bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
        const match = phase.match(/\d+/);
        if (!match) return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
        const roundNum = parseInt(match[0], 10);
        const colors = [
            'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300', // red
            'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300', // purple
        ];
        return colors[roundNum % colors.length];
    };

    const translatePhase = (phase: string) => {
        if (!phase) return '';
        const p = phase.toLowerCase();
        if (p.includes('round of 32')) return '16-Avos';
        if (p.includes('round of 16')) return 'Oitavas';
        if (p.includes('quarter-finals') || p.includes('quarter')) return 'Quartas';
        if (p.includes('semi-finals') || p.includes('semi')) return 'Semifinal';
        if (p.includes('final')) return 'Final';
        return phase;
    };

    const isTeamsDefined = (match: Match): boolean => {
        if (match.phase.includes('Regular Season')) return true;
        const isPlaceholder = (name: string | number) =>
            String(name).startsWith('Venc.') || String(name).startsWith('Perd.') ||
            String(name).startsWith('1º') || String(name).startsWith('2º') || String(name).startsWith('3º') ||
            String(name).includes('Grupo');
        return !isPlaceholder(match.home_team_id) && !isPlaceholder(match.away_team_id);
    };

    // Calculate bet statistics for a match within this league
    const getMatchStatsData = (matchId: string, overridePreds?: Prediction[]) => {
        if (!league) return null;
        const match = matches.find(m => m.id === matchId);
        if (!match) return null;

        const sourcePreds = overridePreds || predictions;
        const leaguePreds = sourcePreds.filter(p => p.matchId === matchId && p.leagueId === league.id);
        const participantPreds = league.participants
            .map(uid => leaguePreds.find(p => p.userId === uid))
            .filter((p): p is Prediction => p !== undefined);

        const totalPreds = participantPreds.length;
        if (totalPreds === 0) {
            return { match, totalPreds: 0, mostPredictedScore: null as string | null, homeWinPct: 0, drawPct: 0, awayWinPct: 0 };
        }

        let homeWins = 0, draws = 0, awayWins = 0;
        const scoreCount: Record<string, number> = {};

        participantPreds.forEach(p => {
            const h = Number(p.homeScore);
            const a = Number(p.awayScore);
            if (h > a) homeWins++;
            else if (a > h) awayWins++;
            else draws++;
            const key = `${h} x ${a}`;
            scoreCount[key] = (scoreCount[key] || 0) + 1;
        });

        // Most predicted score — tiebreaker: fewer total goals (conservative), then home advantage
        let mostPredictedScore: string | null = null;
        let maxCount = 0;
        Object.entries(scoreCount).forEach(([key, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostPredictedScore = key;
            } else if (count === maxCount && mostPredictedScore) {
                const [hA, aA] = mostPredictedScore.split(' x ').map(Number);
                const [hB, aB] = key.split(' x ').map(Number);
                const totalA = hA + aA, totalB = hB + aB;
                // Prefer fewer total goals; if equal, prefer higher home score
                if (totalB < totalA || (totalB === totalA && hB > hA)) {
                    mostPredictedScore = key;
                }
            }
        });

        const homeWinPct = Math.round((homeWins / totalPreds) * 100);
        const awayWinPct = Math.round((awayWins / totalPreds) * 100);
        const drawPct = 100 - homeWinPct - awayWinPct;

        return { match, totalPreds, mostPredictedScore, homeWinPct, drawPct, awayWinPct };
    };

    const getBrasileiraoHistoryForTeam = (teamId: string, currentMatchDate: string, currentChampionship: string) => {
        const curDate = new Date(currentMatchDate).getTime();
        
        let allowedForHistory = [currentChampionship];
        if (currentChampionship === 'copa_do_brasil' &&
            allowedCompetitions.includes('brasileirao') && 
            allowedCompetitions.includes('copa_do_brasil')) {
            allowedForHistory = ['brasileirao', 'copa_do_brasil'];
        }

        const combinedMap = new Map();
        allMatches.forEach(m => combinedMap.set(m.id, m));
        teamHistoryData.forEach(m => combinedMap.set(m.id, m));
        const combinedMatches = Array.from(combinedMap.values());

        return combinedMatches
            .filter(m => allowedForHistory.includes(m.championship || 'brasileirao'))
            .filter(m => allowedCompetitions.includes(m.championship || 'brasileirao'))
            .filter(m => (String(m.home_team_id) === String(teamId) || String(m.away_team_id) === String(teamId)) && m.status === MatchStatus.FINISHED)
            .filter(m => new Date(m.date).getTime() < curDate)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 6)
            .map(m => {
                const isHome = String(m.home_team_id) === String(teamId);
                const myScore = isHome ? m.home_score : m.away_score;
                const oppScore = isHome ? m.away_score : m.home_score;
                const oppId = isHome ? m.away_team_id : m.home_team_id;

                let result = 'Empate';
                if (myScore !== null && oppScore !== null) {
                    if (myScore > oppScore) result = 'Vitória';
                    else if (myScore < oppScore) result = 'Derrota';
                }

                let comp = (m as any).championship || 'brasileirao';
                if (comp === 'brasileirao') comp = 'Brasileirão';
                else if (comp === 'copa_do_brasil') comp = 'Copa do Brasil';
                else if (comp === 'libertadores') comp = 'Libertadores';
                else if (comp === 'sulamericana') comp = 'Sul-Americana';
                else comp = comp.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());

                return {
                    id: m.id,
                    date: m.date,
                    competition: comp,
                    match_str: `${getTeamNameForDisplay(m.home_team_id)} ${m.home_score ?? ''} x ${m.away_score ?? ''} ${getTeamNameForDisplay(m.away_team_id)}`,
                    result,
                    isHome
                };
            });
    };

    // ================= RENDERERS (FORMER COMPONENTS) =================

    const renderPalpitesTab = () => {
        const sortedMatches = [...matches].sort((a, b) => {
            if (filterStatus === 'finished') {
                if (a.status === MatchStatus.FINISHED && b.status === MatchStatus.FINISHED) {
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                }
            }
            return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        const filteredMatches = sortedMatches.filter(m => {
            const isCopaDoBrasil = (m as any).championship === 'copa_do_brasil';
            const isLibertadores = (m as any).championship === 'libertadores';
            const isSulAmericana = (m as any).championship === 'sul_americana';
            const isBrasileirao = (m as any).championship === 'brasileirao';

            const activeCompFilter = allowedCompetitions.length === 1
                ? (allowedCompetitions.includes('brasileirao') ? 'brasileirao' : allowedCompetitions.includes('libertadores') ? 'libertadores' : allowedCompetitions.includes('sul_americana') ? 'sul_americana' : 'copa')
                : palpitesCompetition;

            if (activeCompFilter === 'brasileirao' && (isCopaDoBrasil || isLibertadores || isSulAmericana)) return false;
            if (activeCompFilter === 'copa' && (isBrasileirao || isLibertadores || isSulAmericana)) return false;
            if (activeCompFilter === 'libertadores' && (isBrasileirao || isCopaDoBrasil || isSulAmericana)) return false;
            if (activeCompFilter === 'sul_americana' && (isBrasileirao || isCopaDoBrasil || isLibertadores)) return false;

            if (palpitesSubPeriod !== 'all') {
                if (palpitesSubPeriod.startsWith('mes_')) {
                    const month = parseInt(palpitesSubPeriod.split('_')[1], 10);
                    const matchMonth = new Date(m.date).getMonth() + 1;
                    if (matchMonth !== month) return false;
                } else if (isCopaDoBrasil) {
                    const p = m.phase?.toLowerCase() || '';
                    if (palpitesSubPeriod === 'copa_oitavas' && !(p.includes('oitavas') || p.includes('round of 16'))) return false;
                    if (palpitesSubPeriod === 'copa_quartas' && !(p.includes('quartas') || p.includes('quarter'))) return false;
                    if (palpitesSubPeriod === 'copa_fase_final' && !(p.includes('semi') || (p.includes('final') && !p.includes('semi')))) return false;
                } else if (isLibertadores) {
                    const p = m.phase?.toLowerCase() || '';
                    if (palpitesSubPeriod === 'libertadores_oitavas' && !(p.includes('oitavas') || p.includes('round of 16'))) return false;
                    if (palpitesSubPeriod === 'libertadores_quartas' && !(p.includes('quartas') || p.includes('quarter'))) return false;
                    if (palpitesSubPeriod === 'libertadores_fase_final' && !(p.includes('semi') || (p.includes('final') && !p.includes('semi')))) return false;
                } else if (isSulAmericana) {
                    const p = m.phase?.toLowerCase() || '';
                    if (palpitesSubPeriod === 'sul_americana_oitavas' && !(p.includes('oitavas') || p.includes('round of 16'))) return false;
                    if (palpitesSubPeriod === 'sul_americana_quartas' && !(p.includes('quartas') || p.includes('quarter'))) return false;
                    if (palpitesSubPeriod === 'sul_americana_fase_final' && !(p.includes('semi') || (p.includes('final') && !p.includes('semi')))) return false;
                } else if (isBrasileirao) {
                    const round = getMatchRound(m);
                    if (round?.toString() !== palpitesSubPeriod) return false;
                }
            }
            if (filterStatus !== 'all') {
                if (filterStatus === 'live') return m.is_blocked;
                if (filterStatus === 'finished') return m.status === MatchStatus.FINISHED;
                if (filterStatus === 'upcoming') return !m.is_blocked && (m.status === MatchStatus.SCHEDULED || m.status === MatchStatus.IN_PROGRESS);

                const userPred = predictions.find(p => p.matchId === m.id && p.userId === currentUser.id && p.leagueId === league.id);
                const isFilled = userPred !== undefined && userPred !== null && userPred.homeScore !== null && userPred.homeScore !== undefined && userPred.awayScore !== null && userPred.awayScore !== undefined;

                if (filterStatus === 'predicted') return isFilled && m.status !== MatchStatus.FINISHED;
                if (filterStatus === 'missing') return !isFilled && m.status !== MatchStatus.FINISHED;
            }
            return true;
        });

        const getMatchDetailsData = () => {
            if (!selectedMatchForDetails || !league) return null;
            const match = matches.find(m => m.id == selectedMatchForDetails);
            if (!match) return null;

            const matchDetailsPreds = (matchDetailedStats?.predictions || []).map((p: any) => ({
                userId: p.user_id,
                matchId: match.id,
                leagueId: league.id,
                homeScore: p.home_score,
                awayScore: p.away_score,
                points: p.points
            }));

            return {
                match,
                participants: league.participants.map(uid => {
                    const u = mergedUsers.find(user => user.id === uid) || { name: 'Usuário', id: uid, email: '', avatar: '', isAdmin: false, whatsapp: '', theme: undefined, isPro: false } as User;
                    const pred = matchDetailsPreds.find(pred => pred.userId === uid);
                    let points = 0;
                    if (match.is_blocked) {
                        points = 0;
                    } else if (match.home_score !== null && match.away_score !== null && pred) {
                        points = calculatePoints(Number(pred.homeScore), Number(pred.awayScore), Number(match.home_score), Number(match.away_score), league.settings);
                    }
                    return { user: u, pred, points };
                }).sort((a, b) => {
                    const aHasPred = !!a.pred;
                    const bHasPred = !!b.pred;
                    if (aHasPred && !bHasPred) return -1;
                    if (!aHasPred && bHasPred) return 1;
                    if (b.points !== a.points) return b.points - a.points;
                    return a.user.name.localeCompare(b.user.name);
                })
            };
        };

        const hasFilters = palpitesCompetition !== 'all' || palpitesSubPeriod !== 'all' || filterStatus !== 'upcoming';
        const clearFilters = () => { setPalpitesCompetition('all'); setPalpitesSubPeriod('all'); setFilterStatus('upcoming'); };
        const detailsData = getMatchDetailsData();
        const filteredDetailsParticipants = detailsData?.participants.filter(p => p.user.name.toLowerCase().includes(matchDetailsSearch.toLowerCase())) || [];
        const hasUnsavedChanges = Object.keys(pendingEdits).length > 0;
        const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        return (
            <div className="space-y-6 pb-24">

                {/* NEW TOP 4 LOCK ALERT */}
                {league.settings?.topFinishersEnabled && (
                    <div className="bg-brasil-blue/10 dark:bg-blue-900/40 text-gray-700 dark:text-gray-300 px-4 py-3 text-xs md:text-sm font-bold border border-brasil-blue/20 dark:border-blue-800/50 rounded-xl flex items-center justify-center gap-2 text-center shadow-sm">
                        <Clock size={16} />
                        <span>
                            {isTopFinishersLocked
                                ? "Palpites dos 4 Primeiros encerrados. Clique em cima do card para conferir os palpites da galera."
                                : "O palpite dos 4 primeiros é encerrado junto com o início do 1º jogo da competição."}
                        </span>
                    </div>
                )}

                {/* TOP 4 FINALISTS CARD */}
                {league.settings?.topFinishersEnabled && (() => {
                    const existingPred = topFinisherPredictions.find(p => p.userId === currentUser.id && p.leagueId === league.id);
                    const tfPoints = league.settings.topFinishersPoints ?? { champion: 20, runnerUp: 15, third: 10, fourth: 5 };
                    const fields: Array<{ key: keyof typeof tfPoints; label: string; emoji: string; color: string; pts: number; value: string; setter: (v: string) => void }> = [
                        { key: 'champion', label: 'Campeão', emoji: '🥇', color: 'text-yellow-600 dark:text-yellow-400', pts: tfPoints.champion, value: tfChampion, setter: setTfChampion },
                        { key: 'runnerUp', label: 'Vice-Campeão', emoji: '🥈', color: 'text-slate-500 dark:text-slate-300', pts: tfPoints.runnerUp, value: tfRunnerUp, setter: setTfRunnerUp },
                        { key: 'third', label: '3º Lugar', emoji: '🥉', color: 'text-amber-700 dark:text-amber-500', pts: tfPoints.third, value: tfThird, setter: setTfThird },
                        { key: 'fourth', label: '4º Lugar', emoji: '🏅', color: 'text-gray-500 dark:text-gray-400', pts: tfPoints.fourth, value: tfFourth, setter: setTfFourth },
                    ];

                    const initPred = () => {
                        if (existingPred && !tfChampion && !tfRunnerUp && !tfThird && !tfFourth) {
                            setTfChampion(existingPred.champion);
                            setTfRunnerUp(existingPred.runnerUp);
                            setTfThird(existingPred.third);
                            setTfFourth(existingPred.fourth);
                        }
                    };
                    initPred();

                    const isOfficialResultDefined = topFinishersResult !== null && (topFinishersResult.champion !== '' || topFinishersResult.runnerUp !== '');
                    const isLocked = isOfficialResultDefined || isTopFinishersLocked;
                    const allTeams = [...new Set(matches.flatMap(m => [m.home_team_id, m.away_team_id]).filter(t => t && !String(t).startsWith('Venc') && !String(t).startsWith('Perd') && !String(t).startsWith('1º') && !String(t).startsWith('2º') && !String(t).startsWith('3º')))].sort();

                    return (
                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md overflow-hidden bg-white dark:bg-gray-800">
                            {/* Header - clickable when locked to view all predictions */}
                            <div
                                className={`bg-gradient-to-r from-gray-800 to-gray-700 dark:from-gray-900 dark:to-gray-800 px-5 py-4 flex items-center justify-between ${isLocked ? 'cursor-pointer hover:from-gray-700 hover:to-gray-600 dark:hover:from-gray-800 dark:hover:to-gray-700 transition-all group' : ''}`}
                                onClick={isLocked ? () => setShowTopFinishersModal(true) : undefined}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 p-2 rounded-xl">
                                        <Trophy size={18} className="text-gray-100" />
                                    </div>
                                    <div>
                                        <span className="font-black text-white text-sm uppercase tracking-widest">4 Primeiros Colocados</span>
                                        <p className={`mt-0.5 font-medium ${isLocked ? 'text-xs text-emerald-400 animate-pulse' : 'text-[10px] text-gray-400'}`}>
                                            {isLocked ? 'Toque para ver os palpites da galera 👆' : 'Palpite de colocação final da competição'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                        {isLocked && <Eye size={16} className="text-gray-400 group-hover:text-white transition-colors" />}
                                        {existingPred && (
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-full font-bold tracking-wide flex items-center gap-1">
                                                <CheckCircle2 size={10} /> SALVO
                                            </span>
                                        )}
                                    </div>
                                    <LiveCountdown
                                        date={topFinishersLockDate?.toISOString() || new Date().toISOString()}
                                        isLocked={isLocked}
                                        className="flex items-center gap-1 text-yellow-300 bg-yellow-900/40 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm border border-yellow-700/50 animate-fade-in whitespace-nowrap"
                                    />
                                </div>
                            </div>

                            {/* Result banner */}
                            {isLocked && (
                                <div className="bg-emerald-50 dark:bg-emerald-900/20 px-5 py-2.5 border-b border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-2 text-emerald-800 dark:text-emerald-300 text-xs font-bold">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={14} /> {isOfficialResultDefined ? 'Resultado oficial definido — palpites encerrados' : 'A competição já começou — palpites encerrados'}
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setIsTop4FieldsExpanded(!isTop4FieldsExpanded); }} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-3 py-1 rounded text-[10px] font-black uppercase transition-colors shrink-0 cursor-pointer relative z-10 shadow-sm">
                                        {isTop4FieldsExpanded ? 'Ocultar palpites' : 'Mostrar palpites'}
                                    </button>
                                </div>
                            )}

                            {/* Fields grid */}
                            {(!isLocked || isTop4FieldsExpanded) && (
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {fields.map(f => {
                                        const officialValue = topFinishersResult?.[f.key as keyof typeof topFinishersResult];
                                        const userValue = existingPred?.[f.key as keyof typeof existingPred];
                                        const isCorrect = isOfficialResultDefined && officialValue && userValue === officialValue;
                                        const isWrong = isOfficialResultDefined && officialValue && userValue && userValue !== officialValue;

                                        return (
                                            <div key={f.key} className={`rounded-xl border p-3.5 transition-all ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700' :
                                                isWrong ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50' :
                                                    'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                                                }`}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${f.color}`}>
                                                        <span className="text-base leading-none">{f.emoji}</span> {f.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full font-bold">
                                                        +{f.pts} pts
                                                    </span>
                                                </div>
                                                <select
                                                    value={f.value}
                                                    onChange={e => f.setter(e.target.value)}
                                                    disabled={isLocked}
                                                    className={`w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-2.5 font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brasil-blue transition-all ${isLocked ? 'opacity-70 cursor-not-allowed bg-gray-100 dark:bg-gray-900' : ''} text-sm`}
                                                >
                                                    <option value="">-- Selecione a seleção --</option>
                                                    {allTeams.map(t => {
                                                        const isSelectedElsewhere = (
                                                            (tfChampion === t && f.key !== 'champion') ||
                                                            (tfRunnerUp === t && f.key !== 'runnerUp') ||
                                                            (tfThird === t && f.key !== 'third') ||
                                                            (tfFourth === t && f.key !== 'fourth')
                                                        );
                                                        return (
                                                            <option key={t} value={t} disabled={isSelectedElsewhere}>
                                                                {t}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                                {isLocked && (
                                                    <div className="mt-2 flex items-center justify-between">
                                                        <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                                            {userValue ? <span>Palpitou: <strong className="text-gray-700 dark:text-gray-200">{userValue}</strong></span> : <span className="italic">Não palpitou</span>}
                                                            {isCorrect && <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-bold">✅ ACERTOU!</span>}
                                                            {isWrong && <span className="ml-1 text-red-500 font-bold text-[9px]">❌ ERROU</span>}
                                                        </div>
                                                        {officialValue && officialValue !== userValue && (
                                                            <div className="text-[10px] font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 px-2 py-0.5 rounded shadow-sm border border-gray-100 dark:border-gray-700">
                                                                {officialValue}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })()}

                {/* TOP 4 FINISHERS: Modal de palpites de todos os participantes */}
                {showTopFinishersModal && isTopFinishersLocked && league.settings?.topFinishersEnabled && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowTopFinishersModal(false)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                            {/* Header */}
                            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-5 py-4 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/10 p-2 rounded-xl"><Trophy size={18} className="text-gray-100" /></div>
                                    <div>
                                        <span className="font-black text-white text-sm uppercase tracking-widest">Palpites da Galera</span>
                                        <p className="text-gray-400 text-[10px] mt-0.5">4 Primeiros Colocados</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowTopFinishersModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} className="text-white" /></button>
                            </div>
                            {/* Search */}
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2 shrink-0">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar participante..."
                                        value={tfModalSearch}
                                        onChange={(e) => { setTfModalSearch(e.target.value); setTfModalPage(1); }}
                                        className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brasil-blue dark:focus:ring-blue-500 outline-none transition-shadow"
                                    />
                                </div>
                            </div>

                            {isFetchingTopFinishers && (
                                <div className="flex flex-col items-center justify-center py-6 text-gray-500 dark:text-gray-400">
                                    <Loader2 className="animate-spin mb-2" size={24} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Carregando palpites...</span>
                                </div>
                            )}

                            {/* List */}
                            <div className="flex-1 overflow-y-auto p-0 bg-gray-50 dark:bg-gray-800">
                                {(() => {
                                    const tfPts = league.settings.topFinishersPoints ?? { champion: 20, runnerUp: 15, third: 10, fourth: 5 };
                                    const allPreds = league.participants.map(uid => {
                                        const user = mergedUsers.find(u => u.id === uid) || { name: 'Usuário', id: uid, avatar: '' } as User;
                                        const pred = topFinisherPredictions.find(p => p.userId === uid && p.leagueId === league.id);
                                        let pts = 0;
                                        if (pred && topFinishersResult) {
                                            if (topFinishersResult.champion && pred.champion === topFinishersResult.champion) pts += tfPts.champion;
                                            if (topFinishersResult.runnerUp && pred.runnerUp === topFinishersResult.runnerUp) pts += tfPts.runnerUp;
                                            if (topFinishersResult.third && pred.third === topFinishersResult.third) pts += tfPts.third;
                                            if (topFinishersResult.fourth && pred.fourth === topFinishersResult.fourth) pts += tfPts.fourth;
                                        }
                                        return { user, pred, pts };
                                    })
                                        .filter(p => p.user.name.toLowerCase().includes(tfModalSearch.toLowerCase()))
                                        .sort((a, b) => {
                                            const aHasPred = !!a.pred;
                                            const bHasPred = !!b.pred;
                                            if (aHasPred && !bHasPred) return -1;
                                            if (!aHasPred && bHasPred) return 1;
                                            return a.user.name.localeCompare(b.user.name);
                                        });

                                    const itemsPerPage = 100;
                                    const totalPages = Math.ceil(allPreds.length / itemsPerPage) || 1;
                                    const paginatedPreds = allPreds.slice((tfModalPage - 1) * itemsPerPage, tfModalPage * itemsPerPage);

                                    const fields = [
                                        { key: 'champion' as const, label: 'Campeão', emoji: '🥇' },
                                        { key: 'runnerUp' as const, label: 'Vice', emoji: '🥈' },
                                        { key: 'third' as const, label: '3º Lugar', emoji: '🥉' },
                                        { key: 'fourth' as const, label: '4º Lugar', emoji: '🏅' },
                                    ];
                                    return (
                                        <div className="flex flex-col h-full">
                                            <div className="divide-y divide-gray-100 dark:divide-gray-700 flex-1">
                                                {paginatedPreds.map(({ user, pred, pts }, idx) => (
                                                    <div key={user.id} className={`p-4 ${user.id === currentUser.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <div className="relative">
                                                                    <OptimizedImage src={user.avatar} containerClassName="w-9 h-9 rounded-full border border-gray-200 dark:border-gray-600" className="w-full h-full object-cover" alt="" />
                                                                    <div className="absolute -top-1 -left-1 w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-[9px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-gray-700">{(tfModalPage - 1) * itemsPerPage + idx + 1}</div>
                                                                </div>
                                                                <div>
                                                                    <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{user.name}{user.id === currentUser.id && <span className="text-[10px] font-normal text-gray-500 ml-1">(Você)</span>}</div>
                                                                    {!pred && <div className="text-[10px] text-gray-400 italic">Não palpitou</div>}
                                                                </div>
                                                            </div>
                                                            <div className={`text-sm font-black px-3 py-1 rounded-lg ${pts > 0 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'}`}>
                                                                {pts > 0 ? `+${pts}` : '—'} pts
                                                            </div>
                                                        </div>
                                                        {pred && (
                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                {fields.map(f => {
                                                                    const val = pred[f.key];
                                                                    const official = topFinishersResult?.[f.key];
                                                                    const correct = official && val === official;
                                                                    const wrong = official && val && val !== official;
                                                                    return (
                                                                        <div key={f.key} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold border ${correct ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' :
                                                                            wrong ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400' :
                                                                                'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300'
                                                                            }`}>
                                                                            <span>{f.emoji}</span>
                                                                            <span className="truncate">{val || <span className="font-normal italic text-gray-400">—</span>}</span>
                                                                            {correct && <span className="ml-auto">✅</span>}
                                                                            {wrong && <span className="ml-auto">❌</span>}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                                {paginatedPreds.length === 0 && (
                                                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">Nenhum participante encontrado.</div>
                                                )}
                                            </div>
                                            {totalPages > 1 && (
                                                <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 sticky bottom-0">
                                                    <button
                                                        onClick={() => setTfModalPage(p => Math.max(1, p - 1))}
                                                        disabled={tfModalPage === 1}
                                                        className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                                    >
                                                        <ChevronLeft size={20} />
                                                    </button>
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                                                        Página {tfModalPage} de {totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => setTfModalPage(p => Math.min(totalPages, p + 1))}
                                                        disabled={tfModalPage === totalPages}
                                                        className="p-1.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                                    >
                                                        <ChevronRight size={20} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>, document.body
                )}

                {/* Match alerts moved below Top 4 card */}
                <div className="space-y-3">
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-2 sm:px-4 py-3 text-xs md:text-sm font-medium border border-yellow-100 dark:border-yellow-800 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 text-center shadow-sm">
                        <AlertCircle size={16} className="shrink-0" /><span>O palpite é bloqueado 5 min. antes do início do jogo.</span>
                    </div>
                </div>

                {/* FLOATING: Salvar palpite dos 4 primeiros */}
                {league.settings?.topFinishersEnabled && (() => {
                    const isLocked = (topFinishersResult !== null && (topFinishersResult.champion !== '' || topFinishersResult.runnerUp !== '')) || isTopFinishersLocked;
                    const existingPred = topFinisherPredictions.find(p => p.userId === currentUser.id && p.leagueId === league.id);
                    const tfC = tfChampion || '';
                    const tfR = tfRunnerUp || '';
                    const tfT = tfThird || '';
                    const tfF = tfFourth || '';
                    const anyFieldFilled = !!(tfC || tfR || tfT || tfF);
                    const differsFromSaved = !existingPred
                        ? anyFieldFilled
                        : ((existingPred.champion || '') !== tfC || 
                           (existingPred.runnerUp || '') !== tfR || 
                           (existingPred.third || '') !== tfT || 
                           (existingPred.fourth || '') !== tfF);
                    const hasTopFinisherChanges = !isLocked && anyFieldFilled && differsFromSaved;
                    if (!hasTopFinisherChanges || isKeyboardOpen) return null;
                    const shiftUp = Object.keys(pendingEdits).length > 0;
                    return createPortal(
                        <div className={`fixed left-1/2 -translate-x-1/2 z-[9800] pointer-events-auto animate-in slide-in-from-bottom-6 fade-in duration-300 ${shiftUp ? 'bottom-36' : 'bottom-16'}`}>
                            <button
                                onClick={async () => {
                                    if (!tfChampion || !tfRunnerUp || !tfThird || !tfFourth) {
                                        alert('Selecione todos os 4 colocados antes de salvar.');
                                        return;
                                    }
                                    setIsSavingTopFinishers(true);
                                    await submitTopFinisherPrediction(league.id, tfChampion, tfRunnerUp, tfThird, tfFourth);
                                    setIsSavingTopFinishers(false);
                                }}
                                disabled={isSavingTopFinishers}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-8 py-4 rounded-full shadow-2xl shadow-gray-900/40 font-bold text-xl md:text-2xl flex items-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 border border-gray-600 ring-4 ring-white/20 backdrop-blur-sm whitespace-nowrap disabled:opacity-70"
                            >
                                {isSavingTopFinishers ? <Loader2 size={28} className="animate-spin" /> : <Trophy size={28} className="stroke-[2]" />}
                                <span>{isSavingTopFinishers ? 'Salvando...' : 'Salvar 4 Primeiros'}</span>
                            </button>
                        </div>,
                        document.body
                    );
                })()}


                {/* Removido o botão flutuante de Salvar Palpites */}

                <div className="flex flex-col gap-4 pt-2">
                    <div className="flex items-center justify-between px-1">
                        <div className="flex items-center">
                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><Filter size={16} className="text-brasil-blue dark:text-blue-400" /> Filtros</div>
                            {hasFilters && (<button onClick={clearFilters} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors flex items-center gap-1 ml-3"><X size={12} /> Limpar</button>)}
                            <button onClick={() => refreshPredictions()} disabled={isRefreshingPredictions} className={`text-xs font-bold text-brasil-green hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors flex items-center gap-1 ml-3 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded border border-green-200 dark:border-green-800 ${isRefreshingPredictions ? 'opacity-70 cursor-not-allowed' : ''}`}><Loader2 size={12} className={isRefreshingPredictions ? 'animate-spin' : ''} /> {isRefreshingPredictions ? 'Atualizando...' : 'Atualizar Palpites'}</button>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full shadow-sm border border-gray-200 dark:border-gray-700"><Clock size={12} /> Horários de Brasília</div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-3 md:flex md:flex-row gap-1 md:gap-1.5 w-full">
                            <button onClick={() => setFilterStatus('all')} className={`flex justify-center items-center px-1.5 md:px-4 py-2 rounded-full text-[9px] md:text-xs font-bold transition-all border whitespace-nowrap ${filterStatus === 'all' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>Todos</button>
                            <button onClick={() => setFilterStatus('missing')} className={`flex justify-center items-center px-1.5 md:px-4 py-2 rounded-full text-[9px] md:text-xs font-bold transition-all border whitespace-nowrap gap-1 ${filterStatus === 'missing' ? 'bg-yellow-400 text-yellow-950 border-yellow-400 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}><AlertCircle size={12} /> Pendentes</button>
                            <button onClick={() => setFilterStatus('predicted')} className={`flex justify-center items-center px-1.5 md:px-4 py-2 rounded-full text-[9px] md:text-xs font-bold transition-all border whitespace-nowrap gap-1 ${filterStatus === 'predicted' ? 'bg-blue-800 text-white border-blue-800 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}><CheckCircle2 size={12} /> Salvos</button>
                            <button onClick={() => setFilterStatus('upcoming')} className={`flex justify-center items-center px-1.5 md:px-4 py-2 rounded-full text-[9px] md:text-xs font-bold transition-all border whitespace-nowrap gap-1 ${filterStatus === 'upcoming' ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'} `}><Calendar size={12} /> Abertos</button>
                            <button onClick={() => setFilterStatus('finished')} className={`flex justify-center items-center px-1.5 md:px-4 py-2 rounded-full text-[9px] md:text-xs font-bold transition-all border whitespace-nowrap gap-1 ${filterStatus === 'finished' ? 'bg-green-600 text-white border-green-600 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}><CheckCircle2 size={12} /> Finalizados</button>
                            <button onClick={() => setFilterStatus('live')} className={`flex justify-center items-center px-1.5 md:px-4 py-2 rounded-full text-[9px] md:text-xs font-bold transition-all border whitespace-nowrap gap-1 ${filterStatus === 'live' ? 'bg-red-500 text-white border-red-500 shadow-md' : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}><Lock size={12} /> Adiados</button>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            {allowedCompetitions.length > 1 && (
                                <div className={`relative ${palpitesCompetition !== 'all' ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                    <select value={palpitesCompetition} onChange={(e) => { setPalpitesCompetition(e.target.value as any); setPalpitesSubPeriod('all'); }} className={`w-full ${palpitesCompetition === 'all' ? 'md:min-w-[160px]' : ''} appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8`}>
                                        <option value="all">Todas Competições</option>
                                        {allowedCompetitions.includes('brasileirao') && <option value="brasileirao">Brasileirão</option>}
                                        {allowedCompetitions.includes('copa_do_brasil') && <option value="copa">Copa do Brasil</option>}
                                        {allowedCompetitions.includes('libertadores') && <option value="libertadores">Libertadores</option>}
                                        {allowedCompetitions.includes('sul_americana') && <option value="sul_americana">Sul-Americana</option>}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                </div>
                            )}

                            {(() => {
                                const activeComp = allowedCompetitions.length === 1
                                    ? (allowedCompetitions.includes('brasileirao') ? 'brasileirao' : allowedCompetitions.includes('libertadores') ? 'libertadores' : allowedCompetitions.includes('sul_americana') ? 'sul_americana' : 'copa')
                                    : palpitesCompetition;

                                if (activeComp === 'brasileirao') {
                                    return (
                                        <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                            <select value={palpitesSubPeriod} onChange={(e) => setPalpitesSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8`}>
                                                <option value="all">Todas as Rodadas</option>
                                                {Array.from({ length: 19 }, (_, i) => i + 20).map(r => (
                                                    <option key={r} value={r.toString()}>{r}ª Rodada</option>
                                                ))}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                        </div>
                                    );
                                }

                                if (activeComp === 'copa') {
                                    return (
                                        <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                            <select value={palpitesSubPeriod} onChange={(e) => setPalpitesSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8`}>
                                                <option value="all">Todas as Fases</option>
                                                <option value="copa_oitavas">Oitavas de Final</option>
                                                <option value="copa_quartas">Quartas de Final</option>
                                                <option value="copa_fase_final">Fase Final (Semi+Final)</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                        </div>
                                    );
                                }
                                if (activeComp === 'libertadores') {
                                    return (
                                        <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                            <select value={palpitesSubPeriod} onChange={(e) => setPalpitesSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8`}>
                                                <option value="all">Todas as Fases</option>
                                                <option value="libertadores_oitavas">Oitavas de Final</option>
                                                <option value="libertadores_quartas">Quartas de Final</option>
                                                <option value="libertadores_fase_final">Fase Final (Semi+Final)</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                        </div>
                                    );
                                }
                                if (activeComp === 'sul_americana') {
                                    return (
                                        <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                            <select value={palpitesSubPeriod} onChange={(e) => setPalpitesSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8`}>
                                                <option value="all">Todas as Fases</option>
                                                <option value="sul_americana_oitavas">Oitavas de Final</option>
                                                <option value="sul_americana_quartas">Quartas de Final</option>
                                                <option value="sul_americana_fase_final">Fase Final (Semi+Final)</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                        </div>
                                    );
                                }

                                if (activeComp === 'all' && allowedCompetitions.length > 1) {
                                    return (
                                        <div className="relative flex-1 md:flex-none md:w-auto min-w-[130px]">
                                            <select value={palpitesSubPeriod} onChange={(e) => setPalpitesSubPeriod(e.target.value)} className="w-full appearance-none bg-gray-700 text-white border border-gray-600 text-xs font-bold rounded-lg focus:ring-brasil-blue focus:border-brasil-blue block p-2.5 pr-8">
                                                <option value="all">Todo o Período</option>
                                                <option value="mes_07">Julho</option>
                                                <option value="mes_08">Agosto</option>
                                                <option value="mes_09">Setembro</option>
                                                <option value="mes_10">Outubro</option>
                                                <option value="mes_11">Novembro</option>
                                                <option value="mes_12">Dezembro</option>
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-3 text-gray-300 pointer-events-none" />
                                        </div>
                                    );
                                }

                                return null;
                            })()}
                        </div>
                    </div>
                </div>

                {filteredMatches.length === 0 ? (
                    <div className="text-center py-12 px-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                        {filterStatus === 'upcoming' ? (
                            <>
                                <p className="text-green-600 dark:text-green-400 font-black mb-1 text-sm md:text-base">Nenhum jogo aberto no momento.</p>
                                <p className="text-green-600 dark:text-green-400 font-bold text-xs md:text-sm max-w-sm mx-auto">Os jogos desta fase ou competição estarão disponíveis em breve.</p>
                            </>
                        ) : (
                            <p className="text-gray-400 font-medium">Nenhum jogo encontrado.</p>
                        )}
                        <button onClick={clearFilters} className="mt-4 text-sm text-brasil-blue dark:text-blue-400 font-bold hover:underline">Limpar filtros</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredMatches.slice(0, palpitesVisibleCount).map(match => {
                            const isManuallyBlocked = match.is_blocked === true;
                            const locked = isPredictionLocked(match.date, currentTime) || isManuallyBlocked;
                            const userPred = predictions.find(p => p.matchId === match.id && p.userId === currentUser.id && p.leagueId === league.id);
                            const matchDate = new Date(match.date);
                            const isDateValid = !isNaN(matchDate.getTime());
                            const matchRound = getMatchRound(match);
                            const homeValue = pendingEdits[match.id]?.home ?? (userPred?.homeScore?.toString() ?? '');
                            const awayValue = pendingEdits[match.id]?.away ?? (userPred?.awayScore?.toString() ?? '');
                            const isEdited = !!pendingEdits[match.id];
                            let displayPoints = userPred?.points || 0;
                            if (isManuallyBlocked) {
                                displayPoints = 0;
                            } else if ((match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && match.home_score !== null && match.away_score !== null && userPred) {
                                displayPoints = calculatePoints(Number(userPred.homeScore), Number(userPred.awayScore), Number(match.home_score), Number(match.away_score), league.settings);
                            }

                            const stats = currentUser?.isPro ? getMatchStats(String(match.id)) : null;
                            const showBlurStats = !currentUser?.isPro && getMatchStats(String(match.id)) !== null;
                            const canClick = match.phase.includes('Regular Season') || isTeamsDefined(match);

                            const handleMatchClick = async (m: Match, cClick: boolean, mLocked: boolean) => {
                                if (!cClick) return;

                                const isProUser = !!currentUser?.isPro;

                                if (!mLocked) {
                                    if (false && !isProUser && !hasWatchedStatsAd && Capacitor.isNativePlatform()) {
                                        setPendingStatsModal(String(m.id));
                                        try {
                                            if (!adMobModuleRef.current) {
                                                adMobModuleRef.current = await import('@capacitor-community/admob');
                                                await adMobModuleRef.current.AdMob.initialize();
                                            }
                                            setIsPreparingAd(true);
                                            try {
                                                await adMobModuleRef.current.AdMob.prepareRewardInterstitialAd({ adId: 'ca-app-pub-7684468298593275/1743106869', isTesting: false });
                                            } catch (prepError) {
                                                console.warn('Ad prepare failed or already prepared', prepError);
                                            }
                                            await adMobModuleRef.current.AdMob.showRewardInterstitialAd();
                                            setIsPreparingAd(false);
                                        } catch (e) {
                                            console.error('Failed to show ad, opening modal anyway', e);
                                            setIsPreparingAd(false);
                                            setSelectedMatchForStats(Number(m.id));
                                            setPendingStatsModal(null);
                                        }
                                        return;
                                    }
                                    setSelectedMatchForStats(Number(m.id));
                                    return;
                                }

                                const leaguePlan = league?.settings?.plan || (league?.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE');
                                const isVipLeague = leaguePlan !== 'FREE';

                                if (m.status === MatchStatus.FINISHED) {
                                    setSelectedMatchForDetails(Number(m.id));
                                    setMatchDetailsSearch('');
                                    return;
                                }

                                if (!isProUser && !isVipLeague && !hasWatchedPredictionAd && Capacitor.isNativePlatform()) {
                                    setPendingMatchModal(String(m.id));
                                    try {
                                        if (!adMobModuleRef.current) {
                                            adMobModuleRef.current = await import('@capacitor-community/admob');
                                            await adMobModuleRef.current.AdMob.initialize();
                                        }
                                        setIsPreparingAd(true);
                                        try {
                                            await adMobModuleRef.current.AdMob.prepareRewardInterstitialAd({ adId: 'ca-app-pub-7684468298593275/3499840425', isTesting: false });
                                        } catch (prepError) {
                                            console.warn('Ad prepare failed or already prepared', prepError);
                                        }
                                        await adMobModuleRef.current.AdMob.showRewardInterstitialAd();
                                        setIsPreparingAd(false);
                                    } catch (e) {
                                        console.error('Failed to show ad, opening modal anyway', e);
                                        setIsPreparingAd(false);
                                        setSelectedMatchForDetails(Number(m.id));
                                        setMatchDetailsSearch('');
                                        setPendingMatchModal(null);
                                    }
                                    return;
                                }

                                setSelectedMatchForDetails(Number(m.id));
                                setMatchDetailsSearch('');
                            };

                            return (
                                <div key={match.id} onClick={() => handleMatchClick(match, canClick, locked)} className={`group bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-all relative overflow-hidden ${isEdited ? 'border-brasil-yellow ring-1 ring-brasil-yellow' : 'border-gray-200 dark:border-gray-700'} ${canClick ? (locked ? 'cursor-pointer hover:border-brasil-blue dark:hover:border-blue-500 hover:shadow-md' : 'cursor-pointer hover:border-green-400 dark:hover:border-green-500 hover:shadow-md') : ''}`}>
                                    <div className="absolute top-0 right-0">
                                        {isManuallyBlocked ? (
                                            <div className="bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Lock size={10} /> Adiado / Bloqueado - Não Vale Pontos</div>
                                        ) : locked ? (
                                            match.status === MatchStatus.IN_PROGRESS ? <div className="bg-red-100 text-red-600 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1 animate-pulse"><Lock size={10} /> Em Andamento</div> : match.status === MatchStatus.FINISHED ? <div className="bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-300 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Lock size={10} /> Finalizado</div> : <div className="bg-yellow-100 dark:bg-yellow-900 text-orange-600 dark:text-orange-300 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Lock size={10} /> Palpite Encerrado</div>
                                        ) : userPred ? <div className="bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-300 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={10} /> Palpite Salvo</div> : <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-3 py-1 rounded-bl-lg text-[10px] font-bold flex items-center gap-1"><Unlock size={10} /> Palpite Aberto</div>}
                                        {!isManuallyBlocked && <LiveCountdown date={match.date} isLocked={locked} />}
                                    </div>

                                    <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400 mb-4 gap-1 pr-20">
                                        <span className="font-bold text-brasil-blue dark:text-blue-400 uppercase flex items-center gap-1.5 flex-wrap"><Calendar size={12} />{isDateValid ? matchDate.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Data Inválida'}<span className="text-gray-300 dark:text-gray-600">|</span>{isDateValid ? matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}<span className="hidden text-gray-400 dark:text-gray-500 font-normal normal-case flex items-center gap-1"><MapPin size={10} /><span className="truncate max-w-[120px]">{match.location}</span></span></span>
                                        <div className="flex items-center gap-1.5">{(() => { const champ = match.championship; if (champ === 'copa_do_brasil') return <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">Copa do Brasil</span>; if (champ === 'libertadores') return <span className="text-[9px] bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">Libertadores</span>; if (champ === 'sul_americana') return <span className="text-[9px] bg-pink-100 dark:bg-pink-500/30 text-pink-500 dark:text-pink-200 border border-pink-200 dark:border-pink-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">Sul-Americana</span>; return <span className="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shadow-sm">Brasileirão</span>; })()}{match.phase && <span className={`text-[9px] font-black border border-black/5 dark:border-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm ${getRoundColorClass(match.phase, match.championship === 'copa_do_brasil' || match.championship === 'libertadores' || match.championship === 'sul_americana')}`}>{translatePhase(match.phase)}</span>}</div>
                                    </div>
                                    <div className="flex items-center justify-between mb-2 gap-2 flex-nowrap">
                                        <div className="flex flex-col items-center justify-center w-1/3 flex-1 min-w-0 gap-1.5">
                                            <img referrerPolicy='no-referrer' src={getTeamFlag(String(match.home_team_id), teams)} alt={String(match.home_team_id)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-10 h-10 object-contain drop-shadow-sm shrink-0" />
                                            <span className="text-center font-black text-[10px] min-[360px]:text-xs min-[380px]:text-sm md:text-base text-gray-900 dark:text-gray-100 leading-tight truncate w-full px-1" title={getTeamNameForDisplay(match.home_team_id)}>{getTeamNameForDisplay(match.home_team_id)}</span>
                                            {stats && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">{stats.home_win_pct}%</span>}
                                        </div>

                                        <div className="flex flex-col items-center justify-center shrink-0 relative px-1">
                                            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}><input id={`home-${String(String(match.id))}`} name={`home-${String(String(match.id))}`} type="text" inputMode="numeric" maxLength={2} autoComplete="off" disabled={locked} value={homeValue} onChange={(e) => handleScoreChange(String(String(match.id)), 'home', e.target.value, userPred)} placeholder="-" className={`w-14 h-12 text-center border rounded-lg font-bold text-xl md:text-2xl focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue outline-none transition-all ${locked ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-pointer' : 'bg-gray-700 border-gray-600 text-white'}`} /><span className="text-gray-300 dark:text-gray-600 text-sm font-bold">X</span><input id={`away-${String(String(match.id))}`} name={`away-${String(String(match.id))}`} type="text" inputMode="numeric" maxLength={2} autoComplete="off" disabled={locked} value={awayValue} onChange={(e) => handleScoreChange(String(String(match.id)), 'away', e.target.value, userPred)} placeholder="-" className={`w-14 h-12 text-center border rounded-lg font-bold text-xl md:text-2xl focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue outline-none transition-all ${locked ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-pointer' : 'bg-gray-700 border-gray-600 text-white'}`} /></div>
                                            {stats && <span className="text-[10px] font-bold text-gray-400 mt-3">{stats.draw_pct}% Empate</span>}



                                        </div>
                                        <div className="flex flex-col items-center justify-center w-1/3 flex-1 min-w-0 gap-1.5">
                                            <img referrerPolicy='no-referrer' src={getTeamFlag(String(match.away_team_id), teams)} alt={String(match.away_team_id)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-10 h-10 object-contain drop-shadow-sm shrink-0" />
                                            <span className="text-center font-black text-[10px] min-[360px]:text-xs min-[380px]:text-sm md:text-base text-gray-900 dark:text-gray-100 leading-tight truncate w-full px-1" title={getTeamNameForDisplay(match.away_team_id)}>{getTeamNameForDisplay(match.away_team_id)}</span>
                                            {stats && <span className="text-[10px] font-bold text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded shrink-0">{stats.away_win_pct}%</span>}
                                        </div>
                                    </div>
                                    
                                    {/* Dynamic Save Button */}
                                    <div className={`transition-all duration-300 overflow-hidden flex justify-center w-full ${targetMatchForButton === String(match.id) ? 'max-h-20 mb-3 opacity-100' : 'max-h-0 opacity-0'}`}>
                                        <button onClick={(e) => { e.stopPropagation(); handleSaveAll(); }} disabled={isSavingPalpites} className="bg-brasil-green hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-md font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 border border-green-400 whitespace-nowrap min-w-[160px]">
                                            {isSavingPalpites ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                            <span>{isSavingPalpites ? 'Salvando...' : `Salvar ${Object.values(pendingEdits).filter(val => val.home !== '' && val.away !== '').length} jogo(s)`}</span>
                                        </button>
                                    </div>
                                    {
                                        (match.status === MatchStatus.FINISHED || match.status === MatchStatus.IN_PROGRESS) && match.home_score !== null && match.away_score !== null && (
                                            <div className="mt-3 flex gap-2">
                                                {/* Placar Final */}
                                                <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg border ${match.status === MatchStatus.IN_PROGRESS ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-600'}`}>
                                                    <div className={`text-[10px] font-bold uppercase mb-1 flex items-center gap-1 ${match.status === MatchStatus.IN_PROGRESS ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                                        {match.status === MatchStatus.IN_PROGRESS ? (
                                                            <><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {match.match_time || 'Ao Vivo'}</>
                                                        ) : (
                                                            <>Placar Final</>
                                                        )}
                                                    </div>
                                                    <div className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight">
                                                        {match.home_score} <span className="text-xs text-gray-400 font-normal mx-0.5">x</span> {match.away_score}
                                                    </div>
                                                </div>

                                                {/* Pontuação do Usuário */}
                                                {userPred ? (
                                                    <div className={`flex-1 flex flex-col items-center justify-center p-2 rounded-lg border ${displayPoints > 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-600'}`}>
                                                        <div className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">

                                                            {match.status === MatchStatus.IN_PROGRESS ? 'Parcial' : 'Pontos'}
                                                        </div>
                                                        <div className={`text-xl font-black leading-none tracking-tight ${displayPoints > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                                                            +{displayPoints}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex-1 flex flex-col items-center justify-center p-2 rounded-lg border bg-gray-50 dark:bg-gray-700/30 border-gray-100 dark:border-gray-600 opacity-60">
                                                        <div className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1">
                                                            Sem Palpite
                                                        </div>
                                                        <div className="text-xl font-black text-gray-400 dark:text-gray-500 leading-none">
                                                            -
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    }
                                    {showBlurStats && (
                                        <div className="mt-3 relative h-10 overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center cursor-pointer border border-gray-100 dark:border-gray-600 group" onClick={(e) => { e.stopPropagation(); setSelectedMatchForStats(Number(match.id)); }}>
                                            <div className="absolute inset-0 bg-white/40 dark:bg-black/20 backdrop-blur-[2px] flex items-center justify-center transition-all group-hover:backdrop-blur-0">
                                                <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest flex items-center gap-1.5 bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-full shadow-sm"><Crown size={12} className="text-yellow-500" /> Ver Estatísticas PRO</span>
                                            </div>
                                        </div>
                                    )}
                                    {!showBlurStats && canClick && (
                                        <div className="mt-3 flex justify-center border-t border-gray-100 dark:border-gray-700/50 pt-3">
                                            <div className={`flex items-center justify-center gap-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400 transition-colors uppercase tracking-wider ${locked ? 'group-hover:text-brasil-blue dark:group-hover:text-blue-400' : 'group-hover:text-green-600 dark:group-hover:text-green-400'}`}>
                                                {locked ? <Users size={14} /> : <BarChart2 size={14} />} {locked ? 'Confira os Palpites' : 'Estatísticas'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        {filteredMatches.length > palpitesVisibleCount && (
                            <div className="pt-2 pb-6">
                                <button
                                    onClick={() => setPalpitesVisibleCount(prev => prev + 20)}
                                    className="w-full bg-brasil-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm"
                                >
                                    Carregar mais jogos (Mostrando {palpitesVisibleCount} de {filteredMatches.length})
                                </button>
                            </div>
                        )}
                        {selectedMatchForDetails && detailsData && (() => {
                            const isMatchLockedOrLive = isPredictionLocked(detailsData.match.date, currentTime) || detailsData.match.status === MatchStatus.IN_PROGRESS;
                            const isFinished = detailsData.match.status === MatchStatus.FINISHED;
                            const shouldBlockPredictions = !currentUser?.isPro && isMatchLockedOrLive && !isFinished && !hasWatchedPredictionAd;

                            if (shouldBlockPredictions) {
                                return createPortal(
                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchForDetails(null)}>
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
                                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/5" />
                                                <div className="relative z-10">
                                                    <div className="flex justify-end mb-1">
                                                        <button onClick={() => { setSelectedMatchForDetails(null); setMatchDetailsSearch(''); setMatchDetailsPage(1); }} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"><X size={16} /></button>
                                                    </div>
                                                    <div className="flex justify-center mb-3">
                                                        <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-3.5 rounded-full shadow-lg">
                                                            <Lock size={24} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-2">
                                                        <Star size={8} fill="currentColor" /> Recurso PRO
                                                    </div>
                                                    <h3 className="text-white font-black text-lg leading-tight">Palpites da Galera</h3>
                                                    <p className="text-gray-400 text-xs mt-1">Disponível somente para usuários PRO</p>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                <p className="text-sm text-gray-700 dark:text-gray-300 text-center leading-relaxed">
                                                    Para ver os palpites dos participantes nas partidas em andamento, assine o plano PRO ou aguarde até que o jogo seja finalizado.
                                                </p>
                                                <div className="space-y-2 border-t border-gray-150 dark:border-gray-700 pt-4">
                                                    {[
                                                        { icon: Eye, text: 'Acompanhe os palpites de todos em tempo real', color: 'text-amber-500' },
                                                        { icon: Target, text: 'Seca ou torce sabendo exatamente o placar do adversário', color: 'text-emerald-500' },
                                                        { icon: BarChart2, text: 'Estatísticas exclusivas e placares mais palpitados', color: 'text-blue-500' },
                                                        { icon: Users, text: 'Escalação Confirmada', color: 'text-cyan-500' },
                                                        { icon: Activity, text: 'Lances e Scouts da Partida', color: 'text-teal-500' },
                                                        { icon: Bell, text: 'Notificações Push Premium', color: 'text-fuchsia-500' },
                                                    ].map(({ icon: Icon, text, color }, i) => (
                                                        <div key={i} className="flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300">
                                                            <div className={`${color} shrink-0`}><Icon size={14} /></div>
                                                            <span>{text}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="px-5 pb-5">
                                                <button
                                                    onClick={() => { setSelectedMatchForDetails(null); navigate('/seja-pro'); }}
                                                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-900 font-black py-3.5 px-6 rounded-xl text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Crown size={16} fill="currentColor" />
                                                    SEJA PRO
                                                </button>
                                                <button onClick={() => setSelectedMatchForDetails(null)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors">Fechar</button>
                                            </div>
                                        </div>
                                    </div>, document.body
                                );
                            }

                            const statsFromApi = matchDetailedStats?.stats;
                            const totalPreds = statsFromApi?.total || 0;
                            const homeWinPct = totalPreds > 0 ? Math.round(((statsFromApi?.home_wins || 0) / totalPreds) * 100) : 0;
                            const awayWinPct = totalPreds > 0 ? Math.round(((statsFromApi?.away_wins || 0) / totalPreds) * 100) : 0;
                            const drawPct = totalPreds > 0 ? 100 - homeWinPct - awayWinPct : 0;

                            // Calculate most predicted score
                            let mostPredictedScore = null as string | null;
                            if (totalPreds > 0 && matchDetailedStats?.predictions) {
                                const counts: Record<string, number> = {};
                                matchDetailedStats.predictions.forEach((p: any) => {
                                    const key = `${p.home_score} x ${p.away_score}`;
                                    counts[key] = (counts[key] || 0) + 1;
                                });
                                let maxCount = 0;
                                Object.entries(counts).forEach(([key, count]) => {
                                    if (count > maxCount) { maxCount = count; mostPredictedScore = key; }
                                    else if (count === maxCount && mostPredictedScore !== null) {
                                        const [hA, aA] = mostPredictedScore.split(' x ').map(Number);
                                        const [hB, aB] = key.split(' x ').map(Number);
                                        if (hB + aB < hA + aA || (hB + aB === hA + aA && hB > hA)) { mostPredictedScore = key; }
                                    }
                                });
                            }

                            return createPortal(
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchForDetails(null)}>
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                                        <div className="bg-gradient-to-r from-brasil-blue to-blue-500 dark:from-blue-900 dark:to-blue-700 text-white p-4 shrink-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-bold text-sm uppercase tracking-wide opacity-80">Palpites da Liga</h3>
                                                    <p className="text-blue-100 text-[10px] font-bold">
                                                        {totalPreds} palpite{totalPreds !== 1 ? 's' : ''} registrado{totalPreds !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                                <button onClick={() => setSelectedMatchForDetails(null)} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
                                            </div>
                                            <div className="flex items-center justify-between gap-4"><div className="flex flex-col items-center w-1/3"><img referrerPolicy='no-referrer' src={getTeamFlag(detailsData.match.home_team_id, teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-9 h-9 object-contain drop-shadow-sm mb-1" /><span className="text-xs font-bold text-center leading-tight">{getTeamNameForDisplay(detailsData.match.home_team_id)}</span></div><div className="flex flex-col items-center"><div className="text-2xl font-black bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20 whitespace-nowrap">{detailsData.match.home_score ?? '-'} <span className="text-sm mx-1">x</span> {detailsData.match.away_score ?? '-'}</div><span className={`text-[10px] mt-1 font-bold px-2 py-0.5 rounded-full ${detailsData.match.status === MatchStatus.IN_PROGRESS ? 'bg-red-500 text-white animate-pulse' : detailsData.match.status === MatchStatus.FINISHED ? 'bg-black/30 text-white' : 'bg-blue-800 text-blue-200'}`}>{detailsData.match.status === MatchStatus.IN_PROGRESS ? (detailsData.match.match_time || 'AO VIVO') : detailsData.match.status === MatchStatus.FINISHED ? 'ENCERRADO' : 'AGUARDANDO'}</span></div><div className="flex flex-col items-center w-1/3"><img referrerPolicy='no-referrer' src={getTeamFlag(detailsData.match.away_team_id, teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-9 h-9 object-contain drop-shadow-sm mb-1" /><span className="text-xs font-bold text-center leading-tight">{getTeamNameForDisplay(detailsData.match.away_team_id)}</span></div></div>
                                        </div>

                                        {isLoadingDetailedStats ? (
                                            <div className="flex-1 flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800">
                                                <Loader2 className="animate-spin text-brasil-green dark:text-green-400" size={32} />
                                                <span className="text-sm font-bold text-gray-400 mt-4">Carregando estatísticas...</span>
                                            </div>
                                        ) : detailsData.match.is_blocked ? (
                                            <div className="flex-1 flex flex-col items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 p-6 text-center">
                                                <Lock className="text-red-500 mb-3" size={40} />
                                                <h4 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">Jogo Adiado / Bloqueado</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Não Vale Pontos e os palpites não são exibidos.</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                    <button onClick={() => setActiveDetailsTab('palpites')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeDetailsTab === 'palpites' ? 'bg-white dark:bg-gray-700 text-brasil-blue dark:text-white border-b-2 border-brasil-blue' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'}`}>Palpites</button>
                                                    <button onClick={() => setActiveDetailsTab('escalacao')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeDetailsTab === 'escalacao' ? 'bg-white dark:bg-gray-700 text-brasil-blue dark:text-white border-b-2 border-brasil-blue' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'}`}>Escalação</button>
                                                    <button onClick={() => setActiveDetailsTab('lances')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeDetailsTab === 'lances' ? 'bg-white dark:bg-gray-700 text-brasil-blue dark:text-white border-b-2 border-brasil-blue' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'}`}>Lances</button>
                                                    <button onClick={() => setActiveDetailsTab('scouts')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeDetailsTab === 'scouts' ? 'bg-white dark:bg-gray-700 text-brasil-blue dark:text-white border-b-2 border-brasil-blue' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'}`}>Scouts</button>
                                                </div>
                                                {activeDetailsTab === 'palpites' && (
                                                <>
                                                {/* Stats bar: Mais palpitado + Distribuição — idêntico ao modo Copa */}
                                                {totalPreds > 0 && (() => {
                                                    const getPctColor = (pct: number, otherPct: number) => {
                                                        if (pct > otherPct) return "text-emerald-600 dark:text-emerald-400";
                                                        if (pct < otherPct) return "text-amber-700 dark:text-amber-500";
                                                        return "text-gray-900 dark:text-gray-100";
                                                    };
                                                    return (
                                                        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 px-2 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs shrink-0 shadow-sm overflow-hidden">
                                                            {mostPredictedScore && mostPredictedScore !== '-' && (
                                                                <div className="flex flex-col items-center justify-center shrink-0 w-24">
                                                                    <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Mais palpitado</span>
                                                                    <span className="text-base font-black text-gray-800 dark:text-gray-200 mt-1 text-center">{mostPredictedScore}</span>
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col items-center flex-1 min-w-0">
                                                                <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 text-center">Distribuição</span>
                                                                <div className="w-full flex items-center gap-1 text-[10px] font-bold text-gray-600 dark:text-gray-300">
                                                                    <div className="flex-1 flex flex-col items-center bg-gray-50 dark:bg-gray-750 py-0.5 px-1 rounded border border-gray-100 dark:border-gray-700 min-w-0" title={getTeamNameForDisplay(detailsData.match.home_team_id)}>
                                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase leading-none truncate w-full text-center">{getTeamNameForDisplay(detailsData.match.home_team_id)}</span>
                                                                        <span className={`text-xs font-black mt-0.5 ${getPctColor(homeWinPct, awayWinPct)}`}>{homeWinPct}%</span>
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col items-center bg-gray-50 dark:bg-gray-750 py-0.5 px-1 rounded border border-gray-100 dark:border-gray-700 min-w-0">
                                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase leading-none truncate w-full text-center">Empate</span>
                                                                        <span className="text-xs font-black mt-0.5 text-gray-900 dark:text-gray-400">{drawPct}%</span>
                                                                    </div>
                                                                    <div className="flex-1 flex flex-col items-center bg-gray-50 dark:bg-gray-750 py-0.5 px-1 rounded border border-gray-100 dark:border-gray-700 min-w-0" title={getTeamNameForDisplay(detailsData.match.away_team_id)}>
                                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 uppercase leading-none truncate w-full text-center">{getTeamNameForDisplay(detailsData.match.away_team_id)}</span>
                                                                        <span className={`text-xs font-black mt-0.5 ${getPctColor(awayWinPct, homeWinPct)}`}>{awayWinPct}%</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600"><div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={16} /><input type="text" placeholder="Buscar participante..." value={matchDetailsSearch} onChange={(e) => { setMatchDetailsSearch(e.target.value); setMatchDetailsPage(1); }} className="w-full bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-lg pl-9 pr-8 py-2 text-sm focus:ring-1 focus:ring-brasil-blue focus:border-brasil-blue outline-none" />{matchDetailsSearch && (<button onClick={() => { setMatchDetailsSearch(''); setMatchDetailsPage(1); }} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>)}</div></div>
                                                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800 p-0">
                                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {(() => {
                                                            const pagedDetailsParticipants = filteredDetailsParticipants.slice((matchDetailsPage - 1) * 100, matchDetailsPage * 100);
                                                            const totalDetailsPages = Math.ceil(filteredDetailsParticipants.length / 100);

                                                            if (pagedDetailsParticipants.length === 0) {
                                                                return <div className="text-center py-8 text-gray-400 text-sm">Nenhum participante encontrado.</div>;
                                                            }

                                                            return (
                                                                <>
                                                                    {pagedDetailsParticipants.map(({ user, pred }, idx) => {
                                                                        const globalIdx = (matchDetailsPage - 1) * 100 + idx + 1;
                                                                        let points = pred?.points || 0;
                                                                        if (detailsData.match.is_blocked) {
                                                                            points = 0;
                                                                        } else if (detailsData.match.status === MatchStatus.FINISHED || detailsData.match.status === MatchStatus.IN_PROGRESS) {
                                                                            if (pred && detailsData.match.home_score !== null && detailsData.match.away_score !== null) {
                                                                                points = calculatePoints(Number(pred.homeScore), Number(pred.awayScore), Number(detailsData.match.home_score), Number(detailsData.match.away_score), league.settings);
                                                                            }
                                                                        }
                                                                        return (
                                                                            <div key={user.id} className={`p-3 flex items-center justify-between ${user.id === currentUser.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : 'bg-white dark:bg-gray-800'}`}>
                                                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                                                    <div className="relative shrink-0">
                                                                                        <OptimizedImage src={user.avatar} containerClassName="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-600" className="w-full h-full object-cover" alt="" />
                                                                                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300 border border-white dark:border-gray-700 shadow-sm">{globalIdx}</div>
                                                                                    </div>
                                                                                    <div className="min-w-0 flex-1">
                                                                                        <div className="font-bold text-sm text-gray-800 dark:text-gray-200 flex items-center gap-1">
                                                                                            <span className="truncate">{user.name}</span>
                                                                                            {user.id === currentUser.id && <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 shrink-0">(Você)</span>}
                                                                                        </div>
                                                                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{pred ? 'Palpite enviado' : 'Não palpitou'}</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                                                                    <div className="text-lg font-black text-gray-700 dark:text-gray-300 tracking-wider whitespace-nowrap">
                                                                                        {pred ? <>{pred.homeScore} <span className="text-gray-300 dark:text-gray-600 text-sm">x</span> {pred.awayScore}</> : <span className="text-gray-300 dark:text-gray-600 text-sm">-</span>}
                                                                                    </div>
                                                                                    <div className={`w-12 text-center rounded py-1 text-xs font-bold shrink-0 ${points > 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : points === 0 && pred ? 'bg-red-50 dark:bg-red-900/30 text-red-400 dark:text-red-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>{points > 0 ? `+${points}` : '0'} pts</div>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                    {totalDetailsPages > 1 && (
                                                                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between sticky bottom-0">
                                                                            <button
                                                                                onClick={() => setMatchDetailsPage(p => Math.max(1, p - 1))}
                                                                                disabled={matchDetailsPage === 1}
                                                                                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                                            >
                                                                                <ChevronLeft size={20} />
                                                                            </button>
                                                                            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                                                                                Página {matchDetailsPage} de {totalDetailsPages}
                                                                            </span>
                                                                            <button
                                                                                onClick={() => setMatchDetailsPage(p => Math.min(totalDetailsPages, p + 1))}
                                                                                disabled={matchDetailsPage === totalDetailsPages}
                                                                                className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50"
                                                                            >
                                                                                <ChevronRight size={20} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                                </>
                                                )}
                                                {activeDetailsTab === 'escalacao' && <TabEscalacao data={matchLazyDetails} isLoading={isLoadingLazyDetails} getTeamName={getTeamNameForDisplay} getTeamFlag={(id) => getTeamFlag(String(id), teams)} />}
                                                {activeDetailsTab === 'lances' && <TabLances data={matchLazyDetails} isLoading={isLoadingLazyDetails} getTeamName={getTeamNameForDisplay} getTeamFlag={(id) => getTeamFlag(String(id), teams)} />}
                                                {activeDetailsTab === 'scouts' && <TabScouts data={matchLazyDetails} isLoading={isLoadingLazyDetails} getTeamName={getTeamNameForDisplay} getTeamFlag={(id) => getTeamFlag(String(id), teams)} />}
                                            </>
                                        )}
                                    </div>
                                </div>, document.body
                            );
                        })()}

                        {/* STATS MODAL: shown before prediction lock */}
                        {selectedMatchForStats && (() => {
                            const sm = matches.find(m => m.id == selectedMatchForStats);
                            if (!sm) return null;

                            // Non-PRO: show teaser modal if they haven't watched the ad
                            if (!currentUser?.isPro && !hasWatchedStatsAd) {
                                return createPortal(
                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchForStats(null)}>
                                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-300 overflow-hidden" onClick={e => e.stopPropagation()}>
                                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-center relative overflow-hidden">
                                                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-amber-500/5" />
                                                <div className="relative z-10">
                                                    <div className="flex justify-end mb-1">
                                                        <button onClick={() => setSelectedMatchForStats(null)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors text-white"><X size={16} /></button>
                                                    </div>
                                                    <div className="flex justify-center mb-3">
                                                        <div className="bg-gradient-to-br from-yellow-400 to-amber-600 p-3.5 rounded-full shadow-lg">
                                                            <Lock size={24} className="text-white" />
                                                        </div>
                                                    </div>
                                                    <div className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest mb-2">
                                                        <Star size={8} fill="currentColor" /> Recurso PRO
                                                    </div>
                                                    <h3 className="text-white font-black text-lg leading-tight">Estatísticas Exclusivas</h3>
                                                    <p className="text-gray-400 text-xs mt-1">Disponível somente para usuários PRO</p>
                                                </div>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                {[
                                                    { icon: Trophy, text: 'Placar mais palpitado pelos participantes', color: 'text-amber-500' },
                                                    { icon: BarChart2, text: 'Distribuição: % Casa, Empate, Visitante', color: 'text-emerald-500' },
                                                    { icon: Calendar, text: 'Histórico recente dos times', color: 'text-blue-500' },
                                                    { icon: Eye, text: 'Palpites em Tempo Real', color: 'text-rose-500' },
                                                    { icon: Users, text: 'Escalação Confirmada', color: 'text-cyan-500' },
                                                    { icon: Activity, text: 'Lances e Scouts da Partida', color: 'text-teal-500' },
                                                    { icon: Bell, text: 'Notificações Push Premium', color: 'text-fuchsia-500' },
                                                ].map(({ icon: Icon, text, color }, i) => (
                                                    <div key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                                                        <div className={`${color} shrink-0`}><Icon size={16} /></div>
                                                        <span>{text}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="px-5 pb-5">
                                                <button
                                                    onClick={() => { setSelectedMatchForStats(null); navigate('/seja-pro'); }}
                                                    className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-gray-900 font-black py-3.5 px-6 rounded-xl text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                                                >
                                                    <Crown size={16} fill="currentColor" />
                                                    SEJA PRO
                                                </button>
                                                <button onClick={() => setSelectedMatchForStats(null)} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 mt-3 transition-colors">Fechar</button>
                                            </div>
                                        </div>
                                    </div>, document.body
                                );
                            }

                            const totalPreds = apiMatchStats?.totalPreds ?? 0;
                            const mostPredictedScore = apiMatchStats?.mostPredictedScore ?? null;
                            const homeWinPct = apiMatchStats?.homeWinPct ?? 0;
                            const drawPct = apiMatchStats?.drawPct ?? 0;
                            const awayWinPct = apiMatchStats?.awayWinPct ?? 0;

                            const predictedUserIds = apiMatchStats?.predictedUserIds ?? [];
                            const predictedUsersDetails = apiMatchStats?.predictedUsersDetails ?? [];
                            const leaguePreds = predictions.filter(p => p.matchId === smForStats.id && p.leagueId === league.id);

                            const predictedParticipants = league.participants
                                .filter(uid => predictedUserIds.includes(uid))
                                .map(uid => {
                                    const u = mergedUsers.find(u => u.id === uid) || { id: uid, name: 'Usuário', avatar: '' } as User;
                                    const pred = leaguePreds.find(p => p.userId === uid);
                                    const detail = predictedUsersDetails.find((d: any) => d.user_id === uid);
                                    const savedAt = (apiMatchStats?.predictionTimestamps || {})[uid];
                                    return { ...u, pred, detail, savedAt };
                                })
                                .sort((a, b) => a.name.localeCompare(b.name));

                            const missingParticipants = league.participants
                                .filter(uid => !predictedUserIds.includes(uid))
                                .map(uid => mergedUsers.find(u => u.id === uid) || { id: uid, name: 'Usuário', avatar: '' } as User)
                                .sort((a, b) => a.name.localeCompare(b.name));

                            const filteredPredicted = predictedParticipants.filter(u =>
                                u.name.toLowerCase().includes(statsSearch.toLowerCase())
                            );

                            const filteredMissing = missingParticipants.filter(u =>
                                u.name.toLowerCase().includes(statsSearch.toLowerCase())
                            );

                            const PAGE_SIZE = 100;
                            const totalSavedPages = Math.max(1, Math.ceil(filteredPredicted.length / PAGE_SIZE));
                            const safeSavedPage = Math.min(statsPageSaved, totalSavedPages);
                            const pagedPredicted = filteredPredicted.slice((safeSavedPage - 1) * PAGE_SIZE, safeSavedPage * PAGE_SIZE);

                            const totalPendingPages = Math.max(1, Math.ceil(filteredMissing.length / PAGE_SIZE));
                            const safePendingPage = Math.min(statsPagePending, totalPendingPages);
                            const pagedMissing = filteredMissing.slice((safePendingPage - 1) * PAGE_SIZE, safePendingPage * PAGE_SIZE);

                            const [mHome, mAway] = mostPredictedScore ? mostPredictedScore.split('-').map(Number) : [null, null];
                            const homeLeads = homeWinPct >= awayWinPct;
                            const awayLeads = awayWinPct > homeWinPct;
                            return createPortal(

                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedMatchForStats(null)}>
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                                        {/* Header */}
                                        <div className="bg-gradient-to-r from-emerald-700 to-green-600 text-white p-4 shrink-0">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-white/15 p-1.5 rounded-lg"><BarChart2 size={16} /></div>
                                                    <div>
                                                        <h3 className="font-black text-base uppercase tracking-widest">Estatísticas da Liga</h3>
                                                        <p className="text-emerald-100 text-sm mt-0.5 font-bold">
                                                            {loadingStats ? 'Carregando palpites...' : `${totalPreds} palpite${totalPreds !== 1 ? 's' : ''} registrado${totalPreds !== 1 ? 's' : ''}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedMatchForStats(null)} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><X size={18} /></button>
                                            </div>
                                            {/* Match teams */}
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col items-center w-1/3 gap-1">
                                                    <img referrerPolicy='no-referrer' src={getTeamFlag(String(sm.home_team_id), teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-10 h-10 object-contain drop-shadow-sm" alt={String(sm.home_team_id)} />
                                                    <span className="text-sm font-bold text-center leading-tight">{getTeamNameForDisplay(sm.home_team_id)}</span>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="text-lg font-black bg-white/15 px-4 py-1.5 rounded-xl border border-white/20 tracking-widest">VS</div>
                                                </div>
                                                <div className="flex flex-col items-center w-1/3 gap-1">
                                                    <img referrerPolicy='no-referrer' src={getTeamFlag(String(sm.away_team_id), teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-10 h-10 object-contain drop-shadow-sm" alt={String(sm.away_team_id)} />
                                                    <span className="text-sm font-bold text-center leading-tight">{getTeamNameForDisplay(sm.away_team_id)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                            <button onClick={() => setActiveStatsTab('estatisticas')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeStatsTab === 'estatisticas' ? 'bg-white dark:bg-gray-700 text-brasil-blue dark:text-white border-b-2 border-brasil-blue' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'}`}>Estatísticas</button>
                                            <button onClick={() => setActiveStatsTab('escalacao')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center transition-colors ${activeStatsTab === 'escalacao' ? 'bg-white dark:bg-gray-700 text-brasil-blue dark:text-white border-b-2 border-brasil-blue' : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white'}`}>Escalação</button>
                                        </div>
                                        <div className="p-0 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-800">
                                        {activeStatsTab === 'estatisticas' && (
                                        <div className="p-4 space-y-4 animate-in fade-in duration-200">
                                            {true && (
                                                <>
                                                    {loadingStats ? (
                                                        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-500 dark:text-gray-400">
                                                            <Loader2 className="animate-spin text-brasil-green" size={32} />
                                                            <span className="text-xs font-bold uppercase tracking-wider">Carregando estatísticas...</span>
                                                        </div>
                                                    ) : totalPreds === 0 ? (
                                                        <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                                                            <BarChart2 size={36} className="mx-auto mb-3 opacity-30" />
                                                            <p className="text-sm font-medium">Nenhum palpite registrado ainda</p>
                                                            <p className="text-xs mt-1 opacity-70">As estatísticas aparecerão quando os participantes fizerem seus palpites.</p>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="space-y-4">
                                                                {/* Standings */}
                                                                {statsStandings && statsStandings.length > 0 && (
                                                                    <div className="bg-white dark:bg-gray-700/60 rounded-xl p-3 border border-gray-100 dark:border-gray-600 shadow-sm flex items-center justify-between text-center gap-2">
                                                                        {(() => {
                                                                            const homeStanding = statsStandings.find(s => String(s.team_id) === String(sm.home_team_id));
                                                                            const awayStanding = statsStandings.find(s => String(s.team_id) === String(sm.away_team_id));
                                                                            return (
                                                                                <>
                                                                                    <div className="flex flex-col items-center flex-1">
                                                                                        <span className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-0.5">{homeStanding ? `${homeStanding.position}º Lugar` : '-'}</span>
                                                                                        <span className="text-xl font-black text-brasil-green dark:text-green-400">{homeStanding ? `${homeStanding.points} pts` : '-'}</span>
                                                                                    </div>
                                                                                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-600"></div>
                                                                                    <div className="flex flex-col items-center flex-1">
                                                                                        <span className="text-xs font-bold uppercase text-gray-700 dark:text-gray-300 mb-0.5">{awayStanding ? `${awayStanding.position}º Lugar` : '-'}</span>
                                                                                        <span className="text-xl font-black text-brasil-green dark:text-green-400">{awayStanding ? `${awayStanding.points} pts` : '-'}</span>
                                                                                    </div>
                                                                                </>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                )}

                                                                {/* Most Predicted Score */}
                                                                <div className="bg-white dark:bg-gray-700/60 rounded-xl p-4 border border-gray-100 dark:border-gray-600 shadow-sm flex flex-col items-center justify-center text-center gap-3">
                                                                    <div className="flex flex-col items-center">
                                                                        <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 mb-0.5 flex items-center gap-1.5">
                                                                            <Trophy size={10} className="text-yellow-500" /> Placar mais palpitado
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">Entre os palpites já registrados na liga</span>
                                                                    </div>
                                                                    {mHome !== null && mAway !== null && (
                                                                        <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 px-5 py-2 rounded-xl border border-gray-100 dark:border-gray-700 shadow-inner">
                                                                            <span className="text-3xl font-black text-gray-800 dark:text-gray-200">{mHome}</span>
                                                                            <span className="text-sm font-bold text-gray-400">x</span>
                                                                            <span className="text-3xl font-black text-gray-800 dark:text-gray-200">{mAway}</span>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Bet distribution */}
                                                                <div className="bg-white dark:bg-gray-700/60 rounded-xl p-3.5 border border-gray-100 dark:border-gray-600 shadow-sm space-y-3">
                                                                    <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                                                                        <BarChart2 size={10} /> Distribuição dos palpites
                                                                    </div>

                                                                    {/* Legend with flags */}
                                                                    <div className="flex items-stretch justify-between gap-2">
                                                                        <div className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border ${homeLeads && !awayLeads
                                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                                                            : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400'
                                                                            }`}>
                                                                            <img referrerPolicy='no-referrer' src={getTeamFlag(sm.home_team_id, teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-8 h-8 object-contain drop-shadow-sm" />
                                                                            <span className="text-xs font-bold text-center leading-tight max-w-[80px] truncate">{getTeamNameForDisplay(sm.home_team_id)}</span>
                                                                            <span className="text-2xl font-black tabular-nums">{homeWinPct}%</span>
                                                                        </div>
                                                                        <div className="flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400">
                                                                            <div className="w-10 h-6 flex items-center justify-center text-lg">🤝</div>
                                                                            <span className="text-xs font-bold">Empate</span>
                                                                            <span className="text-2xl font-black tabular-nums dark:text-black">{drawPct}%</span>
                                                                        </div>
                                                                        <div className={`flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border ${awayLeads
                                                                            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                                                            : 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400'
                                                                            }`}>
                                                                            <img referrerPolicy='no-referrer' src={getTeamFlag(sm.away_team_id, teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-8 h-8 object-contain drop-shadow-sm" />
                                                                            <span className="text-xs font-bold text-center leading-tight max-w-[80px] truncate">{getTeamNameForDisplay(sm.away_team_id)}</span>
                                                                            <span className="text-2xl font-black tabular-nums">{awayWinPct}%</span>
                                                                        </div>
                                                                    </div>

                                                                </div>

                                                                {/* Team History */}
                                                                <div className="grid grid-cols-1 gap-4 mt-2">
                                                                    {/* Home Team History */}
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 mt-2 flex items-center justify-center gap-2">
                                                                            <img referrerPolicy='no-referrer' src={getTeamFlag(sm.home_team_id, teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-8 h-8 object-contain drop-shadow-sm" /> Últimos jogos: {getTeamNameForDisplay(sm.home_team_id)}
                                                                        </div>
                                                                        {getBrasileiraoHistoryForTeam(String(sm.home_team_id), sm.date, sm.championship || 'brasileirao').map(h => (
                                                                            <div key={h.id} className={`p-3 rounded-lg border flex justify-between items-center ${h.result === 'Vitória' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' :
                                                                                h.result === 'Derrota' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' :
                                                                                    h.result === 'Empate' ? 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-400' :
                                                                                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                                                                }`}>
                                                                                <div className="flex flex-col flex-1 items-center justify-center overflow-hidden">
                                                                                    <span className="font-semibold text-[11px] md:text-xs opacity-75 text-center truncate w-full">{h.competition}{h.date ? ' - ' + h.date.split('T')[0].split('-').reverse().join('/') : ''}</span>
                                                                                    <span className="font-bold text-sm md:text-base text-center truncate w-full">{h.match_str}</span>
                                                                                </div>
                                                                                {h.result && (
                                                                                    <span className={`ml-2 px-2.5 py-1 rounded text-xs font-bold shrink-0 ${h.result === 'Vitória' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                                                                                        h.result === 'Derrota' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                                                                                            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                                                        }`}>{h.result.charAt(0)}</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {/* Away Team History */}
                                                                    <div className="flex flex-col gap-2">
                                                                        <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400 mb-2 mt-2 flex items-center justify-center gap-2">
                                                                            <img referrerPolicy='no-referrer' src={getTeamFlag(sm.away_team_id, teams)} onError={(e) => { (e.target as HTMLImageElement).src = LOGO_FALLBACK; }} className="w-8 h-8 object-contain drop-shadow-sm" /> Últimos jogos: {getTeamNameForDisplay(sm.away_team_id)}
                                                                        </div>
                                                                        {getBrasileiraoHistoryForTeam(String(sm.away_team_id), sm.date, sm.championship || 'brasileirao').map(h => (
                                                                            <div key={h.id} className={`p-3 rounded-lg border flex justify-between items-center ${h.result === 'Vitória' ? 'bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300' :
                                                                                h.result === 'Derrota' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300' :
                                                                                    h.result === 'Empate' ? 'bg-gray-50/50 dark:bg-gray-800/50 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-400' :
                                                                                        'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                                                                                }`}>
                                                                                <div className="flex flex-col flex-1 items-center justify-center overflow-hidden">
                                                                                    <span className="font-semibold text-[11px] md:text-xs opacity-75 text-center truncate w-full">{h.competition}{h.date ? ' - ' + h.date.split('T')[0].split('-').reverse().join('/') : ''}</span>
                                                                                    <span className="font-bold text-sm md:text-base text-center truncate w-full">{h.match_str}</span>
                                                                                </div>
                                                                                {h.result && (
                                                                                    <span className={`ml-2 px-2.5 py-1 rounded text-xs font-bold shrink-0 ${h.result === 'Vitória' ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300' :
                                                                                        h.result === 'Derrota' ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300' :
                                                                                            'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                                                                        }`}>{h.result.charAt(0)}</span>
                                                                                )}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* Status dos Palpites dos Participantes */}
                                                                <div className="bg-white dark:bg-gray-700/60 rounded-xl p-3.5 border border-gray-100 dark:border-gray-600 shadow-sm space-y-3 mt-4">
                                                                    <div className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500 flex items-center gap-1.5 border-b border-gray-100 dark:border-gray-650 pb-2">
                                                                        <Users size={12} /> Status dos Palpites ({league.participants.length})
                                                                    </div>

                                                                    {/* Search Input */}
                                                                    <div className="relative mt-2">
                                                                        <Search className="absolute left-3 top-2.5 text-gray-400" size={14} />
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Buscar participante..."
                                                                            value={statsSearch}
                                                                            onChange={(e) => {
                                                                                setStatsSearch(e.target.value);
                                                                                setStatsPageSaved(1);
                                                                                setStatsPagePending(1);
                                                                            }}
                                                                            className="w-full pl-9 pr-8 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-955 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                                                        />
                                                                        {statsSearch && (
                                                                            <button
                                                                                onClick={() => {
                                                                                    setStatsSearch('');
                                                                                    setStatsPageSaved(1);
                                                                                    setStatsPagePending(1);
                                                                                }}
                                                                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-white cursor-pointer"
                                                                            >
                                                                                <X size={14} />
                                                                            </button>
                                                                        )}
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        {/* Palpitados */}
                                                                        {filteredPredicted.length > 0 && (
                                                                            <div className="space-y-1.5">
                                                                                <div className="flex justify-between items-center text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <CheckCircle2 size={10} /> Palpite Salvo ({filteredPredicted.length})
                                                                                    </span>
                                                                                    {totalSavedPages > 1 && (
                                                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold normal-case">
                                                                                            Pág. {safeSavedPage} de {totalSavedPages}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {pagedPredicted.map(u => (
                                                                                        <div key={u.id} className="flex items-center gap-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 p-1.5 rounded-lg overflow-hidden">
                                                                                            <OptimizedImage src={u.avatar} containerClassName="w-6 h-6 shrink-0 rounded-full border border-emerald-200 dark:border-emerald-800" className="w-full h-full object-cover" alt="" />
                                                                                            <div className="flex flex-col min-w-0 flex-1">
                                                                                                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate w-full leading-tight">{u.name}</span>
                                                                                                {(u as any).savedAt && (
                                                                                                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 leading-tight">
                                                                                                        {new Date((u as any).savedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })} {new Date((u as any).savedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                                                                    </span>
                                                                                                )}
                                                                                                {isLockedStats && u.pred ? (
                                                                                                    <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 flex items-center gap-1.5 mt-0.5">
                                                                                                        <span className="bg-white/60 dark:bg-black/30 px-1.5 rounded">{u.pred.homeScore}</span>
                                                                                                        <span className="text-gray-400 text-[8px]">x</span>
                                                                                                        <span className="bg-white/60 dark:bg-black/30 px-1.5 rounded">{u.pred.awayScore}</span>
                                                                                                    </span>
                                                                                                ) : null}
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {totalSavedPages > 1 && (
                                                                                    <div className="flex items-center justify-end gap-2 pt-1">
                                                                                        <button
                                                                                            onClick={() => setStatsPageSaved(prev => Math.max(1, prev - 1))}
                                                                                            disabled={safeSavedPage <= 1}
                                                                                            className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-300"
                                                                                        >
                                                                                            <ChevronLeft size={12} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => setStatsPageSaved(prev => Math.min(totalSavedPages, prev + 1))}
                                                                                            disabled={safeSavedPage >= totalSavedPages}
                                                                                            className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-300"
                                                                                        >
                                                                                            <ChevronRight size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {/* Pendentes */}
                                                                        {filteredMissing.length > 0 && (
                                                                            <div className="space-y-1.5 mt-2">
                                                                                <div className="flex justify-between items-center text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 tracking-wider">
                                                                                    <span className="flex items-center gap-1">
                                                                                        <Clock size={10} /> Pendente ({filteredMissing.length})
                                                                                    </span>
                                                                                    {totalPendingPages > 1 && (
                                                                                        <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold normal-case">
                                                                                            Pág. {safePendingPage} de {totalPendingPages}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                    {pagedMissing.map(u => (
                                                                                        <div key={u.id} className="flex items-center gap-2 bg-yellow-50/50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 p-1.5 rounded-lg">
                                                                                            <OptimizedImage src={u.avatar} containerClassName="w-6 h-6 rounded-full border border-yellow-300 dark:border-yellow-700" className="w-full h-full object-cover" alt="" />
                                                                                            <span className="text-xs font-medium text-yellow-800 dark:text-yellow-300 truncate w-full">{u.name}</span>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                {totalPendingPages > 1 && (
                                                                                    <div className="flex items-center justify-end gap-2 pt-1">
                                                                                        <button
                                                                                            onClick={() => setStatsPagePending(prev => Math.max(1, prev - 1))}
                                                                                            disabled={safePendingPage <= 1}
                                                                                            className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-300"
                                                                                        >
                                                                                            <ChevronLeft size={12} />
                                                                                        </button>
                                                                                        <button
                                                                                            onClick={() => setStatsPagePending(prev => Math.min(totalPendingPages, prev + 1))}
                                                                                            disabled={safePendingPage >= totalPendingPages}
                                                                                            className="p-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-gray-600 dark:text-gray-300"
                                                                                        >
                                                                                            <ChevronRight size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}

                                                                        {filteredPredicted.length === 0 && filteredMissing.length === 0 && (
                                                                            <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-xs italic">
                                                                                Nenhum participante encontrado.
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </>
                                                    )}
                                                </>
                                            )}
                                            </div>
                                            )}
                                            {activeStatsTab === 'escalacao' && <TabEscalacao data={matchLazyDetails} isLoading={isLoadingLazyDetails} getTeamName={getTeamNameForDisplay} getTeamFlag={(id) => getTeamFlag(String(id), teams)} />}
                                            {activeStatsTab === 'lances' && <TabLances data={matchLazyDetails} isLoading={isLoadingLazyDetails} getTeamName={getTeamNameForDisplay} getTeamFlag={(id) => getTeamFlag(String(id), teams)} />}
                                            {activeStatsTab === 'scouts' && <TabScouts data={matchLazyDetails} isLoading={isLoadingLazyDetails} getTeamName={getTeamNameForDisplay} getTeamFlag={(id) => getTeamFlag(String(id), teams)} />}
                                        </div>
                                    </div>
                                </div>, document.body
                            );
                        })()}

                    </div>
                )}
            </div>
        );
    };

    const renderClassificacaoTab = () => {
        const LEADERBOARD_PAGE_SIZE = 200;
        const groupsList = Object.keys(GROUPS_CONFIG);
        const hasHistoryFilters = histCompetition !== 'all' || histSubPeriod !== 'all';
        const clearHistoryFilters = () => { setHistCompetition('all'); setHistSubPeriod('all'); };

        const filteredLeaderboard = leaderboard.filter(entry => entry.user.name.toLowerCase().includes(leaderboardSearch.toLowerCase()));
        const totalLbPages = Math.max(1, Math.ceil(filteredLeaderboard.length / LEADERBOARD_PAGE_SIZE));
        const safeLbPage = Math.min(leaderboardPage, totalLbPages);
        const pagedLeaderboard = filteredLeaderboard.slice((safeLbPage - 1) * LEADERBOARD_PAGE_SIZE, safeLbPage * LEADERBOARD_PAGE_SIZE);
        const goLbPage = (p: number) => setLeaderboardPage(Math.max(1, Math.min(p, totalLbPages)));

        const LeaderboardPagination = () => totalLbPages <= 1 ? null : (
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-600">
                <div className="text-sm md:text-base text-gray-600 dark:text-gray-300 font-medium">
                    <span className="font-bold text-gray-800 dark:text-white">{filteredLeaderboard.length}</span> participantes · pág. <span className="font-bold text-gray-800 dark:text-white">{safeLbPage}</span> de <span className="font-bold text-gray-800 dark:text-white">{totalLbPages}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => goLbPage(safeLbPage - 1)} disabled={safeLbPage <= 1} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                    {Array.from({ length: Math.min(5, totalLbPages) }, (_, i) => {
                        let pg: number;
                        if (totalLbPages <= 5) pg = i + 1;
                        else if (safeLbPage <= 3) pg = i + 1;
                        else if (safeLbPage >= totalLbPages - 2) pg = totalLbPages - 4 + i;
                        else pg = safeLbPage - 2 + i;
                        return <button key={pg} onClick={() => goLbPage(pg)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors border ${pg === safeLbPage ? 'bg-brasil-blue text-white border-brasil-blue' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{pg}</button>;
                    })}
                    <button onClick={() => goLbPage(safeLbPage + 1)} disabled={safeLbPage >= totalLbPages} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                </div>
            </div>
        );
        const getHistory = (userId: string) => {
            const lockedMatches = matches.filter(m => isPredictionLocked(m.date, currentTime)).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return lockedMatches.map(m => {
                const pred = userHistoryPredictions.find(p => p.matchId === m.id);
                return { match: m, pred };
            });
        };
        const selectedUser = selectedUserId ? mergedUsers.find(u => u.id == selectedUserId) : null;
        const fullHistory = selectedUserId ? getHistory(selectedUserId) : [];
        const filteredHistory = fullHistory.filter(item => {
            const m = item.match as any;
            const isCopaDoBrasil = m.championship === 'copa_do_brasil';
            const isLibertadores = m.championship === 'libertadores';
            const isSulAmericana = m.championship === 'sul_americana';
            const isBrasileirao = m.championship === 'brasileirao';

            const activeCompFilter = allowedCompetitions.length === 1
                ? (allowedCompetitions.includes('brasileirao') ? 'brasileirao' : allowedCompetitions.includes('libertadores') ? 'libertadores' : allowedCompetitions.includes('sul_americana') ? 'sul_americana' : 'copa')
                : histCompetition;

            if (activeCompFilter === 'brasileirao' && (isCopaDoBrasil || isLibertadores || isSulAmericana)) return false;
            if (activeCompFilter === 'copa' && (isBrasileirao || isLibertadores || isSulAmericana)) return false;
            if (activeCompFilter === 'libertadores' && (isBrasileirao || isCopaDoBrasil || isSulAmericana)) return false;
            if (activeCompFilter === 'sul_americana' && (isBrasileirao || isCopaDoBrasil || isLibertadores)) return false;

            if (histSubPeriod !== 'all') {
                if (histSubPeriod.startsWith('mes_')) {
                    const month = parseInt(histSubPeriod.split('_')[1], 10);
                    const matchMonth = new Date(m.date).getMonth() + 1;
                    if (matchMonth !== month) return false;
                } else if (isCopaDoBrasil) {
                    const p = m.phase?.toLowerCase() || '';
                    if (histSubPeriod === 'copa_oitavas' && !(p.includes('oitavas') || p.includes('round of 16'))) return false;
                    if (histSubPeriod === 'copa_quartas' && !(p.includes('quartas') || p.includes('quarter'))) return false;
                    if (histSubPeriod === 'copa_fase_final' && !(p.includes('semi') || (p.includes('final') && !p.includes('semi')))) return false;
                } else if (isLibertadores) {
                    const p = m.phase?.toLowerCase() || '';
                    if (histSubPeriod === 'libertadores_oitavas' && !(p.includes('oitavas') || p.includes('round of 16'))) return false;
                    if (histSubPeriod === 'libertadores_quartas' && !(p.includes('quartas') || p.includes('quarter'))) return false;
                    if (histSubPeriod === 'libertadores_fase_final' && !(p.includes('semi') || (p.includes('final') && !p.includes('semi')))) return false;
                } else if (isSulAmericana) {
                    const p = m.phase?.toLowerCase() || '';
                    if (histSubPeriod === 'sul_americana_oitavas' && !(p.includes('oitavas') || p.includes('round of 16'))) return false;
                    if (histSubPeriod === 'sul_americana_quartas' && !(p.includes('quartas') || p.includes('quarter'))) return false;
                    if (histSubPeriod === 'sul_americana_fase_final' && !(p.includes('semi') || (p.includes('final') && !p.includes('semi')))) return false;
                } else if (isBrasileirao) {
                    const round = getMatchRound(m);
                    if (round?.toString() !== histSubPeriod) return false;
                }
            }
            return true;
        });

        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm min-h-[500px] relative overflow-hidden">
                <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-3 text-xs md:text-sm font-medium border-b border-blue-100 dark:border-blue-800 flex items-center justify-center gap-2 text-center">
                    <MousePointerClick size={16} /><span>Clique no participante para ver o histórico detalhado.</span>
                </div>
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 space-y-3">
                    <button onClick={handleShareLeaderboard} disabled={isSharingImage} className="flex w-full items-center justify-center gap-2 bg-gradient-to-r from-brasil-blue to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-3 rounded-lg font-bold shadow-sm transition-all disabled:opacity-50 whitespace-nowrap">
                        {isSharingImage ? <Loader2 size={20} className="animate-spin" /> : <Share2 size={20} />}
                        <span className="text-sm">Compartilhar Classificação</span>
                    </button>

                    {/* FILTRO PRIMÁRIO: Competição */}
                    {allowedCompetitions.length > 1 && (() => {
                        const opts = [
                            { key: 'total', label: '🏆 Total', show: true },
                            { key: 'brasileirao', label: 'Brasileirão', show: allowedCompetitions.includes('brasileirao') },
                            { key: 'copa', label: 'Copa', show: allowedCompetitions.includes('copa_do_brasil') },
                            { key: 'libertadores', label: 'Liberta', show: allowedCompetitions.includes('libertadores') },
                            { key: 'sul_americana', label: 'Sula', show: allowedCompetitions.includes('sul_americana') }
                        ].filter(opt => opt.show);
                        const colsClass = opts.length === 5 ? 'grid-cols-5' : opts.length === 4 ? 'grid-cols-4' : opts.length === 3 ? 'grid-cols-3' : 'grid-cols-2';
                        return (
                            <div className="space-y-1.5">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Competição:</span>
                                <div className={`grid ${colsClass} gap-1.5`}>
                                    {opts.map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => { setCompetitionFilter(opt.key as any); setSubPeriod('all'); }}
                                            className={`w-full px-1 py-2 rounded-lg text-xs font-bold transition-all border whitespace-nowrap text-center ${competitionFilter === opt.key
                                                ? opt.key === 'brasileirao' ? 'bg-green-600 text-white border-green-600 shadow-md'
                                                    : opt.key === 'copa' ? 'bg-yellow-500 text-yellow-900 border-yellow-500 shadow-md'
                                                        : opt.key === 'sul_americana' ? 'bg-pink-500 text-white border-pink-500 shadow-md' : opt.key === 'libertadores' ? 'bg-sky-600 text-white border-sky-600 shadow-md'
                                                            : 'bg-brasil-blue text-white border-brasil-blue shadow-md'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                                }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}

                    {/* FILTRO SECUNDÁRIO: Mês (Geral), Rodada (Brasileirão) ou Fase (Copa do Brasil) */}
                    {competitionFilter === 'total' && allowedCompetitions.length > 1 && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Mês:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-800 dark:border-blue-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-400 block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Geral</option>
                                    <option value="mes_07" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Julho</option>
                                    <option value="mes_08" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Agosto</option>
                                    <option value="mes_09" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Setembro</option>
                                    <option value="mes_10" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Outubro</option>
                                    <option value="mes_11" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Novembro</option>
                                    <option value="mes_12" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Dezembro</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {competitionFilter === 'brasileirao' && allowedCompetitions.includes('brasileirao') && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-green-700 dark:text-green-400 whitespace-nowrap">Rodada:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-green-700 dark:bg-green-900 text-white border border-green-800 dark:border-green-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-green-400 block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total do Brasileirão</option>
                                    {Array.from({ length: 19 }, (_, i) => i + 20).map(round => (
                                        <option key={round} value={String(round)} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">{round}ª Rodada</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-green-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {competitionFilter === 'libertadores' && allowedCompetitions.includes('libertadores') && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-sky-700 dark:text-sky-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-sky-600 dark:bg-sky-800 text-white border border-sky-700 dark:border-sky-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-sky-400 block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Libertadores</option>
                                    <option value="libertadores_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="libertadores_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="libertadores_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-sky-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {competitionFilter === 'copa' && allowedCompetitions.includes('copa_do_brasil') && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-yellow-700 dark:text-yellow-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-yellow-600 dark:bg-yellow-800 text-white border border-yellow-700 dark:border-yellow-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-yellow-400 block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Copa do Brasil</option>
                                    <option value="copa_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="copa_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="copa_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-yellow-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {competitionFilter === 'sul_americana' && allowedCompetitions.includes('sul_americana') && (
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-pink-500 dark:text-pink-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-pink-500 dark:bg-pink-500 text-white border border-pink-500 dark:border-pink-500 text-sm font-bold rounded-lg focus:ring-2 focus:ring-pink-400 block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Sul-Americana</option>
                                    <option value="sul_americana_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="sul_americana_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="sul_americana_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-pink-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {/* Quando só tem uma competição (liga mono-competição), mostrar o selector simples original */}
                    {allowedCompetitions.length === 1 && allowedCompetitions.includes('brasileirao') && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Rodada:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900">Pontuação Total</option>
                                    {Array.from({ length: 19 }, (_, i) => i + 20).map(round => (
                                        <option key={round} value={String(round)} className="bg-white dark:bg-gray-800 text-gray-900">{round}ª Rodada</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {allowedCompetitions.length === 1 && allowedCompetitions.includes('libertadores') && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Libertadores</option>
                                    <option value="libertadores_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="libertadores_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="libertadores_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {allowedCompetitions.length === 1 && allowedCompetitions.includes('copa_do_brasil') && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Copa do Brasil</option>
                                    <option value="copa_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="copa_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="copa_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    {allowedCompetitions.length === 1 && allowedCompetitions.includes('sul_americana') && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap">Fase:</span>
                            <div className="relative flex-1">
                                <select
                                    value={subPeriod}
                                    onChange={(e) => setSubPeriod(e.target.value)}
                                    className="w-full appearance-none bg-brasil-blue dark:bg-blue-900 text-white border border-blue-900 dark:border-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-brasil-yellow block p-2.5 pr-8 shadow-md cursor-pointer"
                                >
                                    <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Total da Sul-Americana</option>
                                    <option value="sul_americana_oitavas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Oitavas de Final</option>
                                    <option value="sul_americana_quartas" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Quartas de Final</option>
                                    <option value="sul_americana_fase_final" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fase Final (Semi+Final)</option>
                                </select>
                                <ChevronDown size={14} className="absolute right-3 top-3.5 text-blue-200 pointer-events-none" />
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col-reverse gap-3 w-full">
                        <div className="relative flex-1 w-full"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="Buscar participante..." value={leaderboardSearch} onChange={(e) => setLeaderboardSearch(e.target.value)} className="w-full pl-10 pr-8 py-2 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg text-sm focus:ring-1 focus:ring-brasil-blue focus:border-brasil-blue outline-none" />{leaderboardSearch && (<button onClick={() => setLeaderboardSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white cursor-pointer"><X size={14} /></button>)}</div>
                        {roundParticipants?.[leaderboardView]?.length > 0 && (
                            <button 
                                onClick={() => setShowOnlyRoundParticipants(!showOnlyRoundParticipants)}
                                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${showOnlyRoundParticipants ? 'bg-brasil-blue text-white border-brasil-blue' : 'bg-yellow-200 hover:bg-yellow-300 text-black border-yellow-200 dark:border-yellow-300'}`}
                            >
                                <Users size={16} />
                                {showOnlyRoundParticipants ? 'Ver Todos' : 'Ranking Tiro Curto'}
                            </button>
                        )}
                    </div>
                </div>
                {String(loadingPeriod) == String(leaderboardView) ? (
                    <div className="flex flex-col items-center justify-center py-20 text-brasil-blue dark:text-blue-400">
                        <Loader2 size={32} className="animate-spin mb-4" />
                        <p className="font-medium text-sm text-gray-500">Buscando classificação...</p>
                    </div>
                ) : (
                    <>
                        <div className="w-full overflow-x-auto">
                            <table className="w-full text-sm md:text-base">
                                <thead className="bg-brasil-blue dark:bg-blue-900 text-white"><tr><th className="px-2 py-3 text-center w-12 md:w-16 text-xs md:text-sm">Pos.</th><th className="px-2 py-3 text-left">Participantes</th><th className="hidden md:table-cell px-2 py-3 text-center w-20"><span className="flex items-center justify-center gap-1 text-xs uppercase bg-white/20 px-2 py-1 rounded font-bold whitespace-nowrap">Pontos</span></th><th className="hidden md:table-cell px-2 py-3 text-center w-20"><span className="flex items-center justify-center gap-1 text-xs uppercase bg-white/20 px-2 py-1 rounded whitespace-nowrap"><Target size={14} /> Cravadas</span></th><th className="hidden md:table-cell px-2 py-3 text-center w-16"><span className="flex items-center justify-center gap-1 text-xs uppercase bg-white/20 px-1.5 py-1 rounded whitespace-nowrap">V+S</span></th><th className="hidden md:table-cell px-2 py-3 text-center w-16"><span className="flex items-center justify-center gap-1 text-xs uppercase bg-white/20 px-1.5 py-1 rounded whitespace-nowrap">V+G</span></th><th className="hidden md:table-cell px-2 py-3 text-center w-16"><span className="flex items-center justify-center gap-1 text-xs uppercase bg-white/20 px-1.5 py-1 rounded whitespace-nowrap">Emp</span></th><th className="md:hidden px-2 py-3 text-center w-20 whitespace-nowrap">Pontos</th>{isAdmin && <th className="px-0 py-3 w-8"></th>}</tr></thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredLeaderboard.length === 0 ? <tr><td colSpan={7} className="text-center py-8 text-gray-400 italic">Nenhum participante encontrado.</td></tr> : pagedLeaderboard.map((entry, idx) => {
                                        const rank = leaderboard.findIndex(item => item.user.id === entry.user.id) + 1; return (<tr key={entry.user.id} className={entry.user.id === currentUser.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}><td className="px-2 py-3 font-bold text-center text-sm align-middle">{rank === 1 ? <div className="w-6 h-6 mx-auto bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center shadow-sm font-black text-xs">1</div> : rank === 2 ? <div className="w-6 h-6 mx-auto bg-gray-300 text-gray-800 rounded-full flex items-center justify-center shadow-sm font-black text-xs">2</div> : rank === 3 ? <div className="w-6 h-6 mx-auto bg-orange-400 text-orange-900 rounded-full flex items-center justify-center shadow-sm font-black text-xs">3</div> : <span className="text-gray-500 dark:text-gray-400">{rank}</span>}</td><td className="px-2 py-3 relative w-full max-w-[130px] sm:max-w-[200px] md:max-w-none"><div className="flex items-center gap-2 md:gap-3 cursor-pointer group" onClick={() => setSelectedUserId(entry.user.id)}>
                                            <div onClick={(e) => { e.stopPropagation(); setZoomedImage(entry.user.avatar as any); }}>
                                                <OptimizedImage
                                                    src={entry.user.avatar}
                                                    containerClassName="w-10 h-10 md:w-12 md:h-12 rounded-full cursor-pointer hover:ring-2 hover:ring-brasil-blue transition-all"
                                                    className="w-full h-full object-cover"
                                                    alt=""
                                                />
                                            </div>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="font-medium decoration-dotted decoration-gray-400 dark:decoration-gray-500 underline-offset-4 group-hover:text-brasil-blue dark:group-hover:text-blue-400 group-hover:underline text-base md:text-lg text-gray-900 dark:text-white truncate">
                                                        {entry.user.name}
                                                    </span>
                                                    {entry.user.isPro && <span className="inline-flex items-center text-[6px] md:text-[7px] font-black bg-gradient-to-r from-yellow-100 to-yellow-200 text-gray-900 border border-yellow-300 px-0.5 py-[1px] rounded uppercase tracking-tighter shadow-sm shrink-0 leading-none" title="PRO">⭐PRO</span>}
                                                    {entry.user.id === currentUser.id && <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 shrink-0">(Você)</span>}
                                                </div>

                                            </div><Eye size={16} className="text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity ml-auto hidden md:block" /></div></td><td className="hidden md:table-cell px-2 py-3 text-center font-black text-gray-800 dark:text-gray-200 text-base md:text-lg whitespace-nowrap">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span>{entry.totalPoints}</span>
                                                    {entry.tfTotal > 0 && (
                                                        <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1 rounded flex items-center gap-0.5 mt-0.5" title={`${entry.tfTotal} pts de Finalistas`}>
                                                            <Trophy size={8} className="text-yellow-600" /> +{entry.tfTotal}
                                                        </span>
                                                    )}
                                                </div>
                                            </td><td className="hidden md:table-cell px-2 py-3 text-center"><span className="bg-blue-50 dark:bg-blue-900/30 text-brasil-blue dark:text-blue-300 font-bold px-2 py-1 rounded text-sm">{entry.exactScores}</span></td><td className="hidden md:table-cell px-2 py-3 text-center"><span className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-bold px-2 py-1 rounded text-sm">{entry.winnerAndDiffCount}</span></td><td className="hidden md:table-cell px-2 py-3 text-center"><span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 font-bold px-2 py-1 rounded text-sm">{entry.winnerAndWinnerGoalsCount}</span></td><td className="hidden md:table-cell px-2 py-3 text-center"><span className="bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-bold px-2 py-1 rounded text-sm">{entry.drawCount}</span></td><td className="md:hidden px-2 py-3 text-center font-bold text-brasil-green dark:text-green-400 text-base md:text-lg whitespace-nowrap">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span>{entry.totalPoints}</span>
                                                    {entry.tfTotal > 0 && (
                                                        <span className="text-[8px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-0.5 rounded flex items-center gap-0.5 mt-0.5">
                                                            <Trophy size={6} className="text-yellow-600" /> +{entry.tfTotal}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>{isAdmin && <td className="px-0 py-3 text-center w-8">{entry.user.id !== currentUser.id && (<button type="button" onClick={(e) => initiateRemoveUser(e, entry.user.id, entry.user.name)} className="text-red-300 hover:text-red-500 dark:hover:text-red-400 p-1 rounded transition-colors z-10 relative"><Trash2 size={16} /></button>)}</td>}</tr>);
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <LeaderboardPagination />
                    </>
                )}
                {selectedUserId && selectedUser && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedUserId(null)}>
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-brasil-blue dark:bg-blue-900 text-white p-4 flex justify-between items-center shrink-0"><div className="flex items-center gap-3"><div onClick={(e) => { e.stopPropagation(); setZoomedImage(selectedUser.avatar as any); }} className="cursor-pointer hover:ring-2 hover:ring-white/50 rounded-full transition-all"><OptimizedImage src={selectedUser.avatar} containerClassName="w-10 h-10 rounded-full border-2 border-white/30" className="w-full h-full object-cover" alt="" /></div><div><h3 className="font-bold text-lg leading-tight flex items-center gap-1.5">{selectedUser.name} {selectedUser.isPro && <span className="inline-flex items-center text-[10px] font-black bg-gradient-to-r from-yellow-200 to-amber-300 text-gray-900 border border-yellow-400 px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm shrink-0 leading-none">⭐ PRO</span>}</h3><p className="text-xs text-blue-200">Histórico de Palpites</p></div></div><button onClick={() => setSelectedUserId(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button></div>
                            {(() => {
                                const selEntry = leaderboard.find(e => e.user.id == selectedUserId);
                                if (!selEntry) return null;
                                return (
                                    <div className="flex flex-nowrap items-center justify-between px-4 py-3 bg-blue-50 dark:bg-blue-900/40 border-b border-blue-100 dark:border-blue-800/50 overflow-x-auto gap-2">
                                        <span className="flex items-center gap-1.5 text-base font-bold text-brasil-blue dark:text-blue-400 whitespace-nowrap" title="Cravadas"><Target size={16} /> {selEntry.exactScores} Cravadas</span>
                                        <span className="flex items-center gap-1.5 text-base font-bold text-green-700 dark:text-green-400 whitespace-nowrap" title="Vencedor + Saldo">{selEntry.winnerAndDiffCount} V+S</span>
                                        <span className="flex items-center gap-1.5 text-base font-bold text-yellow-700 dark:text-yellow-400 whitespace-nowrap" title="Vencedor + Gols">{selEntry.winnerAndWinnerGoalsCount} V+G</span>
                                        <span className="flex items-center gap-1.5 text-base font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap" title="Empate">{selEntry.drawCount} Emp</span>
                                    </div>
                                );
                            })()}
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-200 dark:border-gray-600 flex flex-col gap-2 shrink-0">
                                <div className="flex justify-between items-center px-1"><div className="flex items-center gap-2"><span className="text-xs font-bold text-gray-500 dark:text-gray-300 uppercase flex items-center gap-1"><Filter size={12} /> Filtrar Jogos</span>{hasHistoryFilters && (<button onClick={clearHistoryFilters} className="text-[10px] font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors flex items-center gap-1 bg-white dark:bg-gray-600 border border-red-200 dark:border-red-800 px-2 py-0.5 rounded shadow-sm"><X size={10} /> Limpar</button>)}</div><span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-bold">{filteredHistory.length} resultados</span></div>
                                <div className="flex flex-wrap gap-2 pb-1">
                                    {allowedCompetitions.length > 1 && (
                                        <div className={`relative ${histCompetition !== 'all' ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                            <select value={histCompetition} onChange={(e) => { setHistCompetition(e.target.value as any); setHistSubPeriod('all'); }} className={`w-full ${histCompetition === 'all' ? 'md:min-w-[160px]' : ''} text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue appearance-none pr-8`}>
                                                <option value="all">Todas Competições</option>
                                                {allowedCompetitions.includes('brasileirao') && <option value="brasileirao">Brasileirão</option>}
                                                {allowedCompetitions.includes('copa_do_brasil') && <option value="copa">Copa do Brasil</option>}
                                                {allowedCompetitions.includes('libertadores') && <option value="libertadores">Libertadores</option>}
                                                {allowedCompetitions.includes('sul_americana') && <option value="sul_americana">Sul-Americana</option>}
                                            </select>
                                            <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-300 pointer-events-none" />
                                        </div>
                                    )}

                                    {(() => {
                                        const activeComp = allowedCompetitions.length === 1
                                            ? (allowedCompetitions.includes('brasileirao') ? 'brasileirao' : allowedCompetitions.includes('libertadores') ? 'libertadores' : allowedCompetitions.includes('sul_americana') ? 'sul_americana' : 'copa')
                                            : histCompetition;

                                        if (activeComp === 'brasileirao') {
                                            return (
                                                <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                                    <select value={histSubPeriod} onChange={(e) => setHistSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue appearance-none pr-8`}>
                                                        <option value="all">Todas as Rodadas</option>
                                                        {Array.from({ length: 19 }, (_, i) => i + 20).map(r => (
                                                            <option key={r} value={r.toString()}>{r}ª Rodada</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-300 pointer-events-none" />
                                                </div>
                                            );
                                        }

                                        if (activeComp === 'copa') {
                                            return (
                                                <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                                    <select value={histSubPeriod} onChange={(e) => setHistSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue appearance-none pr-8`}>
                                                        <option value="all">Todas as Fases</option>
                                                        <option value="copa_oitavas">Oitavas de Final</option>
                                                        <option value="copa_quartas">Quartas de Final</option>
                                                        <option value="copa_fase_final">Fase Final (Semi+Final)</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-300 pointer-events-none" />
                                                </div>
                                            );
                                        }
                                        if (activeComp === 'libertadores') {
                                            return (
                                                <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                                    <select value={histSubPeriod} onChange={(e) => setHistSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue appearance-none pr-8`}>
                                                        <option value="all">Todas as Fases</option>
                                                        <option value="libertadores_oitavas">Oitavas de Final</option>
                                                        <option value="libertadores_quartas">Quartas de Final</option>
                                                        <option value="libertadores_fase_final">Fase Final (Semi+Final)</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-300 pointer-events-none" />
                                                </div>
                                            );
                                        }
                                        if (activeComp === 'sul_americana') {
                                            return (
                                                <div className={`relative ${allowedCompetitions.length > 1 ? 'flex-1 md:flex-none md:w-auto min-w-[130px]' : 'w-full md:w-auto'}`}>
                                                    <select value={histSubPeriod} onChange={(e) => setHistSubPeriod(e.target.value)} className={`w-full ${allowedCompetitions.length === 1 ? 'md:min-w-[160px]' : ''} text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue appearance-none pr-8`}>
                                                        <option value="all">Todas as Fases</option>
                                                        <option value="sul_americana_oitavas">Oitavas de Final</option>
                                                        <option value="sul_americana_quartas">Quartas de Final</option>
                                                        <option value="sul_americana_fase_final">Fase Final (Semi+Final)</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-300 pointer-events-none" />
                                                </div>
                                            );
                                        }

                                        if (activeComp === 'all' && allowedCompetitions.length > 1) {
                                            return (
                                                <div className="relative flex-1 md:flex-none md:w-auto min-w-[130px]">
                                                    <select value={histSubPeriod} onChange={(e) => setHistSubPeriod(e.target.value)} className="w-full text-xs border border-gray-600 bg-gray-700 text-white rounded-lg p-2 outline-none focus:border-brasil-blue focus:ring-1 focus:ring-brasil-blue appearance-none pr-8">
                                                        <option value="all">Todo o Período</option>
                                                        <option value="mes_07">Julho</option>
                                                        <option value="mes_08">Agosto</option>
                                                        <option value="mes_09">Setembro</option>
                                                        <option value="mes_10">Outubro</option>
                                                        <option value="mes_11">Novembro</option>
                                                        <option value="mes_12">Dezembro</option>
                                                    </select>
                                                    <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-300 pointer-events-none" />
                                                </div>
                                            );
                                        }

                                        return null;
                                    })()}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50 dark:bg-gray-800/50">
                                {league.settings?.topFinishersEnabled && isTopFinishersLocked && (() => {
                                    const tfPred = topFinisherPredictions.find(p => p.userId == selectedUserId && p.leagueId == league.id);
                                    const tfPts = league.settings.topFinishersPoints ?? { champion: 20, runnerUp: 15, third: 10, fourth: 5 };
                                    let tfTotal = 0;
                                    if (topFinishersResult?.champion && tfPred?.champion === topFinishersResult.champion) tfTotal += tfPts.champion;
                                    if (topFinishersResult?.runnerUp && tfPred?.runnerUp === topFinishersResult.runnerUp) tfTotal += tfPts.runnerUp;
                                    if (topFinishersResult?.third && tfPred?.third === topFinishersResult.third) tfTotal += tfPts.third;
                                    if (topFinishersResult?.fourth && tfPred?.fourth === topFinishersResult.fourth) tfTotal += tfPts.fourth;

                                    if (!tfPred) return null;

                                    return (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700">
                                            <div className="flex justify-between items-center mb-3">
                                                <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                                                    <Trophy size={12} className="text-yellow-600" /><span>4 Primeiros Colocados</span>
                                                </div>
                                                <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-bold">PONTOS EXTRAS</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Acertos na Colocação Final:</span>
                                                    <div className="flex flex-wrap gap-1 mt-0.5">
                                                        {topFinishersResult?.champion && tfPred.champion === topFinishersResult.champion ? <span className="text-[9px] bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 px-1.5 py-0.5 rounded border border-yellow-200 dark:border-yellow-800/50 font-bold">CAMPEÃO (+{tfPts.champion})</span> : null}
                                                        {topFinishersResult?.runnerUp && tfPred.runnerUp === topFinishersResult.runnerUp ? <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold">VICE (+{tfPts.runnerUp})</span> : null}
                                                        {topFinishersResult?.third && tfPred.third === topFinishersResult.third ? <span className="text-[9px] bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800/50 font-bold">3º LUGAR (+{tfPts.third})</span> : null}
                                                        {topFinishersResult?.fourth && tfPred.fourth === topFinishersResult.fourth ? <span className="text-[9px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 font-bold">4º LUGAR (+{tfPts.fourth})</span> : null}
                                                        {tfTotal === 0 && <span className="text-[9px] text-gray-400 italic">Nenhum acerto nos 4 primeiros</span>}
                                                    </div>
                                                </div>
                                                <div className="text-2xl font-black text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-800 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700">+{tfTotal}</div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                {isLoadingHistory ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-brasil-blue dark:text-blue-400">
                                        <Loader2 size={32} className="animate-spin mb-4" />
                                        <p className="font-medium text-sm text-gray-500">Buscando palpites...</p>
                                    </div>
                                ) : filteredHistory.length === 0 ? <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-gray-500 gap-2"><Search size={32} className="opacity-20" /><p className="text-sm italic">Nenhum palpite encontrado.</p></div> : <><div className="divide-y divide-gray-100 dark:divide-gray-700">{filteredHistory.slice(0, histVisibleCount).map(({ match, pred }) => { const isLive = match.status === MatchStatus.IN_PROGRESS; const isFinished = match.status === MatchStatus.FINISHED; const matchDate = new Date(match.date); const isDateValid = !isNaN(matchDate.getTime()); let histPoints = 0; if (match.is_blocked) { histPoints = 0; } else if ((isLive || isFinished) && match.home_score !== null && match.away_score !== null && pred) { histPoints = calculatePoints(Number(pred.homeScore), Number(pred.awayScore), Number(match.home_score), Number(match.away_score), league.settings); } return (<div key={String(String(match.id))} className="p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-0"><div className="flex justify-between items-center mb-3 gap-2 flex-nowrap"><div className="flex items-center gap-1 min-[360px]:gap-1.5 sm:gap-2 text-[8px] min-[360px]:text-[9px] min-[380px]:text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 flex-nowrap whitespace-nowrap min-w-0 overflow-hidden"><Calendar size={10} className="shrink-0" /><span>{isDateValid ? matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'Data Inválida'}</span>{isDateValid && <span className="text-gray-300 dark:text-gray-600 shrink-0">|</span>}{isDateValid && <span>{matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>}<span> </span>{renderMatchBadge(match)}</div>{isLive && <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[8px] min-[360px]:text-[9px] min-[380px]:text-[10px] font-bold animate-pulse whitespace-nowrap shrink-0">{match.match_time || 'AO VIVO'}</span>}</div><div className="flex flex-col items-center mb-4"><div className="flex items-center gap-6 mb-2"><img referrerPolicy='no-referrer' src={getTeamFlag(String(String(match.home_team_id)), teams)} className="w-9 h-9 object-contain drop-shadow-sm" alt={String(String(match.home_team_id))} /><span className="text-gray-300 dark:text-gray-600 text-xs font-bold">X</span><img referrerPolicy='no-referrer' src={getTeamFlag(String(String(match.away_team_id)), teams)} className="w-9 h-9 object-contain drop-shadow-sm" alt={String(String(match.away_team_id))} /></div><div className="text-sm font-black text-gray-900 dark:text-white text-center uppercase tracking-tight">{getTeamNameForDisplay(match.home_team_id)} <span className="text-gray-400 dark:text-gray-500 font-normal mx-1">x</span> {getTeamNameForDisplay(match.away_team_id)}</div></div><div className="flex items-stretch rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden"><div className="flex-1 bg-gray-50 dark:bg-gray-700 p-2 flex flex-col items-center justify-center border-r border-gray-200 dark:border-gray-600"><span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-1">Placar Oficial</span><div className={`text-xl font-black ${isLive ? 'text-green-600 dark:text-green-400 animate-pulse' : 'text-gray-800 dark:text-white'}`}>{match.home_score ?? '-'} <span className="text-gray-300 dark:text-gray-600 text-sm">x</span> {match.away_score ?? '-'}</div></div><div className="flex-1 bg-white dark:bg-gray-800 p-2 flex flex-col items-center justify-center relative"><span className="text-[9px] uppercase font-bold text-brasil-blue dark:text-blue-400 mb-1">Palpite</span><div className="text-xl font-black text-gray-800 dark:text-white">{pred ? <>{pred.homeScore} <span className="text-gray-300 dark:text-gray-600 text-sm">x</span> {pred.awayScore}</> : <span className="text-gray-300 dark:text-gray-600">-</span>}</div>{(isFinished || isLive) && pred && (<div className={`absolute top-1 right-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${histPoints > 0 ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'}`}>{histPoints > 0 ? `+${histPoints}` : '0'} pts</div>)}</div></div></div>); })}</div>{filteredHistory.length > histVisibleCount && (<div className="p-4 border-t border-gray-100 dark:border-gray-700"><button onClick={() => setHistVisibleCount(prev => prev + 20)} className="w-full bg-brasil-blue hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-sm text-sm">Carregar mais jogos (Mostrando {histVisibleCount} de {filteredHistory.length})</button></div>)}</>}
                            </div>
                        </div>
                    </div>, document.body
                )}

                {/* Hidden Share Container */}
                <div style={{ position: 'absolute', top: 0, left: 0, opacity: 0, pointerEvents: 'none', zIndex: -50 }}>
                    <div ref={shareRef} className="w-[1080px] h-[1920px] bg-gradient-to-br from-brasil-blue to-blue-900 text-white p-12 flex flex-col relative overflow-hidden">
                        {isSharingImage && (
                            <>
                                <div className="absolute top-[-150px] right-[-150px] w-[600px] h-[600px] bg-brasil-yellow/20 rounded-full blur-3xl"></div>
                                <div className="absolute bottom-[-150px] left-[-150px] w-[600px] h-[600px] bg-green-500/20 rounded-full blur-3xl"></div>

                                <div className="text-center mb-10 relative z-10 flex flex-col items-center">
                                    <div className="bg-white/20 p-4 rounded-3xl border border-white/30 shadow-2xl mb-6">
                                        <Trophy size={80} className="text-brasil-yellow drop-shadow-lg" />
                                    </div>
                                    <h1 className="text-6xl font-black text-brasil-yellow mb-2 uppercase tracking-widest drop-shadow-md">Top 10</h1>
                                    <h2 className="text-4xl font-bold opacity-95 truncate max-w-[900px] drop-shadow-sm">{league.name}</h2>
                                    <div className="mt-6 inline-block bg-white/15 px-8 py-3 rounded-full border border-white/20 text-2xl font-black uppercase tracking-widest shadow-inner">
                                        {(() => {
                                            let compName = "Pontuação Total";
                                            if (competitionFilter === 'brasileirao') compName = "Brasileirão";
                                            if (competitionFilter === 'copa') compName = "Copa do Brasil";
                                            if (competitionFilter === 'libertadores') compName = "Libertadores";
                                            if (competitionFilter === 'sul_americana') compName = "Sul-Americana";

                                            if (subPeriod === 'all') return compName;

                                            if (competitionFilter === 'total') {
                                                const months: Record<string, string> = {
                                                    mes_07: "Julho", mes_08: "Agosto", mes_09: "Setembro", 
                                                    mes_10: "Outubro", mes_11: "Novembro", mes_12: "Dezembro"
                                                };
                                                return `${compName} - ${months[subPeriod] || subPeriod}`;
                                            }
                                            
                                            if (competitionFilter === 'brasileirao') {
                                                return `${compName} - ${subPeriod}ª Rodada`;
                                            }

                                            if (subPeriod.includes('oitavas')) return `${compName} - Oitavas`;
                                            if (subPeriod.includes('quartas')) return `${compName} - Quartas`;
                                            if (subPeriod.includes('fase_final')) return `${compName} - Fase Final`;

                                            return compName;
                                        })()}
                                    </div>
                                </div>

                                <div className="flex-1 flex flex-col gap-5 relative z-10 w-full max-w-[900px] mx-auto">
                                    {leaderboard.slice(0, 10).map((entry, index) => {
                                        const rank = index + 1;
                                        return (
                                            <div key={entry.user.id} className="flex items-center gap-6 bg-white/10 p-5 rounded-2xl border border-white/10 shadow-lg">
                                                <div className={`w-16 h-16 shrink-0 rounded-full flex items-center justify-center text-3xl font-black shadow-md ${rank === 1 ? 'bg-yellow-400 text-yellow-900 ring-4 ring-yellow-400/50' : rank === 2 ? 'bg-gray-300 text-gray-800 ring-4 ring-gray-300/50' : rank === 3 ? 'bg-orange-400 text-orange-900 ring-4 ring-orange-400/50' : 'bg-white/20 text-white border border-white/30'}`}>
                                                    {rank}
                                                </div>
                                                <div className="w-20 h-20 rounded-full border-4 border-white/30 overflow-hidden shrink-0 shadow-inner bg-gray-700 flex items-center justify-center text-white text-4xl font-bold uppercase">
                                                    {entry.user.avatar ? (
                                                        <img src={entry.user.avatar} crossOrigin="anonymous" alt={entry.user.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        entry.user.name.charAt(0)
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center">
                                                    <h3 className="text-3xl font-bold truncate text-white drop-shadow-sm">{entry.user.name}</h3>
                                                    {entry.user.isPro && <span className="inline-flex items-center text-xs font-black bg-gradient-to-r from-yellow-200 to-amber-300 text-gray-900 px-2 py-0.5 rounded uppercase mt-1 w-max">⭐ PRO</span>}
                                                </div>
                                                <div className="flex flex-col items-end justify-center shrink-0 pl-4 border-l border-white/10 text-right">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-5xl font-black text-brasil-yellow tabular-nums drop-shadow-md">{entry.totalPoints}</span>
                                                        <span className="text-sm opacity-80 uppercase font-bold tracking-widest">Pts</span>
                                                    </div>
                                                    <div className="text-sm font-bold text-blue-200 mt-1 flex items-center gap-1">
                                                        <Target size={12} className="text-blue-300" /> {entry.exactScores} Cravadas
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 text-center relative z-10 pb-4">
                                    <div className="inline-flex items-center justify-center gap-3 bg-black/30 px-8 py-4 rounded-full border border-white/10">
                                        <Globe size={24} className="text-brasil-yellow" />
                                        <span className="text-2xl font-black tracking-widest text-white/90">PALPITEIRO MESTRE</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderRegrasTab = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2"><Target size={24} className="text-brasil-blue dark:text-blue-400" /> Sistema de Pontuação</h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 ${league.settings?.topFinishersEnabled ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-4`}>
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-xl border border-blue-100 dark:border-blue-800 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-brasil-blue dark:text-blue-400 mb-2">{league.settings?.exactScore ?? 10}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Cravada</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o placar exato do jogo.<br /><span className="text-blue-600 dark:text-blue-300 font-medium">Ex: Palpitou 2x1 e foi 2x1.</span></p></div>
                        <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-100 dark:border-green-800 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-green-700 dark:text-green-400 mb-2">{league.settings?.winnerAndDiff ?? 7}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Vencedor + Saldo</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o vencedor e saldo de gols.<br /><span className="text-green-700 dark:text-green-300 font-medium">Ex: Palpitou 3x1 e foi 2x0.</span></p></div>
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-5 rounded-xl border border-yellow-100 dark:border-yellow-800 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-yellow-700 dark:text-yellow-400 mb-2">{league.settings?.winnerAndWinnerGoals ?? 6}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Vencedor + Gols</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o vencedor e gols dele.<br /><span className="text-yellow-600 dark:text-yellow-300 font-medium">Ex: Palpitou 2x1 e foi 2x0.</span></p></div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-xl border border-gray-200 dark:border-gray-600 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-gray-400 dark:text-gray-300 mb-2">{league.settings?.draw ?? 7}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Empate (Não Exato)</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou o empate, mas placar diferente.<br /><span className="text-gray-500 dark:text-gray-300 font-medium">Ex: Palpitou 1x1 e foi 2x2.</span></p></div>
                        <div className="bg-[#5c4033]/10 dark:bg-[#5c4033]/20 p-5 rounded-xl border border-[#5c4033]/20 flex flex-col items-center text-center hover:shadow-md transition-all"><div className="text-3xl font-black text-[#5c4033] dark:text-[#a67b5b] mb-2">{league.settings?.winner ?? 5}</div><div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">Apenas Vencedor</div><p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertou quem ganhou, mas errou o resto.<br /><span className="text-[#5c4033] dark:text-[#a67b5b] font-medium">Ex: Palpitou 2x1 e foi 4x0.</span></p></div>
                        {league.settings?.topFinishersEnabled && (
                            <div className="bg-slate-50 dark:bg-slate-900/20 p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center hover:shadow-md transition-all">
                                <div className="text-2xl font-black text-slate-700 dark:text-slate-300 mb-1 leading-tight">
                                    🥇{league.settings.topFinishersPoints?.champion ?? 20} 🥈{league.settings.topFinishersPoints?.runnerUp ?? 15}<br />
                                    🥉{league.settings.topFinishersPoints?.third ?? 10} 🏅{league.settings.topFinishersPoints?.fourth ?? 5}
                                </div>
                                <div className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide mb-2">4 Finalistas</div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">Acertos da posição final de cada seleção.<br /><span className="text-slate-600 dark:text-slate-400 font-medium">Pontos acumulados por posição.</span></p>
                            </div>
                        )}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2"><Crown size={20} className="text-yellow-600 dark:text-yellow-400" /> Critérios de Desempate</h4>
                    <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                        <li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-brasil-blue dark:bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">1º</span><span>Maior <strong>Pontuação Total</strong> acumulada.</span></li>
                        <li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">2º</span><span>Maior número de <strong>Cravadas</strong> (Acerto exato do placar).</span></li>
                        <li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">3º</span><span>Maior número de acertos em <strong>Vencedor + Saldo</strong>.</span></li>
                        <li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">4º</span><span>Maior número de acertos em <strong>Vencedor + Gols</strong>.</span></li>
                        <li className="flex items-start gap-3 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600"><span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold shrink-0">5º</span><span>Maior número de acertos em <strong>Empates (Não Exatos)</strong>.</span></li>
                    </ul>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 p-4 rounded-r-xl flex gap-3 text-sm text-orange-900 dark:text-orange-200 items-start shadow-sm"><AlertCircle className="shrink-0 mt-0.5 text-orange-600 dark:text-orange-400" size={20} /><div><span className="font-bold block mb-1 text-orange-800 dark:text-orange-300 text-base">Atenção aos Jogos de Mata-Mata</span><p className="leading-relaxed">Em caso de empate no tempo normal que leve à prorrogação, <strong>o placar final considerado será o resultado após os 120 minutos (Tempo Normal + Prorrogação)</strong>.<br /><span className="font-semibold text-red-600 dark:text-red-400">A disputa de pênaltis NÃO conta para o placar da liga.</span></p></div></div>
            </div>
        );
    };

    const renderAdminTab = () => {
        if (!isAdmin) return null;
        const pendingUsers = league.pendingRequests.map(uid => mergedUsers.find(u => u.id === uid)).filter(Boolean) as User[];
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
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800 dark:text-white">Solicitações Pendentes {pendingUsers.length > 0 && <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{pendingUsers.length}</span>}</h3>{pendingUsers.length === 0 ? (<p className="text-gray-400 italic">Nenhuma solicitação pendente.</p>) : (<div className="space-y-3">{pendingUsers.map(u => (<div key={u.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                        <OptimizedImage
                            src={u.avatar}
                            containerClassName="w-8 h-8 rounded-full"
                            className="w-full h-full object-cover"
                            alt={u.name}
                        />
                        <span>{u.name}</span>
                    </div><div className="flex gap-2"><button onClick={() => approveUser(league.id, u.id)} className="p-2 bg-green-100 text-green-700 rounded hover:bg-green-200"><Check size={18} /></button><button onClick={() => rejectUser(league.id, u.id)} className="p-2 bg-red-100 text-red-700 rounded hover:bg-red-200"><X size={18} /></button></div></div>))}</div>)}</div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"><h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2"><Mail size={20} className="text-brasil-blue dark:text-blue-400" /> Convidar Participantes</h3>{isFull ? (<div className="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 p-4 rounded-xl border border-yellow-200 dark:border-yellow-800 flex items-center gap-3"><AlertTriangle size={24} className="shrink-0" /><span className="text-sm"><strong>Limite Atingido:</strong> Esta liga já possui o número máximo de {limit} participantes do plano atual. Para convidar mais amigos, faça um upgrade.</span></div>) : (<><form onSubmit={handleSearchUser} className="flex gap-2 mb-4"><input type="email" required value={adminInviteEmail} onChange={(e) => setAdminInviteEmail(e.target.value)} placeholder="E-mail de cadastro do usuário" className="flex-1 border border-gray-600 bg-gray-700 text-white placeholder-gray-400 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brasil-blue outline-none disabled:opacity-50" disabled={searchStatus === 'found'} />{searchStatus !== 'found' ? (<button type="submit" disabled={searchStatus === 'searching'} className="bg-brasil-blue hover:bg-blue-900 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all disabled:opacity-50">{searchStatus === 'searching' ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}<span className="hidden sm:inline">Buscar</span></button>) : (<button type="button" onClick={handleClearSearch} className="bg-gray-200 hover:bg-gray-300 text-gray-600 font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-all"><X size={20} /></button>)}</form>{searchStatus === 'found' && foundUser && (<div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-3">
                        <OptimizedImage
                            src={foundUser.avatar}
                            alt={foundUser.name}
                            containerClassName="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                            className="w-full h-full object-cover"
                        />
                        <div><p className="font-bold text-gray-800 dark:text-white">{foundUser.name}</p><p className="text-xs text-gray-500 dark:text-gray-400">{foundUser.email}</p></div></div><button onClick={handleConfirmInvite} disabled={isSendingInvite} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70">{isSendingInvite ? <Loader2 className="animate-spin" size={18} /> : <UserPlus size={18} />} Confirmar Convite</button></div>)}{searchStatus === 'not_found' && (<div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-2"><AlertCircle size={20} /><span className="font-medium text-sm">Usuário não encontrado. Verifique se o e-mail está correto e se o usuário já possui cadastro na Liga.</span></div>)}</>)}</div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2"><Users size={20} className="text-brasil-blue dark:text-blue-400" /> Configurar Participantes Específicos (Tiro Curto)</h3>
                    <p className="text-sm text-gray-500 mb-4">Escolha os participantes que farão parte do ranking de tiro curto de uma determinada rodada ou fase.</p>
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <select value={adminSubpoolComp} onChange={(e) => { setAdminSubpoolComp(e.target.value); setAdminSubpoolPeriod(''); setAdminSubpoolUsers([]); }} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none flex-1">
                                <option value="brasileirao">Brasileirão</option>
                                {league.settings?.competitions?.includes('copa_do_brasil') && <option value="copa_do_brasil">Copa do Brasil</option>}
                                {league.settings?.competitions?.includes('libertadores') && <option value="libertadores">Libertadores</option>}
                                {league.settings?.competitions?.includes('sul_americana') && <option value="sul_americana">Sul-Americana</option>}
                            </select>
                            {adminSubpoolComp === 'brasileirao' ? (
                                <select value={adminSubpoolPeriod} onChange={(e) => { setAdminSubpoolPeriod(e.target.value); setAdminSubpoolUsers(roundParticipants?.[e.target.value] || []); }} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none flex-1">
                                    <option value="">Selecione a Rodada</option>
                                    {Array.from({ length: 19 }, (_, i) => i + 20).map(r => (
                                        <option key={r} value={String(r)}>Rodada {r}</option>
                                    ))}
                                </select>
                            ) : (
                                <select value={adminSubpoolPeriod} onChange={(e) => { setAdminSubpoolPeriod(e.target.value); setAdminSubpoolUsers(roundParticipants?.[e.target.value] || []); }} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm outline-none flex-1">
                                    <option value="">Selecione a Fase</option>
                                    {adminSubpoolComp === 'copa_do_brasil' && <>
                                        <option value="copa_oitavas">Oitavas de Final</option>
                                        <option value="copa_quartas">Quartas de Final</option>
                                        <option value="copa_fase_final">Fase Final (Semi+Final)</option>
                                    </>}
                                    {adminSubpoolComp === 'libertadores' && <>
                                        <option value="libertadores_oitavas">Oitavas de Final</option>
                                        <option value="libertadores_quartas">Quartas de Final</option>
                                        <option value="libertadores_fase_final">Fase Final (Semi+Final)</option>
                                    </>}
                                    {adminSubpoolComp === 'sul_americana' && <>
                                        <option value="sul_americana_oitavas">Oitavas de Final</option>
                                        <option value="sul_americana_quartas">Quartas de Final</option>
                                        <option value="sul_americana_fase_final">Fase Final (Semi+Final)</option>
                                    </>}
                                </select>
                            )}
                        </div>
                        
                        {adminSubpoolPeriod && (
                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mt-4">
                                <div className="bg-gray-50 dark:bg-gray-700 p-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                    <span className="font-bold text-sm text-gray-800 dark:text-white">Selecionar Participantes</span>
                                    <button onClick={() => {
                                        if (adminSubpoolUsers.length === league.participants.length) setAdminSubpoolUsers([]);
                                        else setAdminSubpoolUsers([...league.participants]);
                                    }} className="text-xs text-brasil-blue dark:text-blue-400 font-bold">
                                        {adminSubpoolUsers.length === league.participants.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>
                                <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                                    {league.participants.map(uid => {
                                        const user = mergedUsers.find(u => u.id === uid);
                                        if (!user) return null;
                                        const isSelected = adminSubpoolUsers.includes(uid);
                                        return (
                                            <div key={uid} onClick={() => {
                                                if (isSelected) setAdminSubpoolUsers(prev => prev.filter(id => id !== uid));
                                                else setAdminSubpoolUsers(prev => [...prev, uid]);
                                            }} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-brasil-blue border-brasil-blue' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {isSelected && <Check size={14} className="text-white" />}
                                                </div>
                                                <OptimizedImage src={user.avatar} className="w-8 h-8 rounded-full object-cover" />
                                                <span className="text-sm font-medium text-gray-800 dark:text-white">{user.name}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {adminSubpoolPeriod && (
                            <button onClick={async () => {
                                setIsSavingSubpool(true);
                                try {
                                    const newRoundParticipants = { ...(roundParticipants || {}) };
                                    newRoundParticipants[adminSubpoolPeriod] = adminSubpoolUsers;
                                    await updateLeague(league.id, { round_participants: newRoundParticipants } as any);
                                    setRoundParticipants(newRoundParticipants);
                                    showToast('Sucesso', 'Participantes da rodada salvos com sucesso!', 'success');
                                } catch (e) {
                                    showToast('Erro', 'Erro ao salvar os participantes da rodada.', 'warning');
                                } finally {
                                    setIsSavingSubpool(false);
                                }
                            }} disabled={isSavingSubpool} className="w-full bg-brasil-green hover:bg-green-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                {isSavingSubpool ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                Salvar Participantes para esta {adminSubpoolComp === 'brasileirao' ? 'Rodada' : 'Fase'}
                            </button>
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4 text-gray-800 dark:text-white flex items-center gap-2">Configurações da Liga</h3>
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="flex flex-col items-center space-y-2">
                                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                                <div onClick={triggerFileInput} className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-brasil-blue dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700 transition-all relative group overflow-hidden bg-gray-50 dark:bg-gray-700">
                                    {editImage ? <img src={editImage} alt="Preview" className={`w-full h-full object-cover ${imageProcessing ? 'opacity-50' : ''}`} /> : <div className="flex flex-col items-center text-gray-400"><Camera size={24} /><span className="text-[10px] mt-1">Logo</span></div>}
                                    {imageProcessing && (<div className="absolute inset-0 flex items-center justify-center"><Loader2 className="animate-spin text-brasil-blue" size={24} /></div>)}
                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Upload className="text-white" size={20} /></div>
                                </div>
                                <div className="text-center"><span className="text-xs text-gray-500 dark:text-gray-400 block">Alterar Imagem</span><span className="text-[10px] text-gray-400 block mt-0.5">{imageProcessing ? 'Processando...' : 'Qualquer Tamanho'}</span></div>
                            </div>
                            <div className="flex-1 w-full space-y-4">
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Liga</label><input value={league.name} disabled className="w-full border border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-lg p-2.5 cursor-not-allowed" placeholder="Nome da liga" /><p className="text-xs text-gray-400 mt-1">O nome da liga não pode ser alterado.</p></div>
                                <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label><textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full border border-gray-600 bg-gray-700 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-brasil-blue outline-none h-24 resize-none text-sm" placeholder="Adicione uma descrição para sua liga..." /></div>
                                <div className="flex items-center justify-between"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">Visibilidade da Liga</label><button type="button" onClick={() => alert('Neste modo, apenas ligas privadas são permitidas.')} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brasil-blue focus:ring-offset-2 ${editIsPrivate ? 'bg-brasil-green' : 'bg-gray-300'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${editIsPrivate ? 'translate-x-6' : 'translate-x-1'}`} /></button></div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2 flex items-center gap-1">{editIsPrivate ? <Lock size={12} /> : <Lock size={12} />}Privada (Obrigatório neste modo)</p>
                                <button onClick={handleUpdateLeague} disabled={imageProcessing || isSavingSettings} className="bg-brasil-blue text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-900 transition-colors flex items-center gap-2 text-sm disabled:opacity-50">{imageProcessing || isSavingSettings ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {imageProcessing ? 'Aguarde...' : isSavingSettings ? 'Salvando...' : 'Salvar Alterações'}</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <h3 className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                            <Trophy size={20} className="text-brasil-blue dark:text-blue-400" /> Pontuações da Liga
                        </h3>
                        {isScoringLocked && (
                            <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-3 py-1 rounded-full font-bold flex items-center gap-1 border border-red-200 dark:border-red-800">
                                <Lock size={10} /> BLOQUEADO (24H ANTES OU MANUAL)
                            </span>
                        )}
                    </div>

                    <div className="space-y-6">

                        <div className="bg-orange-100 dark:bg-yellow-900/30 border border-orange-300 dark:border-yellow-700 p-3 rounded-xl flex items-start gap-2 text-orange-600 dark:text-orange-400 text-xs leading-relaxed font-bold mb-4">
                            <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                            <p>A configuração da pontuação será bloqueada no Sábado, dia 25/07/2026 às 18 horas.</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-start gap-2 text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                            <Info size={16} className="mt-0.5 flex-shrink-0" />
                            <p>Se quiser deixar desativado <strong>Vencedor + Gols do Vencedor</strong>, <strong>Vencedor + Saldo</strong> ou <strong>Empate (Não Exato)</strong> basta deixar a mesma pontuação de <strong>Apenas Vencedor</strong>.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cravada (Placar Exato)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    disabled={isScoringLocked}
                                    value={editExactScore}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setEditExactScore('');
                                        else {
                                            const n = parseInt(val);
                                            if (n > 0 && n <= 99) setEditExactScore(n);
                                        }
                                    }}
                                    className={`w-full p-3 rounded-xl border font-bold ${isScoringLocked ? 'bg-gray-100 dark:bg-gray-900 text-gray-400' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brasil-blue outline-none'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vencedor + Saldo</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    disabled={isScoringLocked}
                                    value={editWinnerAndDiff}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setEditWinnerAndDiff('');
                                        else {
                                            const n = parseInt(val);
                                            if (n > 0 && n <= 99) setEditWinnerAndDiff(n);
                                        }
                                    }}
                                    className={`w-full p-3 rounded-xl border font-bold ${isScoringLocked ? 'bg-gray-100 dark:bg-gray-900 text-gray-400' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brasil-blue outline-none'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vencedor + Gols do Vencedor</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    disabled={isScoringLocked}
                                    value={editWinnerAndWinnerGoals}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setEditWinnerAndWinnerGoals('');
                                        else {
                                            const n = parseInt(val);
                                            if (n > 0 && n <= 99) setEditWinnerAndWinnerGoals(n);
                                        }
                                    }}
                                    className={`w-full p-3 rounded-xl border font-bold ${isScoringLocked ? 'bg-gray-100 dark:bg-gray-900 text-gray-400' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brasil-blue outline-none'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Empate (Não Exato)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    disabled={isScoringLocked}
                                    value={editDraw}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setEditDraw('');
                                        else {
                                            const n = parseInt(val);
                                            if (n > 0 && n <= 99) setEditDraw(n);
                                        }
                                    }}
                                    className={`w-full p-3 rounded-xl border font-bold ${isScoringLocked ? 'bg-gray-100 dark:bg-gray-900 text-gray-400' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brasil-blue outline-none'}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Apenas Vencedor</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    disabled={isScoringLocked}
                                    value={editWinner}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '') setEditWinner('');
                                        else {
                                            const n = parseInt(val);
                                            if (n > 0 && n <= 99) setEditWinner(n);
                                        }
                                    }}
                                    className={`w-full p-3 rounded-xl border font-bold ${isScoringLocked ? 'bg-gray-100 dark:bg-gray-900 text-gray-400' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-brasil-blue outline-none'}`}
                                />
                            </div>
                        </div>


                        <button
                            onClick={handleUpdateScoring}
                            disabled={isScoringLocked || isSavingScoring}
                            className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-md active:scale-95 ${isScoringLocked ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-brasil-blue hover:bg-blue-900 text-white'}`}
                        >
                            {isSavingScoring ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                            {isScoringLocked ? 'Configurações Bloqueadas' : 'Salvar Pontuações'}
                        </button>
                    </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 shadow-sm border border-red-100 dark:border-red-800"><h3 className="font-bold text-lg mb-4 text-red-800 dark:text-red-300 flex items-center gap-2"><AlertTriangle size={20} /> Zona de Perigo</h3><p className="text-sm text-red-700 dark:text-red-300 mb-4">Ao excluir a liga, todos os dados, participantes e palpites serão permanentemente removidos. Esta ação não pode ser desfeita.</p><button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors shadow-sm"><Trash2 size={18} /> Excluir Liga e Dados</button></div>
                {showUpgradeModal && createPortal(
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-0 w-full max-w-md animate-in zoom-in-95 duration-200 overflow-hidden">
                            <div className={`p-6 text-center ${isMaster ? 'bg-gradient-to-r from-gray-900 to-gray-800' : isVip ? 'bg-gradient-to-r from-green-700 to-green-900' : isBasic ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-teal-500 to-teal-700'}`}>
                                <Crown className="w-16 h-16 text-yellow-300 mx-auto mb-2" fill="currentColor" />
                                <h2 className="text-2xl font-black text-white uppercase tracking-wide">{targetPlan.toUpperCase()}</h2>
                                <p className="text-blue-100 mt-1 font-bold">{upgradeLimit}</p>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="text-center space-y-2">
                                    <p className="text-gray-600 dark:text-gray-300">Para aumentar o limite da sua liga, realize o upgrade:</p>
                                    <button onClick={() => setShowPricingModal(true)} className="text-2xl font-bold text-brasil-green underline hover:text-green-700 transition-colors mt-2 inline-block">Confira os Valores</button>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl border border-gray-200 dark:border-gray-600 text-sm text-gray-600 dark:text-gray-300 leading-relaxed text-center">Favor entrar em contato via WhatsApp para enviar o comprovante. O desbloqueio é imediato.</div>
                                <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-4 px-6 rounded-xl text-center transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-3">
                                    <MessageCircle size={24} /> {upgradeText}
                                </a>
                                <button onClick={() => setShowUpgradeModal(false)} className="block w-full text-gray-400 font-medium text-sm hover:text-gray-600 py-2">Fechar</button>
                            </div>
                        </div>
                    </div>, document.body
                )}

                {/* Pricing Modal */}
                {showPricingModal && createPortal(
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[90vh] border border-gray-200 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tabela de Preços dos Planos Vip</h2>
                        <button type="button" onClick={() => setShowPricingModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                        </div>
                        
                        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                            <tr>
                                <th className="px-4 py-3">Campeonatos</th>
                                <th className="px-4 py-3 whitespace-nowrap text-center">Grátis<br/><span className="text-[10px] font-normal">(até 15 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-gray-200/50 dark:bg-gray-600/30 text-gray-600 dark:text-gray-300">Vip Básico<br/><span className="text-[10px] font-normal">(até 50 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-blue-100/50 dark:bg-blue-900/30 text-brasil-blue dark:text-blue-400">Vip Top<br/><span className="text-[10px] font-normal">(até 100 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-green-100/50 dark:bg-green-900/30 text-brasil-green dark:text-green-400">Vip Master<br/><span className="text-[10px] font-normal">(até 200 Participantes)</span></th>
                                <th className="px-4 py-3 whitespace-nowrap text-center bg-yellow-100/50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">Vip Ilimitado</th>
                            </tr>
                            </thead>
                            <tbody>
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td rowSpan={3} className="px-4 py-3 font-medium text-gray-900 dark:text-white align-middle">Copa (Copa do Brasil, Copa Libertadores e Copa Sul-Americana)</td>
                                <td className="px-4 py-3 text-center">1 Copa - Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 10,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 15,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 25,00</td>
                            </tr>
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 text-center">2 Copas - Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 15,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 30,00</td>
                            </tr>
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 text-center">3 Copas - Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 35,00</td>
                            </tr>
                            <tr className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 20,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 35,00</td>
                            </tr>
                            <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A + 1 Copa</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 25,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 35,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 40,00</td>
                            </tr>
                            <tr className="bg-gray-50 border-b dark:bg-gray-800/50 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A + 2 Copas</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 30,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 35,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 40,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 45,00</td>
                            </tr>
                            <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750">
                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Brasileirão Série A + 3 Copas</td>
                                <td className="px-4 py-3 text-center">Grátis</td>
                                <td className="px-4 py-3 text-center font-bold bg-gray-100/50 dark:bg-gray-700/30 text-gray-600 dark:text-gray-300">R$ 35,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-blue-50/50 dark:bg-blue-900/20 text-brasil-blue dark:text-blue-400">R$ 40,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-green-50/50 dark:bg-green-900/20 text-brasil-green dark:text-green-400">R$ 45,00</td>
                                <td className="px-4 py-3 text-center font-bold bg-yellow-50/50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400">R$ 50,00</td>
                            </tr>
                            </tbody>
                        </table>
                        </div>
                        
                        <div className="mt-4 flex justify-end">
                        <button type="button" onClick={() => setShowPricingModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg font-bold">
                            Fechar
                        </button>
                        </div>
                    </div>
                    </div>, document.body
                )}

            </div>
        );
    };

    if (!league) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] pt-20">
                <div className="w-12 h-12 border-4 border-brasil-blue border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-500 font-bold dark:text-gray-400">Carregando liga...</p>
            </div>
        );
    }

    return (
        <div>
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
                        className={`bg-white dark:bg-gray-800 shadow-2xl rounded-r-lg p-5 animate-in fade-in zoom-in-95 duration-300 flex items-start gap-3 transition-all`}
                        style={{
                            pointerEvents: 'auto',
                            width: '85vw',
                            maxWidth: '384px',
                            borderLeftWidth: '4px',
                            borderLeftStyle: 'solid',
                            borderColor: toast.type === 'warning' ? '#f59e0b' : toast.type === 'success' ? '#009c3b' : '#002776',
                        }}
                    >
                        <div className="mt-0.5"><div className={`p-1.5 rounded-full ${toast.type === 'warning' ? 'bg-yellow-100 text-yellow-700' : toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-brasil-blue'}`}>{toast.type === 'warning' ? <AlertTriangle size={16} /> : toast.type === 'success' ? <Check size={16} /> : <Info size={16} />}</div></div><div className="flex-1"><h3 className="font-bold text-gray-800 dark:text-white text-sm">{toast.title}</h3><p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5">{toast.message}</p></div><button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
                    </div>
                </div>,
                document.body
            )}
            {userToRemove && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3 mb-4 text-red-600"><div className="bg-red-100 p-2 rounded-full"><AlertTriangle size={24} /></div><h3 className="text-lg font-bold text-gray-800 dark:text-white">Remover Participante?</h3></div><p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">Você tem certeza que deseja remover <strong>{userToRemove.name}</strong> desta liga? Essa ação removerá o acesso do usuário e não poderá ser desfeita imediatamente.</p><div className="flex gap-3"><button onClick={() => setUserToRemove(null)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-colors text-sm">Cancelar</button><button onClick={confirmRemoveUser} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md shadow-red-200 transition-all active:scale-95 text-sm">Confirmar</button></div></div></div>, document.body)}
            {showDeleteConfirm && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border-2 border-red-100 dark:border-red-900"><div className="flex items-center gap-3 mb-4 text-red-700 dark:text-red-400"><div className="bg-red-100 dark:bg-red-900 p-2 rounded-full"><Trash2 size={24} /></div><h3 className="text-lg font-bold text-gray-900 dark:text-white">Excluir Liga Permanentemente?</h3></div><div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4 text-xs text-red-800 dark:text-red-200 border border-red-100 dark:border-red-800"><p className="font-bold mb-1">ATENÇÃO:</p><p>Esta ação é irreversível e apagará todos os dados.</p></div><p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">Você está prestes a excluir a liga <strong>{league.name}</strong>. Todos os palpites de todos os usuários e o ranking serão <strong>apagados do banco de dados</strong>.</p><div className="flex gap-3"><button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-colors text-sm disabled:opacity-50">Cancelar</button><button onClick={executeDeleteLeague} disabled={isDeleting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md shadow-red-200 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 disabled:opacity-50">{isDeleting ? 'Excluindo...' : 'Confirmar Exclusão'}</button></div></div></div>, document.body)}
            {showLeaveConfirm && createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200"><div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200 border border-gray-100 dark:border-gray-700"><div className="flex items-center gap-3 mb-4 text-red-600"><div className="bg-red-100 p-2 rounded-full"><LogOut size={24} /></div><h3 className="text-lg font-bold text-gray-800 dark:text-white">Sair da Liga?</h3></div><p className="text-gray-600 dark:text-gray-300 mb-6 text-sm leading-relaxed">Tem certeza que deseja sair da liga <strong>{league.name}</strong>? Seus palpites <strong>não serão apagados</strong>, mas você deixará de pontuar no ranking.</p><div className="flex gap-3"><button onClick={() => setShowLeaveConfirm(false)} className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold text-gray-600 dark:text-gray-300 transition-colors text-sm">Cancelar</button><button onClick={executeLeave} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md shadow-red-200 transition-all active:scale-95 text-sm">Sair</button></div></div></div>, document.body)}

            <div className="mb-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => confirmNavigation(() => {
                        if (window.history.state?.idx > 0) {
                            navigate(-1);
                        } else {
                            navigate('/leagues-brasileirao', { replace: true });
                        }
                    })} className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"><div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700"><ArrowLeft size={18} /></div> Voltar</button>
                    {isAdmin && validPendingRequestsCount > 0 && (<button onClick={() => handleTabChange('admin')} className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-md transition-all animate-pulse hover:animate-none"><Bell size={14} fill="currentColor" /> {validPendingRequestsCount} pendentes</button>)}
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        {league.image ? (
                            <div onClick={() => setZoomedImage(league.image)} className="cursor-pointer hover:ring-2 hover:ring-brasil-blue rounded-full transition-all">
                                <OptimizedImage
                                    src={league.image}
                                    alt={league.name}
                                    containerClassName="w-16 h-16 rounded-full object-cover border-4 border-gray-50 dark:border-gray-700 shadow-sm"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        ) : (<div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-brasil-blue dark:text-blue-400"><Trophy size={32} /></div>)}
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
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                                {allowedCompetitions.includes('brasileirao') && <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Brasileirão</span>}
                                {allowedCompetitions.includes('copa_do_brasil') && <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Copa do Brasil</span>}
                                {allowedCompetitions.includes('libertadores') && <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Libertadores</span>}
                                {allowedCompetitions.includes('sul_americana') && <span className="text-[10px] bg-pink-100 dark:bg-pink-500/30 text-pink-500 dark:text-pink-200 border border-pink-200 dark:border-pink-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">Sul-Americana</span>}
                            </div>
                            {league.leagueCode && (<div className="md:hidden mt-3"><div onClick={handleCopyCode} className="inline-flex items-center gap-1 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 px-2 py-0.5 rounded transition-all select-none border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 group" title="Clique para copiar o código"><span className="font-bold text-gray-700 dark:text-gray-300 text-xs font-mono tracking-wide">Código da Liga: {league.leagueCode}</span>{copiedCode ? <Check size={12} className="text-green-600 dark:text-green-400" /> : <Copy size={12} className="text-gray-400 dark:text-gray-500 group-hover:text-brasil-blue dark:group-hover:text-blue-400" />}</div></div>)}
                        </div>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        {isParticipant ? (
                            <><button onClick={handleShareWhatsApp} className="flex-1 md:flex-none bg-brasil-blue text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 shadow-sm"><Share2 size={16} /> Convidar</button>{!isAdmin && (<button onClick={handleLeave} className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-800" title="Sair da Liga"><LogOut size={18} /></button>)}</>
                        ) : isPending ? (
                            <button disabled className="w-full md:w-auto bg-yellow-100 text-yellow-700 px-6 py-2 rounded-lg font-bold text-sm cursor-not-allowed">Solicitação Enviada</button>
                        ) : invitations.some(i => i.leagueId === league.id && i.status === 'pending') ? (
                            <div className="flex flex-col items-center">
                                <button disabled className="w-full md:w-auto bg-blue-100 text-blue-700 px-6 py-2 rounded-lg font-bold text-sm cursor-not-allowed flex items-center gap-2">
                                    <Mail size={16} /> Convite Pendente
                                </button>
                                <span className="text-[10px] text-blue-600 font-bold mt-1">Aceite no sininho de notificações</span>
                            </div>
                        ) : (
                            <button onClick={handleJoin} className="w-full md:w-auto bg-brasil-green text-white px-6 py-2 rounded-lg font-bold text-sm hover:bg-green-700 transition-colors flex items-center justify-center gap-2"><UserPlus size={16} /> Participar da Liga</button>
                        )}
                    </div>
                </div>
                {league.description && (<div className="mt-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300"><h3 className="font-bold text-gray-800 dark:text-white mb-1">Sobre a Liga</h3><p>{league.description}</p></div>)}
            </div>

            <div className="flex gap-0.5 bg-gray-200 dark:bg-gray-700 p-0.5 rounded-lg mb-6 overflow-x-auto">
                <button onClick={() => handleTabChange('palpites')} className={`flex-auto py-2 px-1 min-[380px]:px-2 sm:px-4 rounded-md text-sm sm:text-base font-bold transition-colors whitespace-nowrap ${activeTab === 'palpites' ? 'bg-white dark:bg-gray-600 shadow-sm text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Palpites</button>
                <button onClick={() => handleTabChange('classificacao')} className={`flex-auto py-2 px-1 min-[380px]:px-2 sm:px-4 rounded-md text-sm sm:text-base font-bold transition-colors whitespace-nowrap ${activeTab === 'classificacao' ? 'bg-white dark:bg-gray-600 shadow-sm text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Classificação</button>
                <button onClick={() => handleTabChange('regras')} className={`flex-auto py-2 px-1 min-[380px]:px-2 sm:px-4 rounded-md text-sm sm:text-base font-bold transition-colors whitespace-nowrap ${activeTab === 'regras' ? 'bg-white dark:bg-gray-600 shadow-sm text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Regras</button>
                {isAdmin && <button onClick={() => handleTabChange('admin')} className={`flex-auto py-2 px-1 min-[380px]:px-2 sm:px-4 rounded-md text-sm sm:text-base font-bold transition-colors whitespace-nowrap ${activeTab === 'admin' ? 'bg-white dark:bg-gray-600 shadow-sm text-brasil-blue dark:text-blue-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>Admin {validPendingRequestsCount > 0 && <span className="ml-1.5 w-1.5 h-1.5 inline-block bg-red-500 rounded-full"></span>}</button>}
            </div>

            <div className="min-h-[400px]">
                {activeTab === 'palpites' && (
                    !isParticipant && !isPending ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="bg-gray-100 dark:bg-gray-700 p-5 rounded-full mb-4">
                                <Lock size={40} className="text-gray-400 dark:text-gray-500" />
                            </div>
                            <h3 className="text-lg font-black text-gray-700 dark:text-gray-200 mb-2">Acesso Restrito</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-xs">
                                Você precisa participar desta liga para visualizar e enviar palpites.
                            </p>
                            <button
                                onClick={handleJoin}
                                className="bg-brasil-green hover:bg-green-700 text-white font-bold px-8 py-3 rounded-xl transition-colors shadow-md flex items-center gap-2 active:scale-95"
                            >
                                <UserPlus size={18} />
                                {league.isPrivate ? 'Solicitar Entrada' : 'Participar da Liga'}
                            </button>
                        </div>
                    ) : isPending ? (
                        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-yellow-200 dark:border-yellow-700 shadow-sm">
                            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-5 rounded-full mb-4">
                                <Clock size={40} className="text-yellow-500 dark:text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-black text-gray-700 dark:text-gray-200 mb-2">Solicitação Pendente</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
                                Sua solicitação de entrada foi enviada. Aguarde o administrador aprová-la.
                            </p>
                        </div>
                    ) : renderPalpitesTab()
                )}
                {activeTab === 'classificacao' && renderClassificacaoTab()}
                {activeTab === 'regras' && renderRegrasTab()}
                {activeTab === 'admin' && renderAdminTab()}
            </div>

            {/* ZOOMED IMAGE MODAL */}
            {zoomedImage && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setZoomedImage(null)}>
                    <button onClick={() => setZoomedImage(null)} className="absolute top-4 right-4 text-white hover:text-gray-300 p-2"><X size={32} /></button>
                    <img src={zoomedImage as any} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in duration-300 shadow-2xl" onClick={e => e.stopPropagation()} />
                </div>, document.body
            )}

            {/* Custom Unsaved Changes Modal */}
            {showUnsavedModal && createPortal(
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-700 animate-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500 rounded-full flex items-center justify-center mb-4 mx-auto">
                                <AlertTriangle size={24} />
                            </div>
                            <h3 className="text-xl font-black text-center text-gray-900 dark:text-white mb-2">Atenção</h3>
                            <p className="text-center text-gray-600 dark:text-gray-300 text-sm mb-6">
                                Você tem palpites não salvos. Deseja salvar antes de sair?
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={async () => {
                                        let ok = true;
                                        if (Object.keys(pendingEdits).length > 0) {
                                            ok = await handleSaveAll();
                                        }
                                        const hasTopFinisherChanges = checkTopFinisherChanges();
                                        if (ok && hasTopFinisherChanges) {
                                            if (!tfChampion || !tfRunnerUp || !tfThird || !tfFourth) {
                                                alert('Preencha todos os 4 colocados antes de salvar.');
                                                ok = false;
                                            } else {
                                                setIsSavingTopFinishers(true);
                                                const succ = await submitTopFinisherPrediction(league.id, tfChampion, tfRunnerUp, tfThird, tfFourth);
                                                setIsSavingTopFinishers(false);
                                                ok = succ;
                                            }
                                        }
                                        if (ok) {
                                            setShowUnsavedModal(null);
                                            showUnsavedModal.action();
                                        }
                                    }}
                                    className="w-full bg-brasil-blue hover:bg-blue-900 text-white font-bold py-3 rounded-xl transition-colors shadow-md"
                                >
                                    Salvar e Sair
                                </button>
                                <button
                                    onClick={() => {
                                        setPendingEdits({});
                                        const existingPred = topFinisherPredictions.find(p => p.userId === currentUser.id && p.leagueId === league.id);
                                        setTfChampion(existingPred?.champion || '');
                                        setTfRunnerUp(existingPred?.runnerUp || '');
                                        setTfThird(existingPred?.third || '');
                                        setTfFourth(existingPred?.fourth || '');
                                        setShowUnsavedModal(null);
                                        showUnsavedModal.action();
                                    }}
                                    className="w-full bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold py-3 rounded-xl transition-colors"
                                >
                                    Sair sem salvar
                                </button>
                                <button
                                    onClick={() => setShowUnsavedModal(null)}
                                    className="w-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-bold py-3 transition-colors"
                                >
                                    Cancelar e Ficar na Tela
                                </button>
                            </div>
                        </div>
                    </div>
                </div>, document.body
            )}

            {isPreparingAd && createPortal(
                <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 size={48} className="text-white animate-spin mb-4" />
                    <div className="text-white font-bold text-lg">Carregando anúncio...</div>
                    <div className="text-gray-300 text-sm mt-2">Aguarde um momento</div>
                </div>,
                document.body
            )}
        </div>
    );
};
