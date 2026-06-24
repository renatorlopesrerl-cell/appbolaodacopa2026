import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Settings,
  LogOut,
  Plus,
  Users,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Info,
  Clock,
  Calendar,
  Lock,
  Globe,
  Bell,
  User as UserIcon,
  RefreshCw,
  Home as HomeIcon
} from 'lucide-react';

// Capacitor Plugins
import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

// Components & Views
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { TablePage } from './pages/TablePage';
import { LeaguesPage } from './pages/LeaguesPage';
import { LeagueDetails } from './pages/LeagueDetails';
import { SimulatePage } from './pages/SimulatePage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { AdminLeaguesPage } from './pages/AdminLeaguesPage';
import { AdminBrazilLeaguesPage } from './pages/AdminBrazilLeaguesPage';
import { AdminMatchesPage } from './pages/AdminMatchesPage';
import { HowToPlay } from './pages/HowToPlay';
import { Login } from './pages/Login';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { AccountDeletionPage } from './pages/AccountDeletionPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ConfirmacaoCadastro } from './pages/ConfirmacaoCadastro';
import { SEOLanding } from './pages/SEOLanding';
import { BrazilGamesPage } from './pages/BrazilGamesPage';
import { BrazilLeagueDetails } from './pages/BrazilLeagueDetails';
import { ProPage } from './pages/ProPage';



// Services
import { supabase } from './services/supabase'; // Auth Only
import { api } from './services/api';
import { uploadBase64Image } from './services/storageService';
import { setupPushNotifications, scheduleMatchReminder, cancelMatchReminder } from './services/pushService';
import { onForegroundMessage } from './services/firebaseWeb';
import { Capacitor } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { AdMob } from '@capacitor-community/admob';

// Types
import { User, Match, League, Prediction, Invitation, MatchStatus, BrazilLeague, BrazilPrediction, BrazilMatchGoal, BrazilPlayer, TopFinisherPrediction, TopFinishersResult } from './types';

// Constantes
import { INITIAL_MATCHES } from './services/dataService';

interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface AppState {
  currentUser: User | null;
  users: User[];
  matches: Match[];
  leagues: League[];
  predictions: Prediction[];
  brazilLeagues: BrazilLeague[];
  brazilPredictions: BrazilPrediction[];
  brazilMatchGoals: BrazilMatchGoal[];
  brazilPlayers: BrazilPlayer[];
  invitations: Invitation[];
  currentTime: Date;
  notifications: AppNotification[];
  loading: boolean;
  isSyncing: boolean;
  theme: 'light' | 'dark';
  setCurrentTime: (date: Date) => void;
  loginGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<boolean>;
  signUpWithEmail: (email: string, pass: string, name: string, whatsapp?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createLeague: (name: string, isPrivate: boolean, settings: any, image: string, description: string, plan?: string) => Promise<boolean>;
  updateLeague: (id: string, updates: Partial<League>) => Promise<void>;
  joinLeague: (leagueId: string, leagueData?: any) => Promise<void>;
  deleteLeague: (leagueId: string) => Promise<boolean>;
  approveUser: (leagueId: string, userId: string) => Promise<void>;
  rejectUser: (leagueId: string, userId: string) => Promise<void>;
  removeUserFromLeague: (leagueId: string, userId: string) => Promise<void>;
  submitPrediction: (matchId: string, leagueId: string, home: number, away: number) => Promise<void>;
  submitPredictions: (preds: { matchId: string, home: number, away: number }[], leagueId: string) => Promise<boolean>;
  simulateMatchResult: (matchId: string, home: number, away: number) => void;
  updateMatch: (match: Match) => Promise<boolean>;
  removeNotification: (id: number) => void;
  updateUserProfile: (name: string, avatar: string, whatsapp: string, notificationSettings: any, themePreference: 'light' | 'dark') => Promise<void>;
  syncInitialMatches: () => Promise<void>;
  sendLeagueInvite: (leagueId: string, email: string) => Promise<boolean>;
  sendBrazilLeagueInvite: (leagueId: string, email: string) => Promise<boolean>;
  respondToInvite: (inviteId: string, accept: boolean) => Promise<void>;
  toggleTheme: () => void;
  connectionError: boolean;
  retryConnection: () => void;
  addNotification: (title: string, message: string, type: 'success' | 'info' | 'warning', duration?: number) => void;
  refreshPredictions: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  isRecoveryMode: boolean;
  lastSyncTime: Date | null;
  // Brazil Mode Methods
  createBrazilLeague: (name: string, isPrivate: boolean, image: string, description: string, settings: any) => Promise<boolean>;
  updateBrazilLeague: (id: string, updates: Partial<BrazilLeague>) => Promise<void>;
  joinBrazilLeague: (leagueId: string, leagueData?: any) => Promise<void>;
  deleteBrazilLeague: (leagueId: string) => Promise<boolean>;
  approveBrazilUser: (leagueId: string, userId: string) => Promise<void>;
  rejectBrazilUser: (leagueId: string, userId: string) => Promise<void>;
  removeUserFromBrazilLeague: (leagueId: string, userId: string) => Promise<void>;
  submitBrazilPredictions: (preds: { matchId: string, home: number, away: number, playerPick: string }[], leagueId: string) => Promise<boolean>;
  addBrazilMatchGoal: (matchId: string, playerName: string, goals: number) => Promise<boolean>;
  topFinisherPredictions: TopFinisherPrediction[];
  topFinishersResult: TopFinishersResult | null;
  submitTopFinisherPrediction: (leagueId: string, champion: string, runnerUp: string, third: string, fourth: string) => Promise<boolean>;
  setTopFinishersResult: (champion: string, runnerUp: string, third: string, fourth: string) => Promise<boolean>;
  loadLeagueData: (leagueId: string, leagueType?: 'standard' | 'brazil', forceRefresh?: boolean) => Promise<void>;
  fetchMatchPredictions: (matchId: string, leagueId: string, leagueType: 'standard' | 'brazil') => Promise<any[]>;
  fetchLeagueTopFinisherPredictions: (leagueId: string) => Promise<any[]>;
  hasWatchedPredictionAd: boolean;
  setHasWatchedPredictionAd: (val: boolean) => void;
  isRefreshingPredictions: boolean;
}

const AppContext = createContext<AppState | null>(null);

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useStore must be used within AppProvider");
  return context;
};

// Helper: League Limit
export const getLeagueLimit = (league: League | BrazilLeague): number => {
  if (league.settings?.isUnlimited) return Infinity;
  const plan = (league.settings as any)?.plan || 'FREE';
  switch (plan) {
    case 'VIP_UNLIMITED': return Infinity;
    case 'VIP_MASTER': return 200;
    case 'VIP': return 100;
    case 'VIP_BASIC': return 50;
    case 'FREE':
    default: return 10;
  }
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error?: Error }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Uncaught error:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-md w-full">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Ops! Algo deu errado.</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">Ocorreu um erro inesperado na aplicação.</p>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-brasil-blue hover:bg-blue-900 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 mx-auto"
            >
              <HomeIcon size={20} /> Ir para o Início
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppLoading: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-500">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-brasil-blue border-t-brasil-yellow rounded-full animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 bg-white dark:bg-gray-800 rounded-full"></div>
      </div>
    </div>
    <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium animate-pulse">Carregando...</p>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useStore();
  if (loading) return <AppLoading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useStore();
  if (loading) return <AppLoading />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!currentUser.isAdmin && !currentUser.isMatchAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl max-w-md w-full border border-red-100 dark:border-red-800">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Não Autorizado</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Você não tem permissão para acessar esta página.</p>
          <button onClick={() => window.location.href = '/'} className="bg-brasil-blue hover:bg-blue-800 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const lastFetchedLeaguesRef = useRef<Record<string, number>>({});
  const activeFetchesRef = useRef<Record<string, Promise<void>>>({});
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>(() => {
    try {
      const cached = localStorage.getItem('cache_matches');
      if (cached) {
        const parsed: Match[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) {
          // Validate cache: if any past match still shows SCHEDULED, cache is stale — discard it
          const now = Date.now();
          const hasStaleScheduled = parsed.some(m =>
            m.status === 'SCHEDULED' &&
            new Date(m.date).getTime() < now - 3 * 60 * 60 * 1000 // 3h ago
          );
          if (!hasStaleScheduled) return parsed;
          // Cache is stale — clear it and fall through to INITIAL_MATCHES
          console.warn('[cache] cache_matches is stale (past matches still SCHEDULED), clearing...');
          localStorage.removeItem('cache_matches');
          localStorage.removeItem('cache_predictions');
          localStorage.removeItem('cache_brazil_predictions');
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('preds_cache_') || key.startsWith('synced_matches_'))) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach(k => localStorage.removeItem(k));
        }
      }
    } catch (e) {
      console.warn('Failed to load matches from cache:', e);
    }
    return INITIAL_MATCHES;
  });
  const [leagues, setLeagues] = useState<League[]>(() => {
    try {
      const cached = localStorage.getItem('cache_leagues');
      if (cached) {
        const parsed: League[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load leagues from cache:', e); }
    return [];
  });
  const [predictions, setPredictions] = useState<Prediction[]>(() => {
    try {
      const cached = localStorage.getItem('cache_predictions');
      if (cached) {
        const parsed: Prediction[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load predictions from cache:', e); }
    return [];
  });
  const [brazilLeagues, setBrazilLeagues] = useState<BrazilLeague[]>(() => {
    try {
      const cached = localStorage.getItem('cache_brazil_leagues');
      if (cached) {
        const parsed: BrazilLeague[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load brazilLeagues from cache:', e); }
    return [];
  });
  const [brazilPredictions, setBrazilPredictions] = useState<BrazilPrediction[]>(() => {
    try {
      const cached = localStorage.getItem('cache_brazil_predictions');
      if (cached) {
        const parsed: BrazilPrediction[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load brazilPredictions from cache:', e); }
    return [];
  });
  const [brazilMatchGoals, setBrazilMatchGoals] = useState<BrazilMatchGoal[]>(() => {
    try {
      const cached = localStorage.getItem('cache_brazil_goals');
      if (cached) {
        const parsed: BrazilMatchGoal[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load brazilMatchGoals from cache:', e); }
    return [];
  });
  const [brazilPlayers, setBrazilPlayers] = useState<BrazilPlayer[]>(() => {
    try {
      const cached = localStorage.getItem('cache_brazil_players');
      if (cached) {
        const parsed: BrazilPlayer[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load brazilPlayers from cache:', e); }
    return [];
  });
  const [topFinisherPredictions, setTopFinisherPredictions] = useState<TopFinisherPrediction[]>(() => {
    try {
      const cached = localStorage.getItem('cache_top_finisher_preds');
      if (cached) {
        const parsed: TopFinisherPrediction[] = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) { console.warn('Failed to load topFinisherPredictions from cache:', e); }
    return [];
  });
  const [topFinishersResult, setTopFinishersResultState] = useState<TopFinishersResult | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasWatchedPredictionAd, setHasWatchedPredictionAd] = useState(false);
  const [isRefreshingPredictions, setIsRefreshingPredictions] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false); // Background sync indicator
  const [connectionError, setConnectionError] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    try {
      const cached = localStorage.getItem('last_sync_time');
      if (cached) return new Date(cached);
    } catch { }
    return null;
  });
  const notifiedReminders = useRef<Set<string>>(new Set());

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
    // Default to light for new users
    return 'light';
  });

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);
  const currentUserRef = useRef<User | null>(null);
  const failureCountRef = useRef(0);

  const addNotification = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info', duration: number = 6000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      if (currentUser) {
        updateUserProfile(currentUser.name, currentUser.avatar, currentUser.whatsapp || '', currentUser.notificationSettings || { matchStart: true, matchEnd: true, predictionReminder: true }, newTheme).catch(() => { });
      }
      return newTheme;
    });
  };

  const retryConnection = useCallback(() => {
    failureCountRef.current = 0;
    setConnectionError(false);
    setLoading(true);
    fetchAllData();
  }, []);

  // --- REVENUECAT INITIALIZATION ---
  useEffect(() => {
    const initRevenueCat = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
          await Purchases.configure({ apiKey: "goog_bxLqLtWQVchuTbHBNljTJNpYblM" });
          console.log("RevenueCat configured successfully.");
        } catch (e) {
          console.error("Error configuring RevenueCat:", e);
        }

        try {
          await AdMob.initialize({});
          console.log("AdMob initialized successfully.");
        } catch (e) {
          console.error("Error initializing AdMob:", e);
        }
      }
    };
    initRevenueCat();
  }, []);

  useEffect(() => {
    // Atualiza o tempo a cada 5 segundos para fechar visualmente os jogos travados rapidamente
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && currentUserRef.current) {
        console.log("App resumed, refreshing data...");
        fetchAllData(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // --- PREDICTION REMINDER SCHEDULER ---
  useEffect(() => {
    if (!currentUser?.notificationSettings?.predictionReminder || loading) return;

    const isNative = (window as any).Capacitor?.isNativePlatform?.() || false;
    const now = new Date().getTime();

    if (!isNative) {
      // Web reminders are now handled exclusively by the server (Push via FCM)
      // and pg_cron in Supabase to ensure they arrive even with the browser closed.
      return;
    }

    // Native logic: Sync scheduled reminders with 5s debounce
    const timer = setTimeout(async () => {
      console.log("Push Reminder Sync: Starting logic for next matches...");

      const upcomingMatches = matches
        .filter(m => m.status === MatchStatus.SCHEDULED)
        .filter(m => {
          const mTime = new Date(m.date).getTime();
          return (mTime - (30 * 60 * 1000)) > now;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 15);

      for (const match of upcomingMatches) {
        scheduleMatchReminder(match.id, `${match.homeTeamId} x ${match.awayTeamId}`, match.date).catch(() => { });
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentTime, matches.length, predictions.length, currentUser?.id, currentUser?.notificationSettings?.predictionReminder, loading]);
  useEffect(() => {
    mountedRef.current = true;

    const initAuth = async () => {
      // Limite de segurança: Se o auth demorar muito na rede nativa, liberamos a UI
      const safetyTimeout = setTimeout(() => {
        if (mountedRef.current) {
          console.warn("Auth initialization safety timeout.");
          setLoading(false);
        }
      }, 8000);

      try {
        setLoading(true);
        console.log("Starting Auth Initialization...");

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn("Session retrieval error:", error.message);
          if (mountedRef.current) setLoading(false);
          return;
        }

        if (session?.user) {
          console.log("Session found for user:", session.user.id);
          const user = session.user;
          const metadata = user.user_metadata || {};
          const avatarUrl = metadata.avatar_url || metadata.picture || metadata.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
          const provider = user.app_metadata?.provider || 'email';

          const cachedIsPro = localStorage.getItem('cache_is_pro') === 'true';

          const basicUser: User = {
            id: user.id,
            email: user.email || '',
            name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuário',
            avatar: avatarUrl,
            isAdmin: metadata.is_admin || false,
            isMatchAdmin: metadata.is_match_admin || false,
            whatsapp: metadata.whatsapp || '',
            notificationSettings: { matchStart: true, matchEnd: true },
            isPro: cachedIsPro || metadata.is_pro || false,
            provider
          };

          setCurrentUser(basicUser);
          currentUserRef.current = basicUser;

          // Background sync
          fetchUserProfile(user.id, user.email || '', basicUser.avatar, basicUser.name, basicUser.whatsapp || '', provider);
          fetchAllData();
          setupPushNotifications(user.id).catch(() => { });
        } else {
          console.log("No active session found.");
          setCurrentUser(null);
          currentUserRef.current = null;
        }
      } catch (err: any) {
        console.warn("Critical Init Auth Error:", err.message);
        setCurrentUser(null);
      } finally {
        clearTimeout(safetyTimeout);
        if (mountedRef.current) {
          console.log("Auth Initialization Finished, loading=false");
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        currentUserRef.current = null;
        setLeagues([]);
        setPredictions([]);
        setInvitations([]);
        try {
          if (Capacitor.isNativePlatform()) {
            await Purchases.logOut();
          }
        } catch(e) { console.warn("RevenueCat LogOut Error", e); }
        if (mountedRef.current) setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'PASSWORD_RECOVERY') {
        if (event === 'PASSWORD_RECOVERY') {
          setIsRecoveryMode(true);
        }
        if (session?.user && (!currentUserRef.current || currentUserRef.current.id !== session.user.id)) {
          const user = session.user;
          const metadata = user.user_metadata || {};

          const avatarUrl = metadata.avatar_url || metadata.picture || metadata.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
          const provider = user.app_metadata?.provider || 'email';
          const basicUser: User = {
            id: user.id,
            email: user.email || '',
            name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuário',
            avatar: avatarUrl,
            isAdmin: metadata.is_admin || false,
            isMatchAdmin: metadata.is_match_admin || false,
            whatsapp: metadata.whatsapp || '',
            notificationSettings: { matchStart: true, matchEnd: true },
            isPro: metadata.is_pro || false,
            provider
          };

          setCurrentUser(basicUser);
          currentUserRef.current = basicUser;

          // Background sync
          fetchUserProfile(user.id, user.email || '', basicUser.avatar, basicUser.name, basicUser.whatsapp || '', provider);
          fetchAllData();
          setupPushNotifications(user.id).catch(e => console.error("Push Setup Error:", e));

          try {
            if (Capacitor.isNativePlatform()) {
              await Purchases.logIn({ appUserID: user.id });
            }
          } catch(e) { console.warn("RevenueCat LogIn Error", e); }
        }
        // Sempre liberar o loading quando o usuário for processador ou já existir
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // --- WEB PWA FOREGROUND PUSH LISTENER ---
  // O Service Worker lida com o background, mas se o usuário estiver com o app aberto (foreground)
  // precisamos capturar e mostrar um balãozinho, pois o navegador engole a notificação nativa.
  useEffect(() => {
    return onForegroundMessage((payload) => {
      const title = payload.notification?.title || payload.data?.title || 'Bolão Copa 2026';
      const body = payload.notification?.body || payload.data?.body || '';
      if (title || body) {
        addNotification(title, body, 'info', 8000);
      }
    });
  }, []);

  // --- NATIVE DEEP LINK LISTENER (OAuth) ---
  useEffect(() => {
    let sub: any;

    const setupDeepLink = async () => {
      try {
        console.log("Setting up Native Deep Link Listener...");
        sub = await CapApp.addListener('appUrlOpen', async (event: { url: string }) => {
          console.log("Deep Link Captured:", event.url);

          // 1. Processamento Robusto da URL
          let url: URL;
          try {
            const urlStr = event.url.replace('#', '?');
            url = new URL(urlStr);
          } catch (e) {
            console.error("Malformed Deep Link URL:", event.url);
            return;
          }

          const access_token = url.searchParams.get('access_token');
          const refresh_token = url.searchParams.get('refresh_token');
          const code = url.searchParams.get('code');

          if (access_token && refresh_token) {
            console.log("Tokens found in Deep Link. Setting Session...");
            setLoading(true);
            try {
              const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
              if (!error && data.session) {
                console.log("Session set from deep link. Closing browser.");
                await Browser.close();
                // O onAuthStateChange vai cuidar do resto (setar usuário, carregar dados)
                // Mas forçamos um fetch para garantir que a UI atualize rápido
                await fetchAllData();
              }
            } catch (e: any) {
              console.error("Deep link setSession error:", e.message);
            } finally {
              setLoading(false);
            }
          } else if (code) {
            console.log("OAuth Code found (PKCE). Exchanging...");
            setLoading(true);
            try {
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              if (!error && data.session) {
                console.log("Code Exchange Success.");
                await Browser.close();
                await fetchAllData();
              }
            } catch (e: any) {
              console.error("Deep link code exchange error:", e.message);
            } finally {
              setLoading(false);
            }
          }
        });
      } catch (e) {
        console.warn("Deep link listener setup failed (web environment?)");
      }
    };

    setupDeepLink();

    return () => {
      if (sub) sub.remove();
    };
  }, []);

  const fetchUserProfile = async (uid: string, email: string, photoURL: string, fullName: string = '', whatsappMeta: string = '', provider: string = 'email') => {
    const savedPrefs = localStorage.getItem(`notify_${uid}`);
    const fallbackPrefs = savedPrefs ? JSON.parse(savedPrefs) : { matchStart: true, matchEnd: true, predictionReminder: true };
    const shouldBeAdmin = false;

    const fallbackUser: User = {
      id: uid,
      name: fullName || email.split('@')[0] || 'Usuário',
      email: email,
      avatar: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
      isAdmin: shouldBeAdmin,
      whatsapp: whatsappMeta || '',
      notificationSettings: fallbackPrefs,
      theme: 'light',
      isPro: false,
      provider
    };

    try {
      const data = await api.profiles.get(uid).catch(() => null);
      if (data) {
        if (shouldBeAdmin && !data.is_admin) {
          await api.profiles.update({ id: uid, is_admin: true });
          data.is_admin = true;
        }

        console.log("Avatar Sync - DB:", data.avatar, "Fallback:", fallbackUser.avatar);
        const user: User = {
          id: data.id, // Ensure we use the current Auth ID
          name: data.name || fallbackUser.name,
          email: data.email || email,
          avatar: (data.avatar && data.avatar.trim() !== "") ? data.avatar : fallbackUser.avatar,
          isAdmin: data.is_admin === true,
          isMatchAdmin: data.is_match_admin === true,
          whatsapp: data.whatsapp || '',
          notificationSettings: data.notification_settings || fallbackPrefs,
          theme: data.theme,
          isPro: data.is_pro,
          provider
        };

        if (user.theme && (user.theme === 'light' || user.theme === 'dark')) {
          setTheme(user.theme);
        } else {
          // If database has no theme, save the current local theme to database
          api.profiles.update({ id: uid, theme }).catch(() => { });
        }
        setCurrentUser(user);
        try { localStorage.setItem('cache_is_pro', String(!!data.is_pro)); } catch {}
        setConnectionError(false);
        failureCountRef.current = 0;
        fetchInvitations(user.email);
      } else {
        console.log("Profile not found, creating new profile for:", uid);
        const newUserDB = {
          id: uid, email: email, name: fallbackUser.name, avatar: fallbackUser.avatar,
          is_admin: shouldBeAdmin, whatsapp: whatsappMeta || null, notification_settings: fallbackPrefs,
          theme: theme // Save current theme preference
        };
        try {
          await api.profiles.update(newUserDB);
          console.log("New profile created successfully");
        } catch (updateErr: any) {
          console.error("Failed to create new profile during sync:", updateErr.message);
          // Don't throw, let the user proceed with fallbackUser
        }
        setCurrentUser(fallbackUser);
        fetchInvitations(fallbackUser.email);
        setUsers(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
      }
    } catch (e: any) {
      console.error("fetchUserProfile critical error:", e.message);
      setCurrentUser(fallbackUser);
      if (e.message === 'Failed to fetch') setConnectionError(true);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const fetchInvitations = async (email: string) => {
    if (!email) return;
    const normalizedEmail = email.toLowerCase().trim();
    try {
      const data = await api.leagues.listInvites(normalizedEmail);
      if (data) {
        const mappedInvites: Invitation[] = data.map((i: any) => ({
          id: i.id, leagueId: i.league_id, email: i.email, status: i.status,
          leagueType: i.league_type || 'standard',
          league_name: i.league_name,
          league_image: i.league_image
        }));
        setInvitations(mappedInvites);
      }
    } catch (e) {
      console.error("Fetch Invitations Error:", e);
    }
  };

  const fetchAllData = async (silent: boolean = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!connectionError) setConnectionError(true);
      if (mountedRef.current) setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Stale-While-Revalidate: se há cache, libera o loading imediatamente
    const hasCachedData = !!localStorage.getItem('cache_matches');
    if (hasCachedData && mountedRef.current) {
      setLoading(false);
      setIsSyncing(true);
    }

    try {
      // ─── FASE 1: Ligas e Partidas (leve, rápido) ─────────────────────────────
      // Precisamos dos IDs das ligas para filtrar os palpites.
      // Ligas e partidas são pequenos — chegam rápido.
      const [leaguesRes, matchesRes, brazilLeaguesRes] = await Promise.allSettled([
        api.leagues.list(),
        api.matches.list(),
        api.brazilLeagues.list(),
      ]);

      // Processar e atualizar UI imediatamente após ligas/partidas chegarem
      let userLeagueIds: string[] = [];
      let userBrazilLeagueIds: string[] = [];

      if (leaguesRes.status === 'fulfilled' && leaguesRes.value) {
        const leaguesData = leaguesRes.value;
        const mappedLeagues: League[] = leaguesData.map((l: any) => ({
          id: l.id, name: l.name, image: l.image, description: l.description,
          leagueCode: l.league_code, adminId: l.admin_id, isPrivate: l.is_private,
          participants: l.participants || [], pendingRequests: l.pending_requests || [],
          settings: {
            ...l.settings,
            isUnlimited: l.settings?.isUnlimited === true,
            plan: l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE')
          }
        }));
        setLeagues(mappedLeagues);
        try { localStorage.setItem('cache_leagues', JSON.stringify(mappedLeagues)); } catch (e) { console.warn('cache_leagues write failed:', e); }
        userLeagueIds = mappedLeagues.map(l => l.id);
      }

      if (matchesRes.status === 'fulfilled' && matchesRes.value && matchesRes.value.length > 0) {
        const matchesData = matchesRes.value;
        const mappedMatches: Match[] = matchesData.map((m: any) => ({
          id: m.id, homeTeamId: m.home_team_id, awayTeamId: m.away_team_id,
          date: m.date, location: m.location, group: m.group, phase: m.phase,
          status: m.status, homeScore: m.home_score !== null ? Number(m.home_score) : null,
          awayScore: m.away_score !== null ? Number(m.away_score) : null
        }));
        setMatches(mappedMatches);
        try { localStorage.setItem('cache_matches', JSON.stringify(mappedMatches)); } catch (e) { console.warn('cache_matches write failed:', e); }
      }

      if (brazilLeaguesRes.status === 'fulfilled' && brazilLeaguesRes.value) {
        const brazilLeaguesData = brazilLeaguesRes.value;
        const mappedBrazilLeagues: BrazilLeague[] = brazilLeaguesData.map((l: any) => ({
          id: l.id, name: l.name, image: l.image, description: l.description,
          leagueCode: l.league_code, adminId: l.admin_id, isPrivate: l.is_private,
          participants: l.participants || [], pendingRequests: l.pending_requests || [],
          settings: {
            ...l.settings,
            exactScore: l.settings?.exactScore ?? 10,
            winnerAndDiff: l.settings?.winnerAndDiff ?? 7,
            draw: l.settings?.draw ?? 6,
            winner: l.settings?.winner ?? 5,
            goalscorer: l.settings?.goalscorer ?? 2,
            isUnlimited: l.settings?.isUnlimited === true,
            plan: l.settings?.plan || (l.settings?.isUnlimited ? 'VIP_UNLIMITED' : 'FREE')
          }
        }));
        setBrazilLeagues(mappedBrazilLeagues);
        try { localStorage.setItem('cache_brazil_leagues', JSON.stringify(mappedBrazilLeagues)); } catch (e) { console.warn('cache_brazil_leagues write failed:', e); }
        userBrazilLeagueIds = mappedBrazilLeagues.map(l => l.id);
      }

      // ─── FASE 1.5: Carregar perfis pendentes para notificações do Admin ──────
      if (currentUserRef.current) {
        const adminPendingUserIds: string[] = [];
        
        const allMappedLeagues = leaguesRes.status === 'fulfilled' ? leaguesRes.value : [];
        allMappedLeagues.forEach((l: any) => {
          if (l.admin_id === currentUserRef.current?.id && l.pending_requests?.length > 0) {
            adminPendingUserIds.push(...l.pending_requests);
          }
        });

        const allMappedBrazilLeagues = brazilLeaguesRes.status === 'fulfilled' ? brazilLeaguesRes.value : [];
        allMappedBrazilLeagues.forEach((l: any) => {
          if (l.admin_id === currentUserRef.current?.id && l.pending_requests?.length > 0) {
            adminPendingUserIds.push(...l.pending_requests);
          }
        });

        if (adminPendingUserIds.length > 0) {
          const uniqueIds = [...new Set(adminPendingUserIds)];
          try {
            const profRes = await api.profiles.getByIds(uniqueIds);
            if (profRes && profRes.length > 0) {
              const mappedUsers: User[] = profRes.map((p: any) => ({
                id: p.id, name: p.name, email: p.email, avatar: p.avatar, isAdmin: p.is_admin, isMatchAdmin: p.is_match_admin,
                whatsapp: p.whatsapp || '', notificationSettings: p.notification_settings, theme: p.theme, isPro: p.is_pro
              }));
              setUsers(prev => {
                const newUsers = [...prev];
                mappedUsers.forEach(mu => {
                  if (!newUsers.some(u => u.id === mu.id)) newUsers.push(mu);
                });
                return newUsers;
              });
            }
          } catch(e) { console.warn("Falha ao carregar perfis pendentes", e); }
        }
      }

      // ─── FASE 2: Admin — carrega apenas metadados globais necessários ─────────
      // O Admin Geral só gerencia planos de ligas e jogos.
      // Não há necessidade de baixar todos os palpites e perfis de todos os usuários.
      if (currentUserRef.current?.isAdmin || currentUserRef.current?.isMatchAdmin) {
        const globalResults = await Promise.allSettled([
          api.brazilMatchGoals.list(),
          api.brazilPlayers.list(),
          api.topFinishersResult.get(),
        ]);

        const [goalsRes, playersRes, topResRes] = globalResults;

        if (goalsRes.status === 'fulfilled' && goalsRes.value) {
          const mapped: BrazilMatchGoal[] = goalsRes.value.map((g: any) => ({ matchId: g.match_id, playerName: g.player_name, goals: g.goals }));
          setBrazilMatchGoals(mapped);
          try { localStorage.setItem('cache_brazil_goals', JSON.stringify(mapped)); } catch {}
        }
        if (playersRes.status === 'fulfilled' && playersRes.value) {
          const mapped: BrazilPlayer[] = playersRes.value.map((p: any) => ({ id: p.id, name: p.name, position: p.position, is_active: p.is_active }));
          setBrazilPlayers(mapped);
          try { localStorage.setItem('cache_brazil_players', JSON.stringify(mapped)); } catch {}
        }
        if (topResRes.status === 'fulfilled' && topResRes.value) {
          setTopFinishersResultState({
            champion: topResRes.value.champion || '', runnerUp: topResRes.value.runner_up || '',
            third: topResRes.value.third || '', fourth: topResRes.value.fourth || ''
          });
        }

        // Carregar perfis dos admins de todas as ligas para exibir nomes no gerenciamento
        // (apenas admin_id únicos — muito mais leve que carregar todos os participantes)
        try {
          const leaguesData = leaguesRes.status === 'fulfilled' ? (leaguesRes.value || []) : [];
          const brazilLeaguesData = brazilLeaguesRes.status === 'fulfilled' ? (brazilLeaguesRes.value || []) : [];
          const allAdminIds = [...new Set([
            ...leaguesData.map((l: any) => l.admin_id),
            ...brazilLeaguesData.map((l: any) => l.admin_id)
          ])].filter(Boolean);

          if (allAdminIds.length > 0) {
            const adminProfiles = await api.profiles.getByIds(allAdminIds);
            if (adminProfiles && adminProfiles.length > 0) {
              const mappedAdmins: User[] = adminProfiles.map((p: any) => ({
                id: p.id, name: p.name, email: p.email, avatar: p.avatar,
                isAdmin: p.is_admin, isMatchAdmin: p.is_match_admin,
                whatsapp: p.whatsapp || '', notificationSettings: p.notification_settings,
                theme: p.theme, isPro: p.is_pro
              }));
              setUsers(prev => {
                const merged = [...prev];
                mappedAdmins.forEach(u => { if (!merged.some(e => e.id === u.id)) merged.push(u); });
                return merged;
              });
            }
          }
        } catch(e) { console.warn('Falha ao carregar perfis de admins de ligas:', e); }

      } else {
        // Usuário Comum: Baixa apenas metadados globais se precisar no futuro
        // (topFinishersResult foi movido para carregar apenas ao abrir uma liga)
      }

      if (currentUserRef.current?.email) {
        fetchInvitations(currentUserRef.current.email);
      }

      setConnectionError(false);
      failureCountRef.current = 0;
      const syncDate = new Date();
      setLastSyncTime(syncDate);
      try { localStorage.setItem('last_sync_time', syncDate.toISOString()); } catch {}

    } catch (e: any) {
      console.error('fetchAllData unexpected error', e);
      const isAuthError = e.message?.includes('401') ||
        e.message?.toLowerCase().includes('unauthorized') ||
        e.message?.toLowerCase().includes('jwt');
      if (isAuthError) {
        console.warn('Sessão inválida detectada. Deslogando...');
        logout();
        return;
      }
      failureCountRef.current += 1;
      if (failureCountRef.current > 3 && !connectionError) setConnectionError(true);
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        setIsSyncing(false);
      }
    }
  };

  const loginGoogle = async () => {
    setLoading(true);

    // Detectar se está rodando no Capacitor (Nativo)
    const isNative = (window as any).Capacitor?.isNative;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: isNative ? 'app.palpiteiro://login-callback' : window.location.origin,
        skipBrowserRedirect: isNative, // Impede o redirecionamento automático da página atual no nativo
        queryParams: {
          access_type: 'offline',
        },
      }
    });

    if (error) {
      addNotification('Erro no Login Google', error.message, 'warning');
      setLoading(false);
      return;
    }

    // No Nativo, abrimos a URL retornada pelo Supabase via Capacitor Browser
    if (isNative && data?.url) {
      console.log("Opening native browser for Google login:", data.url);
      await Browser.open({ url: data.url });
      setLoading(false); // Liberar loading porque o browser abriu por cima
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<boolean> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) {
      addNotification('Erro ao Entrar', 'Verifique seu e-mail e senha.', 'warning');
      return false;
    }
    return true;
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, whatsapp?: string): Promise<boolean> => {
    try {
      // 1. Verificar se o e-mail já está cadastrado na tabela de perfis para dar um aviso amigável
      const existingProfile = await api.profiles.getByEmail(email).catch(() => null);
      if (existingProfile) {
        addNotification('E-mail já cadastrado', 'Este e-mail já possui uma conta. Por favor, use a opção de login.', 'warning');
        return false;
      }

      const { data, error } = await supabase.auth.signUp({
        email, password: pass, options: { data: { name, full_name: name, whatsapp: whatsapp || null } }
      });

      if (error) {
        addNotification('Erro no Cadastro', error.message, 'warning');
        return false;
      }

      // 2. Se o Supabase retornar sucesso mas sem identidades, significa que o usuário já existe no Auth
      // (Isso acontece quando o usuário já está no Auth mas não no Profiles, por exemplo)
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        addNotification('E-mail já cadastrado', 'Este e-mail já está em uso. Tente fazer login ou recuperar sua senha.', 'warning');
        return false;
      }

      // 2. Create profile immediately regardless of whether email confirmation is required.
      // data.session can be null when email confirmation is enabled, but the user IS created in Auth.
      // We must save the profile NOW so admins can find the user by email from the start.
      if (data.user) {
        const newUserDB = {
          id: data.user.id, email, name, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
          is_admin: false, whatsapp: whatsapp || null, notification_settings: { matchStart: true, matchEnd: true, predictionReminder: true }
        };
        try {
          await api.profiles.update(newUserDB);
        } catch (err) {
          console.warn('Profile creation during signup failed:', err);
        }

        if (data.session) {
          const newUser: User = { ...newUserDB, isAdmin: false, isMatchAdmin: false, whatsapp: whatsapp || '', notificationSettings: newUserDB.notification_settings, isPro: false, theme: 'light', provider: 'email' };
          setCurrentUser(newUser);
          setUsers(prev => prev.some(u => u.id === newUser.id) ? prev : [...prev, newUser]);
        }
      }

      if (!data.session) {
        addNotification('Verifique seu E-mail', 'Enviamos um link de confirmação para o seu e-mail.', 'info');
        return true;
      }

      addNotification('Bem-vindo!', 'Cadastro realizado com sucesso.', 'success');
      return true;
    } catch (err: any) {
      console.error("SignUp Error:", err);
      addNotification('Erro no Cadastro', 'Ocorreu um erro inesperado. Tente novamente.', 'warning');
      return false;
    }
  };

  const logout = async () => {
    console.log("Logout triggered.");
    try {
      // 1. Remove current FCM token from database to avoid cross-account notifications
      const activeToken = localStorage.getItem('active_fcm_token');
      if (activeToken) {
        console.log("Removing FCM token on logout...");
        await api.profiles.removeFcmToken(activeToken).catch(e => console.warn("Failed to remove FCM token", e));
      }

      // 2. Sign out from Supabase (Explicitly set to local so other devices stay logged in)
      await supabase.auth.signOut({ scope: 'local' });
    } catch (e) {
      console.warn("Sign out error", e);
    }

    // 3. Clear all local storage related to the app (including offline cache)
    const keysToRemove = ['bolao-copa-native-v1', 'app-theme', 'active_fcm_token', 'cache_matches', 'cache_predictions'];
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase.auth.token') || key.startsWith('sb-') || key.startsWith('notify_')) {
        keysToRemove.push(key);
      }
    });
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // 3. Reset state
    setCurrentUser(null);
    setLeagues([]);
    setPredictions([]);
    setInvitations([]);

    // 4. Force hard navigation to clear all memory state and go to HOME
    window.location.href = '/';
  };

  const deleteAccount = async (): Promise<boolean> => {
    if (!currentUser) return false;
    console.log("Starting account deletion process...");

    try {
      // 1. Try to delete via RPC (Hard Delete of Auth + Data)
      const { error } = await supabase.rpc('delete_own_user');

      if (error) {
        console.error("RPC Delete Error:", error);
        throw error;
      }

      addNotification('Conta Excluída', 'Sua conta foi removida com sucesso.', 'success');
      await logout();
      return true;

    } catch (e: any) {
      console.error("Delete Account Final Error", e);
      addNotification('Erro ao Excluir', e.message || 'Falha desconhecida.', 'warning');
      return false;
    }
  };

  const updateUserProfile = async (name: string, avatar: string, whatsapp: string, notificationSettings: any, themePreference: 'light' | 'dark') => {
    if (!currentUser) {
      addNotification('Erro', 'Usuário não autenticado.', 'warning');
      return;
    }

    // addNotification('Aguarde', 'Salvando perfil...', 'info', 2000); // Optional feedback

    let finalAvatar = avatar;
    if (avatar && !avatar.startsWith('http')) {
      try {
        addNotification('Processando', 'Enviando imagem...', 'info');
        finalAvatar = await uploadBase64Image(avatar, 'avatars', currentUser.avatar);
      } catch (e) {
        addNotification('Erro', 'Falha no upload da imagem.', 'warning');
        return;
      }
    }
    const updatedUser = { ...currentUser, name, avatar: finalAvatar, whatsapp, notificationSettings, theme: themePreference };

    // Optimistic update
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setTheme(themePreference);
    localStorage.setItem(`notify_${currentUser.id}`, JSON.stringify(notificationSettings));

    try {
      console.log("Sending profile update to API...");
      await api.profiles.update({
        id: currentUser.id,
        email: currentUser.email,
        name,
        avatar: finalAvatar,
        whatsapp: whatsapp.trim() || null,
        notification_settings: notificationSettings,
        theme: themePreference
      });
      console.log("Profile update success");
      addNotification('Perfil Atualizado', 'Seus dados foram salvos com sucesso.', 'success');
    } catch (e: any) {
      console.error("Failed to update profile", e);
      addNotification('Erro ao Salvar', e.message || 'Não foi possível salvar as alterações.', 'warning');
    }
  };

  const createLeague = async (name: string, isPrivate: boolean, settings: any, image: string, description: string, plan?: string): Promise<boolean> => {
    if (!currentUser) return false;

    // Check for existing league with same name
    const nameExists = leagues.some(l => l.name.toLowerCase() === name.toLowerCase().trim());
    if (nameExists) {
      addNotification('Nome Indisponível', 'Já existe uma liga com este nome. Escolha outro.', 'warning');
      return false;
    }



    try {
      let leagueCode = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < 6; i++) leagueCode += chars.charAt(Math.floor(Math.random() * chars.length));

      const newLeagueId = `l-${Date.now()}`;
      let finalImage = image || `https://api.dicebear.com/7.x/identicon/svg?seed=${newLeagueId}`;
      if (image && !image.startsWith('http')) {
        try {
          addNotification('Processando', 'Enviando logo da liga...', 'info');
          finalImage = await uploadBase64Image(image, 'leagues');
        } catch (e) {
          console.warn("Image upload failed, using default", e);
          // Optionally notify user but proceed
          addNotification('Aviso', 'Erro ao enviar imagem. Criando com imagem padrão.', 'info');
        }
      }
      const finalSettings = { ...settings, isUnlimited: false, plan: plan || 'FREE', manualScoringLock: false };
      const newLeagueApp: League = {
        id: newLeagueId, name, image: finalImage, description: description || '',
        leagueCode: leagueCode, adminId: currentUser.id, isPrivate, participants: [currentUser.id],
        pendingRequests: [], settings: finalSettings
      };

      try {
        await api.leagues.create({
          id: newLeagueId, name, image: finalImage, description: description || '',
          league_code: leagueCode, admin_id: currentUser.id, is_private: isPrivate, participants: [currentUser.id],
          pending_requests: [], settings: finalSettings
        });

        // Update state ONLY after successful API call
        setLeagues(prev => [...prev, newLeagueApp]);
        addNotification('Liga Criada', `A liga "${name}" foi criada!`, 'success');
        return true;
      } catch (err) { throw err; }
    } catch (e: any) {
      console.error("Create League Error", e);
      addNotification('Erro', 'Ocorreu um erro ao criar a liga.', 'warning');
      return false;
    }
  };

  const updateLeague = useCallback(async (leagueId: string, updates: Partial<League>) => {
    if (!currentUser) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    if (updates.participants !== undefined) dbUpdates.participants = updates.participants;
    if (updates.pendingRequests !== undefined) dbUpdates.pending_requests = updates.pendingRequests;
    if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;

    if (Object.keys(dbUpdates).length > 0) {
      try {
        await api.leagues.update(leagueId, dbUpdates);
        setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, ...updates } : l));
        addNotification('Sucesso', 'Liga atualizada.', 'success');
      } catch (e) {
        console.error("Failed to update league:", e);
        addNotification('Erro', 'Falha ao atualizar liga.', 'warning');
        throw e;
      }
    }
  }, [currentUser]);

  // --- BRAZIL MODE METHODS ---
  const createBrazilLeague = async (name: string, isPrivate: boolean, image: string, description: string, settings: any): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      let leagueCode = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < 6; i++) leagueCode += chars.charAt(Math.floor(Math.random() * chars.length));

      const newLeagueId = `bl-${Date.now()}`;
      let finalImage = image || `https://api.dicebear.com/7.x/identicon/svg?seed=${newLeagueId}`;
      if (image && !image.startsWith('http')) {
        try {
          finalImage = await uploadBase64Image(image, 'leagues');
        } catch (e) {
          console.warn("Image upload failed");
        }
      }
      
      const finalSettings = { ...settings, manualScoringLock: false };
      const newLeague: BrazilLeague = {
        id: newLeagueId, name, image: finalImage, description: description || '',
        leagueCode, adminId: currentUser.id, isPrivate, participants: [currentUser.id],
        pendingRequests: [], settings: finalSettings
      };

      await api.brazilLeagues.create({
        id: newLeagueId, name, image: finalImage, description: description || '',
        league_code: leagueCode, admin_id: currentUser.id, is_private: isPrivate,
        participants: [currentUser.id], pending_requests: [], settings: finalSettings
      });

      setBrazilLeagues(prev => [...prev, newLeague]);
      addNotification('Liga Criada', `A liga "${name}" foi criada!`, 'success');
      return true;
    } catch (e: any) {
      console.error(e);
      addNotification('Erro', `Erro: ${e.message}`, 'warning');
      return false;
    }
  };

  const updateBrazilLeague = async (id: string, updates: Partial<BrazilLeague>) => {
    if (!currentUser) return;
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.settings !== undefined) dbUpdates.settings = updates.settings;
    if (updates.participants !== undefined) dbUpdates.participants = updates.participants;
    if (updates.pendingRequests !== undefined) dbUpdates.pending_requests = updates.pendingRequests;
    if (updates.isPrivate !== undefined) dbUpdates.is_private = updates.isPrivate;

    if (Object.keys(dbUpdates).length > 0) {
      try {
        await api.brazilLeagues.update(id, dbUpdates);
        setBrazilLeagues(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
        addNotification('Sucesso', 'Liga atualizada.', 'success');
      } catch (e) {
        console.error("Failed to update Brazil league:", e);
        addNotification('Erro', 'Falha ao atualizar liga.', 'warning');
        throw e;
      }
    }
  };

  const deleteBrazilLeague = async (leagueId: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      setBrazilLeagues(prev => prev.filter(l => l.id !== leagueId));
      await api.brazilLeagues.delete(leagueId);
      addNotification('Liga Excluída', 'A liga foi removida.', 'success');
      return true;
    } catch (e) {
      addNotification('Erro', `Falha ao excluir.`, 'warning');
      return false;
    }
  };

  const joinBrazilLeague = async (leagueId: string, leagueData?: any) => {
    if (!currentUser) return;
    // Use the provided leagueData as fallback (for searched private leagues not yet in local state)
    const league = brazilLeagues.find(l => l.id === leagueId) || leagueData;
    if (!league) {
      // Last resort: just call the API directly without local validation
      try {
        await api.brazilLeagues.join(leagueId);
        addNotification('Sucesso', 'Solicitação enviada.', 'success');
      } catch (e: any) {
        addNotification('Erro', e.message || 'Falha ao entrar na liga.', 'warning');
      }
      return;
    }
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano atingido.`, 'warning'); return; }
    if (league.participants.includes(currentUser.id)) return;
    if ((league.pendingRequests || []).includes(currentUser.id)) { addNotification('Aviso', 'Solicitação já enviada.', 'info'); return; }

    const updatedLeague = { ...league };
    if (league.isPrivate) {
      updatedLeague.pendingRequests = [...(league.pendingRequests || []), currentUser.id];
    } else {
      updatedLeague.participants = [...(league.participants || []), currentUser.id];
    }
    // If league is not in local state yet (new user), ADD it. Otherwise UPDATE it.
    setBrazilLeagues(prev => {
      const exists = prev.some(l => l.id === leagueId);
      return exists ? prev.map(l => l.id === leagueId ? updatedLeague : l) : [...prev, updatedLeague];
    });
    try {
      await api.brazilLeagues.join(leagueId);
      addNotification('Sucesso', league.isPrivate ? 'Solicitação enviada.' : 'Você entrou na liga.', 'success');
    } catch (e) {
      addNotification('Erro', 'Falha ao entrar na liga.', 'warning');
    }
  };

  const approveBrazilUser = async (leagueId: string, userId: string) => {
    const league = brazilLeagues.find(l => l.id === leagueId);
    if (!league) return;
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano atingido.`, 'warning'); return; }
    const updatedPending = (league.pendingRequests || []).filter(id => id !== userId);
    const updatedParticipants = Array.from(new Set([...(league.participants || []), userId]));
    setBrazilLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
    try {
      await api.brazilLeagues.approveUser(leagueId, userId);
    } catch (e) {
      addNotification('Erro', 'Falha ao aprovar usuário.', 'warning');
    }
  };

  const rejectBrazilUser = async (leagueId: string, userId: string) => {
    const league = brazilLeagues.find(l => l.id === leagueId);
    if (!league) return;
    const updatedPending = league.pendingRequests.filter(id => id !== userId);
    setBrazilLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, pendingRequests: updatedPending } : l));
    try {
      await api.brazilLeagues.rejectUser(leagueId, userId);
    } catch (e) { }
  };

  const removeUserFromBrazilLeague = async (leagueId: string, userId: string) => {
    const league = brazilLeagues.find(l => l.id === leagueId);
    if (!league) return;
    const updatedParticipants = league.participants.filter(id => id !== userId);
    setBrazilLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, participants: updatedParticipants } : l));
    try {
      await api.brazilLeagues.removeUser(leagueId, userId);
    } catch (e) { }
  };

  const submitBrazilPredictions = async (preds: { matchId: string, home: number, away: number, playerPick: string }[], leagueId: string) => {
    if (!currentUser) return false;
    setBrazilPredictions(prev => {
      let newPreds = [...prev];
      preds.forEach(p => {
        newPreds = newPreds.filter(existing => !(existing.matchId === p.matchId && existing.leagueId === leagueId && existing.userId === currentUser.id));
        newPreds.push({ userId: currentUser.id, matchId: p.matchId, leagueId, homeScore: p.home, awayScore: p.away, playerPick: p.playerPick, points: 0, goalscorerPoints: 0 });
      });
      return newPreds;
    });
    try {
      const dbPayload = preds.map(p => ({
        user_id: currentUser.id, match_id: p.matchId, league_id: leagueId,
        home_score: p.home, away_score: p.away, player_pick: p.playerPick || null
      }));
      await api.brazilPredictions.submit(dbPayload);
      return true;
    } catch (e) {
      addNotification('Erro', 'Falha ao salvar palpites.', 'warning');
      return false;
    }
  };

  const addBrazilMatchGoal = async (matchId: string, playerName: string, goals: number) => {
    try {
      // 1. Save/remove the goal record in DB
      if (goals > 0) {
        setBrazilMatchGoals(prev => {
          const filtered = prev.filter(g => !(g.matchId === matchId && g.playerName === playerName));
          return [...filtered, { matchId, playerName, goals }];
        });
        await api.brazilMatchGoals.add(matchId, playerName, goals);
      } else {
        setBrazilMatchGoals(prev => prev.filter(g => !(g.matchId === matchId && g.playerName === playerName)));
        await api.brazilMatchGoals.remove(matchId, playerName);
      }

      // 2. Get the updated full goals list for this match (including the just-changed player)
      const allGoalsForMatch = brazilMatchGoals
        .filter(g => g.matchId === matchId && g.playerName !== playerName);
      if (goals > 0) allGoalsForMatch.push({ matchId, playerName, goals });

      // 3. Get all predictions for this match
      const matchPredictions = brazilPredictions.filter(p => p.matchId === matchId);
      if (matchPredictions.length === 0) return true;

      // 4. For each prediction, calculate goalscorerPoints across ALL leagues
      //    Points = goals scored by the picked player × league.settings.goalscorer
      const updatedDbRows: any[] = [];
      const updatedLocalPreds: BrazilPrediction[] = [];

      matchPredictions.forEach(pred => {
        const league = brazilLeagues.find(l => l.id === pred.leagueId);
        const pointsPerGoal = Number(league?.settings?.goalscorer ?? 2);
        const goalRecord = allGoalsForMatch.find(g => g.playerName === pred.playerPick);
        const goalscorerPoints = goalRecord ? (goalRecord.goals > 0 ? pointsPerGoal + (goalRecord.goals - 1) : 0) : 0;

        updatedLocalPreds.push({ ...pred, goalscorerPoints });
        updatedDbRows.push({
          user_id: pred.userId,
          match_id: pred.matchId,
          league_id: pred.leagueId,
          home_score: pred.homeScore,
          away_score: pred.awayScore,
          player_pick: pred.playerPick || null,
          goalscorer_points: goalscorerPoints,
        });
      });

      // 5. Update local state for immediate UI reactivity
      // We don't need to call api.brazilPredictions.submit because the DB Trigger 
      // 'on_brazil_goals_change' already handles the recalculation safely on the server.
      setBrazilPredictions(prev => {
        const unchanged = prev.filter(p => p.matchId !== matchId);
        return [...unchanged, ...updatedLocalPreds];
      });

      return true;
    } catch (e) {
      console.error('addBrazilMatchGoal error:', e);
      addNotification('Erro', 'Falha ao salvar gols.', 'warning');
      return false;
    }
  };

  const submitTopFinisherPrediction = async (leagueId: string, champion: string, runnerUp: string, third: string, fourth: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      const pred: TopFinisherPrediction = { userId: currentUser.id, leagueId, champion, runnerUp, third, fourth };
      setTopFinisherPredictions(prev => {
        const filtered = prev.filter(p => !(p.userId === currentUser.id && p.leagueId === leagueId));
        return [...filtered, pred];
      });
      await api.topFinisherPredictions.upsert({
        user_id: currentUser.id, league_id: leagueId,
        champion, runner_up: runnerUp, third, fourth
      });
      addNotification('Palpite Salvo!', 'Seu palpite dos 4 primeiros colocados foi salvo.', 'success');
      return true;
    } catch (e: any) {
      console.error('submitTopFinisherPrediction error:', e);
      const msg = e?.message || e?.error_description || JSON.stringify(e);
      addNotification('Erro ao salvar palpite', msg, 'warning');
      return false;
    }
  };

  const setTopFinishersResult = async (champion: string, runnerUp: string, third: string, fourth: string): Promise<boolean> => {
    if (!currentUser?.isAdmin && !currentUser?.isMatchAdmin) return false;
    try {
      const result: TopFinishersResult = { champion, runnerUp, third, fourth };
      setTopFinishersResultState(result);
      await api.topFinishersResult.upsert({ champion, runner_up: runnerUp, third, fourth });
      addNotification('Resultado Salvo!', 'Os 4 primeiros colocados foram registrados com sucesso.', 'success');
      return true;
    } catch (e) {
      console.error('setTopFinishersResult error:', e);
      addNotification('Erro', 'Falha ao salvar resultado.', 'warning');
      return false;
    }
  };



  // -------------------------

  const deleteLeague = async (leagueId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const league = leagues.find(l => l.id === leagueId);
    if (league && league.adminId !== currentUser.id && !currentUser.isAdmin) return false;
    try {
      setLeagues(prev => prev.filter(l => l.id !== leagueId));
      await api.leagues.delete(leagueId);
      addNotification('Liga Excluída', 'A liga foi removida.', 'success');
      return true;
    } catch (e) {
      addNotification('Erro', `Falha ao excluir.`, 'warning');
      return false;
    }
  };

  const joinLeague = async (leagueId: string, leagueData?: any) => {
    if (!currentUser) return;
    // Use the provided leagueData as fallback (for searched private leagues not yet in local state)
    const league = leagues.find(l => l.id === leagueId) || leagueData;
    if (!league) {
      // Last resort: just call the API directly without local validation
      try {
        await api.leagues.join(leagueId);
        addNotification('Sucesso', 'Solicitação enviada.', 'success');
      } catch (e: any) {
        addNotification('Erro', e.message || 'Falha ao entrar na liga.', 'warning');
      }
      return;
    }
    if (league.participants.includes(currentUser.id)) { addNotification('Aviso', 'Você já participa desta liga.', 'info'); return; }
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Liga Cheia', 'O limite de participantes foi atingido.', 'warning'); return; }

    let updatedLeague = { ...league };
    if (league.isPrivate) {
      if (!(league.pendingRequests || []).includes(currentUser.id)) updatedLeague.pendingRequests = [...(league.pendingRequests || []), currentUser.id];
      else { addNotification('Aviso', 'Solicitação já enviada.', 'info'); return; }
    } else {
      updatedLeague.participants = [...league.participants, currentUser.id];
    }
    // If league is not in local state yet (new user), ADD it. Otherwise UPDATE it.
    setLeagues(prev => {
      const exists = prev.some(l => l.id === leagueId);
      return exists ? prev.map(l => l.id === leagueId ? updatedLeague : l) : [...prev, updatedLeague];
    });
    try {
      await api.leagues.join(leagueId);
      addNotification('Sucesso', league.isPrivate ? 'Solicitação enviada.' : 'Você entrou na liga.', 'success');
    } catch (e: any) {
      addNotification('Erro', e.message || 'Falha ao entrar na liga.', 'warning');
    }
  };

  const approveUser = async (leagueId: string, userId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return;
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano atingido.`, 'warning'); return; }
    const updatedPending = league.pendingRequests.filter(id => id !== userId);
    const updatedParticipants = Array.from(new Set([...league.participants, userId]));
    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
    try {
      await api.leagues.approveUser(leagueId, userId);
    } catch (e) {
      addNotification('Erro', 'Falha ao aprovar usuário.', 'warning');
    }
  };

  const rejectUser = async (leagueId: string, userId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return;
    const updatedPending = league.pendingRequests.filter(id => id !== userId);
    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, pendingRequests: updatedPending } : l));
    try {
      await api.leagues.rejectUser(leagueId, userId);
    } catch (e) {
      addNotification('Erro', 'Falha ao rejeitar usuário.', 'warning');
    }
  };

  const removeUserFromLeague = async (leagueId: string, userId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return;
    const updatedParticipants = league.participants.filter(id => id !== userId);
    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, participants: updatedParticipants } : l));
    try {
      await api.leagues.removeUser(leagueId, userId);
      addNotification('Removido', 'Usuário removido da liga.', 'info');
    } catch (e) { }
  };

  const sendLeagueInvite = async (leagueId: string, email: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return false;
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano atingido.`, 'warning'); return false; }
    const emailNormalized = email.toLowerCase().trim();
    try {
      await api.leagues.invite(leagueId, emailNormalized);
      addNotification('Sucesso', 'Convite enviado.', 'success');
      return true;
    } catch (e: any) {
      addNotification('Erro', e.message || 'Falha ao enviar convite.', 'warning');
      return false;
    }
  };

  const sendBrazilLeagueInvite = async (leagueId: string, email: string) => {
    const league = brazilLeagues.find(l => l.id === leagueId);
    if (!league) return false;
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano atingido.`, 'warning'); return false; }
    const emailNormalized = email.toLowerCase().trim();
    try {
      await api.brazilLeagues.invite(leagueId, emailNormalized);
      addNotification('Sucesso', 'Convite enviado.', 'success');
      return true;
    } catch (e: any) {
      addNotification('Erro', e.message || 'Falha ao enviar convite.', 'warning');
      return false;
    }
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    if (!currentUser) return;
    const invite = invitations.find(i => i.id === inviteId);
    if (!invite) return;
    let optimisticNotificationShown = false;
    if (accept) {
      if (invite.leagueType === 'brazil') {
        const league = brazilLeagues.find(l => l.id === invite.leagueId);
        if (league) {
          if (league.participants.includes(currentUser.id)) {
            addNotification('Aviso', 'Você já participa desta liga.', 'info');
            optimisticNotificationShown = true;
          } else {
            const updatedParticipants = [...league.participants, currentUser.id];
            const updatedPending = (league.pendingRequests || []).filter(uid => uid !== currentUser.id);
            setBrazilLeagues(prev => prev.map(l => l.id === league.id ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
            addNotification('Sucesso', `Bem-vindo à liga ${league.name}!`, 'success');
            optimisticNotificationShown = true;
          }
        }
      } else {
        const league = leagues.find(l => l.id === invite.leagueId);
        if (league) {
          if (league.participants.includes(currentUser.id)) {
            addNotification('Aviso', 'Você já participa desta liga.', 'info');
            optimisticNotificationShown = true;
          } else {
            const updatedParticipants = [...league.participants, currentUser.id];
            const updatedPending = (league.pendingRequests || []).filter(uid => uid !== currentUser.id);
            setLeagues(prev => prev.map(l => l.id === league.id ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
            addNotification('Sucesso', `Bem-vindo à liga ${league.name}!`, 'success');
            optimisticNotificationShown = true;
          }
        }
      }
    }
    setInvitations(prev => prev.filter(i => i.id !== inviteId));
    try {
      await api.leagues.respondInvite(inviteId, accept);
      if (accept) {
        await fetchAllData(false);
        if (!optimisticNotificationShown) {
          addNotification('Sucesso', `Bem-vindo à liga ${invite.league_name || ''}!`, 'success');
        }
      }
    } catch (e) {
      addNotification('Erro', 'Falha ao responder convite.', 'warning');
      if (currentUser?.email) fetchInvitations(currentUser.email);
    }
  };

  const updateMatch = async (updatedMatch: Match): Promise<boolean> => {
    const previousMatches = [...matches];
    setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    try {
      const dbPayload = {
        id: updatedMatch.id, home_team_id: updatedMatch.homeTeamId, away_team_id: updatedMatch.awayTeamId,
        date: updatedMatch.date, location: updatedMatch.location, group: updatedMatch.group || null,
        phase: updatedMatch.phase, status: updatedMatch.status, home_score: updatedMatch.homeScore, away_score: updatedMatch.awayScore
      };
      await api.matches.update(dbPayload);
      return true;
    } catch (e) {
      addNotification('Erro', 'Falha ao atualizar a partida.', 'warning');
      setMatches(previousMatches);
      return false;
    }
  };

  const submitPredictions = async (predictionsToSubmit: { matchId: string, home: number, away: number }[], leagueId: string) => {
    if (!currentUser) return false;
    setPredictions(prev => {
      let newPreds = [...prev];
      predictionsToSubmit.forEach(p => {
        newPreds = newPreds.filter(existing => !(existing.matchId === p.matchId && existing.leagueId === leagueId && existing.userId === currentUser.id));
        newPreds.push({ userId: currentUser.id, matchId: p.matchId, leagueId, homeScore: p.home, awayScore: p.away, points: 0 });
      });
      return newPreds;
    });
    try {
      const dbPayload = predictionsToSubmit.map(p => ({ user_id: currentUser.id, match_id: p.matchId, league_id: leagueId, home_score: p.home, away_score: p.away }));
      await api.predictions.submit(dbPayload);
      // Notification handled by caller
      return true;
    } catch (e) {
      addNotification('Erro', 'Falha ao salvar palpites.', 'warning');
      return false;
    }
  };

  const submitPrediction = async (matchId: string, leagueId: string, home: number, away: number) => {
    await submitPredictions([{ matchId, home, away }], leagueId);
  };

  const simulateMatchResult = (matchId: string, home: number, away: number) => {
    const match = matches.find(m => m.id === matchId);
    if (match) updateMatch({ ...match, homeScore: home, awayScore: away, status: MatchStatus.FINISHED });
  };

  const syncInitialMatches = async () => { };

  const refreshPredictions = async () => {
    if (isRefreshingPredictions) return;
    setIsRefreshingPredictions(true);
    try {
      const uid = currentUser?.id;
      if (!uid) return;

      // Limpa o cache em memória de palpites de jogos para forçar re-fetch nos modais
      if (matchPredsCache?.current) matchPredsCache.current = {};

      const userLeagueIds = leagues.filter(l => l.participants.includes(uid)).map(l => l.id);
      if (userLeagueIds.length > 0) {
        // Baixa APENAS os palpites do próprio usuário (muito mais leve)
        const predsData = await api.predictions.list(userLeagueIds, uid);
        if (predsData) {
          const mappedPreds: Prediction[] = predsData.map((p: any) => ({
            userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
            homeScore: Number(p.home_score), awayScore: Number(p.away_score),
            points: p.points ? Number(p.points) : 0
          }));
          // Mantém palpites de outros usuários carregados via modal, substitui apenas os do próprio usuário
          setPredictions(prev => {
            const others = prev.filter(p => p.userId !== uid);
            return [...others, ...mappedPreds];
          });
        }
      }
      
      const userBrLeagueIds = brazilLeagues.filter(l => l.participants.includes(uid)).map(l => l.id);
      if (userBrLeagueIds.length > 0) {
        const brPredsData = await api.brazilPredictions.list(userBrLeagueIds, uid);
        if (brPredsData) {
          const mappedBrPreds: BrazilPrediction[] = brPredsData.map((p: any) => ({
            userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
            homeScore: Number(p.home_score), awayScore: Number(p.away_score),
            playerPick: p.player_pick,
            points: p.points ? Number(p.points) : 0,
            goalscorerPoints: p.goalscorer_points ? Number(p.goalscorer_points) : 0
          }));
          setBrazilPredictions(prev => {
            const others = prev.filter(p => p.userId !== uid);
            return [...others, ...mappedBrPreds];
          });
        }
      }

      addNotification('Atualizado', 'Palpites sincronizados com sucesso.', 'success');
    } catch (e) {
      console.error("Refresh Preds Error", e);
    } finally {
      setIsRefreshingPredictions(false);
    }
  };

  const loadLeagueData = async (leagueId: string, leagueType: 'standard' | 'brazil' = 'standard', forceRefresh: boolean = false) => {
    const cacheKey = `${leagueType}_${leagueId}`;

    if (!forceRefresh && activeFetchesRef.current[cacheKey]) {
      return activeFetchesRef.current[cacheKey]; // Aguarda a chamada que já está em andamento (resolve o bug do Strict Mode / Race condition)
    }
    
    const fetchPromise = (async () => {
      try {
        // Carrega o Top 4 Resultado Oficial na primeira vez que abre qualquer liga
        if (topFinishersResult === null) {
          api.topFinishersResult.get().then(topRes => {
            if (topRes) {
              setTopFinishersResultState({
                champion: topRes.champion || '', runnerUp: topRes.runner_up || '',
                third: topRes.third || '', fourth: topRes.fourth || ''
              });
            }
          }).catch(()=>{});
        }

        const isBrazil = leagueType === 'brazil';

      // Always fetch fresh league data from the server to get latest pending_requests and participants
      let freshLeague: any = null;
      try {
        freshLeague = isBrazil
          ? await api.brazilLeagues.getById(leagueId)
          : await api.leagues.getById(leagueId);
        if (freshLeague) {
          if (isBrazil) {
            setBrazilLeagues(prev => prev.map(l => l.id === leagueId ? {
              ...l,
              participants: freshLeague.participants || l.participants,
              pendingRequests: freshLeague.pending_requests || l.pendingRequests,
            } : l));
          } else {
            setLeagues(prev => prev.map(l => l.id === leagueId ? {
              ...l,
              participants: freshLeague.participants || l.participants,
              pendingRequests: freshLeague.pending_requests || l.pendingRequests,
            } : l));
          }
        }
      } catch (e) {
        console.warn('Could not refresh league data:', e);
      }
      
      const league = freshLeague || (isBrazil 
        ? brazilLeagues.find(l => l.id === leagueId)
        : leagues.find(l => l.id === leagueId));
        
      const participantIds = league ? [
        ...(league.participants || []),
        ...(league.pendingRequests || league.pending_requests || [])
      ] : [];

      // LAZY LOADING: Só baixa palpites do PRÓPRIO usuário ao entrar na liga.
      // Palpites de outros participantes são carregados sob demanda ao abrir o modal.
      const currentUserId = currentUserRef.current?.id;
      const predsPromise = currentUserId
        ? (isBrazil
            ? api.brazilPredictions.list(leagueId, currentUserId)
            : api.predictions.list(leagueId, currentUserId))
        : Promise.resolve([]);

      const [predsRes, profilesRes, topRes, playersRes, goalsRes, matchesRes] = await Promise.all([
        predsPromise,
        participantIds.length > 0 ? api.profiles.getByIds(participantIds) : Promise.resolve([]),
        api.topFinisherPredictions.list(leagueId, currentUserId),
        isBrazil ? api.brazilPlayers.list() : Promise.resolve([]),
        isBrazil ? api.brazilMatchGoals.list() : Promise.resolve([]),
        api.matches.list()
      ]);

      // (Sem cache incremental de matchIds — agora carregamos apenas os próprios palpites)

      if (isBrazil) {
        const mappedBrPreds: BrazilPrediction[] = (predsRes || []).map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          playerPick: p.player_pick,
          points: p.points ? Number(p.points) : 0,
          goalscorerPoints: p.goalscorer_points ? Number(p.goalscorer_points) : 0
        }));
        setBrazilPredictions(prev => {
          // Mantém palpites de outras ligas e de outros usuários já carregados nessa liga
          const others = prev.filter(p => !(p.leagueId === leagueId && p.userId === currentUserId));
          return [...others, ...mappedBrPreds];
        });
      } else {
        const mappedPreds: Prediction[] = (predsRes || []).map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          points: p.points ? Number(p.points) : 0
        }));
        setPredictions(prev => {
          // Mantém palpites de outras ligas e de outros usuários já carregados nessa liga
          const others = prev.filter(p => !(p.leagueId === leagueId && p.userId === currentUserId));
          return [...others, ...mappedPreds];
        });
      }

      const mappedTopPreds: TopFinisherPrediction[] = (topRes || []).map((p: any) => ({
        userId: p.user_id, leagueId: p.league_id,
        champion: p.champion || '', runnerUp: p.runner_up || '',
        third: p.third || '', fourth: p.fourth || ''
      }));
      setTopFinisherPredictions(prev => {
         const others = prev.filter(p => p.leagueId !== leagueId);
         return [...others, ...mappedTopPreds];
      });

      if (profilesRes && profilesRes.length > 0) {
        const mappedUsers: User[] = profilesRes.map((p: any) => ({
          id: p.id, name: p.name, email: p.email, avatar: p.avatar, isAdmin: p.is_admin, isMatchAdmin: p.is_match_admin,
          whatsapp: p.whatsapp || '', notificationSettings: p.notification_settings, theme: p.theme, isPro: p.is_pro
        }));
        setUsers(prev => {
          const prevMap = new Map(prev.map(u => [u.id, u]));
          mappedUsers.forEach(u => prevMap.set(u.id, u));
          return Array.from(prevMap.values());
        });
      }

      if (isBrazil) {
        if (playersRes && playersRes.length > 0) {
          const mapped: BrazilPlayer[] = playersRes.map((p: any) => ({ id: p.id, name: p.name, position: p.position, is_active: p.is_active }));
          setBrazilPlayers(mapped);
        }

        if (goalsRes && goalsRes.length > 0) {
          const mapped: BrazilMatchGoal[] = goalsRes.map((g: any) => ({ matchId: g.match_id, playerName: g.player_name, goals: g.goals }));
          setBrazilMatchGoals(mapped);
        }
      }

      if (matchesRes && matchesRes.length > 0) {
        const mappedMatches: Match[] = matchesRes.map((m: any) => ({
          id: m.id, homeTeamId: m.home_team_id, awayTeamId: m.away_team_id,
          date: m.date, location: m.location, group: m.group, phase: m.phase,
          status: m.status, homeScore: m.home_score !== null ? Number(m.home_score) : null,
          awayScore: m.away_score !== null ? Number(m.away_score) : null
        }));
        setMatches(mappedMatches);
        // Also update localStorage cache so future renders don't use stale status
        try { localStorage.setItem('cache_matches', JSON.stringify(mappedMatches)); } catch (e) { console.warn('cache_matches write failed:', e); }
      }
      
      lastFetchedLeaguesRef.current[cacheKey] = Date.now(); // Marca como carregado apenas após sucesso
    } catch (e) {
      console.error("Error loading league data:", e);
    } finally {
      delete activeFetchesRef.current[cacheKey]; // Limpa a promise ativa
    }
  })();
  
  activeFetchesRef.current[cacheKey] = fetchPromise;
  return fetchPromise;
};

  // === LAZY LOADING: Palpites de um jogo específico sob demanda ===
  // Cache em memória por sessão para evitar re-fetches desnecessários.
  const matchPredsCache = useRef<Record<string, any[]>>({});

  const fetchMatchPredictions = async (matchId: string, leagueId: string, leagueType: 'standard' | 'brazil'): Promise<any[]> => {
    const cacheKey = `${leagueType}_${leagueId}_${matchId}`;
    if (matchPredsCache.current[cacheKey]) {
      return matchPredsCache.current[cacheKey];
    }

    try {
      let preds: any[];
      if (leagueType === 'brazil') {
        preds = await api.brazilPredictions.list(leagueId, undefined, [matchId]);
        const mappedPreds: BrazilPrediction[] = preds.map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          playerPick: p.player_pick,
          points: p.points ? Number(p.points) : 0,
          goalscorerPoints: p.goalscorer_points ? Number(p.goalscorer_points) : 0
        }));
        // Merges into global state without replacing own user's data
        setBrazilPredictions(prev => {
          const others = prev.filter(p => !(p.matchId === matchId && p.leagueId === leagueId));
          return [...others, ...mappedPreds];
        });
        matchPredsCache.current[cacheKey] = mappedPreds;
        return mappedPreds;
      } else {
        preds = await api.predictions.list(leagueId, undefined, [matchId]);
        const mappedPreds: Prediction[] = preds.map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          points: p.points ? Number(p.points) : 0
        }));
        // Merges into global state without replacing own user's data
        setPredictions(prev => {
          const others = prev.filter(p => !(p.matchId === matchId && p.leagueId === leagueId));
          return [...others, ...mappedPreds];
        });
        matchPredsCache.current[cacheKey] = mappedPreds;
        return mappedPreds;
      }
    } catch (e) {
      console.error('[fetchMatchPredictions] Error:', e);
      return [];
    }
  };

  const fetchLeagueTopFinisherPredictions = async (leagueId: string): Promise<any[]> => {
    try {
      const preds = await api.topFinisherPredictions.list(leagueId);
      const mappedTopPreds: TopFinisherPrediction[] = (preds || []).map((p: any) => ({
        userId: p.user_id, leagueId: p.league_id,
        champion: p.champion || '', runnerUp: p.runner_up || '',
        third: p.third || '', fourth: p.fourth || ''
      }));
      setTopFinisherPredictions(prev => {
        const others = prev.filter(p => p.leagueId !== leagueId);
        return [...others, ...mappedTopPreds];
      });
      return mappedTopPreds;
    } catch (e) {
      console.error('[fetchLeagueTopFinisherPredictions] Error:', e);
      return [];
    }
  };

  // Refreshes the current user's profile from DB (including isPro).
  // Called after a purchase or restore so the UI immediately reflects the new Pro status.
  const refreshCurrentUser = async (): Promise<void> => {
    const user = currentUserRef.current;
    if (!user) return;
    try {
      const data = await api.profiles.get(user.id).catch(() => null);
      if (data) {
        const updatedUser: User = {
          ...user,
          name: data.name || user.name,
          email: data.email || user.email,
          avatar: (data.avatar && data.avatar.trim() !== '') ? data.avatar : user.avatar,
          isAdmin: data.is_admin === true,
          isMatchAdmin: data.is_match_admin === true,
          whatsapp: data.whatsapp || '',
          notificationSettings: data.notification_settings || user.notificationSettings,
          theme: data.theme || user.theme,
          isPro: data.is_pro === true,
        };
        setCurrentUser(updatedUser);
        currentUserRef.current = updatedUser;
        try { localStorage.setItem('cache_is_pro', String(!!data.is_pro)); } catch {}
      }
    } catch (e) {
      console.warn('refreshCurrentUser failed:', e);
    }
  };

  return (
    <AppContext.Provider value={{
      currentUser, users, matches, leagues, predictions, currentTime, notifications, loading, isSyncing, invitations,
      brazilLeagues, brazilPredictions, brazilMatchGoals, brazilPlayers,
      setCurrentTime, loginGoogle, signInWithEmail, signUpWithEmail, logout, createLeague, updateLeague, joinLeague, deleteLeague, approveUser, rejectUser, deleteAccount,
      removeUserFromLeague, submitPrediction, submitPredictions, simulateMatchResult, updateMatch, removeNotification, updateUserProfile, syncInitialMatches,
      sendLeagueInvite, respondToInvite, theme, toggleTheme, connectionError, retryConnection, addNotification, refreshPredictions, isRefreshingPredictions,
      refreshAllData: async () => { await fetchAllData(false); await refreshCurrentUser(); },
      refreshCurrentUser,
      isRecoveryMode, lastSyncTime,
      createBrazilLeague, updateBrazilLeague, joinBrazilLeague, deleteBrazilLeague, approveBrazilUser, rejectBrazilUser, removeUserFromBrazilLeague, submitBrazilPredictions, addBrazilMatchGoal, sendBrazilLeagueInvite,
      topFinisherPredictions, topFinishersResult, submitTopFinisherPrediction, setTopFinishersResult, loadLeagueData,
      fetchMatchPredictions, fetchLeagueTopFinisherPredictions,
      hasWatchedPredictionAd, setHasWatchedPredictionAd
    }}>
      {children}
    </AppContext.Provider>
  );
};

const CapacitorBackButtonHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationRef = useRef(location);

  // Update ref whenever location changes
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  useEffect(() => {
    let backListener: any;

    const setupListener = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');

        // Remove any previous listener just in case
        if (backListener) await backListener.remove();

        backListener = await CapApp.addListener('backButton', () => {
          const path = window.location.pathname;

          console.log('Native Back Pressed. Current path:', path);

          // Usa preventDefault() para que componentes possam interceptar o evento nativamente
          const event = new CustomEvent('appBackButton', { cancelable: true });
          const notCanceled = window.dispatchEvent(event);

          if (!notCanceled) {
            console.log('Back button intercepted by a component via preventDefault');
            return;
          }

          // Se estiver na raiz ou na home, sai do app
          // Adicionamos check para paths vazios ou index.html que podem ocorrer no APK
          if (path === '/' || path === '/home' || path === '' || path.endsWith('index.html')) {
            CapApp.exitApp();
          } else {
            // Para qualquer outra rota dinâmica (leagues, profile, admin), ele volta no histórico
            window.history.back();
          }
        });
      } catch (e) {
        console.error('Error setting up Capacitor backButton listener:', e);
      }
    };

    setupListener();

    return () => {
      if (backListener) backListener.remove();
    };
  }, [navigate]);

  return null;
};

const OfflineRedirect: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { connectionError } = useStore();
  const location = useLocation();
  
  if (connectionError && location.pathname !== '/' && location.pathname !== '/table' && location.pathname !== '/login') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, loading, connectionError, retryConnection, isRecoveryMode } = useStore();

  if (loading) {
    return <AppLoading />;
  }

  return (
    <BrowserRouter>
      <CapacitorBackButtonHandler />
      <Layout>
        <OfflineRedirect>
          <Routes>
            <Route path="/" element={isRecoveryMode ? <Navigate to="/reset-password" /> : <Home />} />
            <Route path="/table" element={isRecoveryMode ? <Navigate to="/reset-password" /> : <TablePage />} />
            <Route path="/leagues" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <LeaguesPage /> : <Navigate to="/" />)} />
            <Route path="/league/:id" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <LeagueDetails /> : <Navigate to="/" />)} />
            <Route path="/brazil-games" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <BrazilGamesPage /> : <Navigate to="/" />)} />
            <Route path="/brazil-league/:id" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <BrazilLeagueDetails /> : <Navigate to="/" />)} />
            <Route path="/simulador" element={currentUser ? <SimulatePage /> : <Navigate to="/" />} />
            <Route path="/como-jogar" element={<HowToPlay />} />
            <Route path="/bolao-copa-2026" element={<SEOLanding variant="bolao" />} />
            <Route path="/simulador-copa-2026" element={<SEOLanding variant="simulador" />} />
            <Route path="/tabela-copa-2026" element={<SEOLanding variant="tabela" />} />
            <Route path="/bolao-jogos-do-brasil" element={<SEOLanding variant="brazil" />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route path="/exclusao-conta" element={<AccountDeletionPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/profile" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <ProfilePage /> : <Navigate to="/" />)} />
            <Route path="/seja-pro" element={currentUser ? <ProPage /> : <Navigate to="/login" />} />

            <Route path="/admin" element={isRecoveryMode ? <Navigate to="/reset-password" /> : <AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/admin/leagues" element={<AdminRoute><AdminLeaguesPage /></AdminRoute>} />
            <Route path="/admin/brazil-leagues" element={<AdminRoute><AdminBrazilLeaguesPage /></AdminRoute>} />
            <Route path="/admin/matches" element={<AdminRoute><AdminMatchesPage /></AdminRoute>} />

            <Route path="/auth/callback" element={<ConfirmacaoCadastro />} />
            <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </OfflineRedirect>
      </Layout>
    </BrowserRouter>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;