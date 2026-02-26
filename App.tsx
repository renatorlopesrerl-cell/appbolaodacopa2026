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
import { AdminMatchesPage } from './pages/AdminMatchesPage';
import { HowToPlay } from './pages/HowToPlay';
import { Login } from './pages/Login';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ConfirmacaoCadastro } from './pages/ConfirmacaoCadastro';



// Services
import { supabase } from './services/supabase'; // Auth Only
import { api } from './services/api';
import { uploadBase64Image } from './services/storageService';
import { setupPushNotifications, scheduleMatchReminder } from './services/pushService';

// Types
import { User, Match, League, Prediction, Invitation, MatchStatus } from './types';

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
  invitations: Invitation[];
  currentTime: Date;
  notifications: AppNotification[];
  loading: boolean;
  theme: 'light' | 'dark';
  setCurrentTime: (date: Date) => void;
  loginGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<boolean>;
  signUpWithEmail: (email: string, pass: string, name: string, whatsapp?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  createLeague: (name: string, isPrivate: boolean, settings: any, image: string, description: string, plan?: string) => Promise<boolean>;
  updateLeague: (id: string, updates: Partial<League>) => Promise<void>;
  joinLeague: (leagueId: string) => Promise<void>;
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
  respondToInvite: (inviteId: string, accept: boolean) => Promise<void>;
  toggleTheme: () => void;
  connectionError: boolean;
  retryConnection: () => void;
  addNotification: (title: string, message: string, type: 'success' | 'info' | 'warning', duration?: number) => void;
  refreshPredictions: () => Promise<void>;
  refreshAllData: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
  isRecoveryMode: boolean;
}

const AppContext = createContext<AppState | null>(null);

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useStore must be used within AppProvider");
  return context;
};

// Helper: League Limit
export const getLeagueLimit = (league: League): number => {
  if (league.settings?.isUnlimited) return Infinity;
  const plan = league.settings?.plan || 'FREE';
  switch (plan) {
    case 'VIP_UNLIMITED': return Infinity;
    case 'VIP_MASTER': return 200;
    case 'VIP': return 100;
    case 'VIP_BASIC': return 50;
    case 'FREE':
    default: return 5;
  }
};

// --- ERROR BOUNDARY ---
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
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
  if (!currentUser.isAdmin) {
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>(INITIAL_MATCHES);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
    return () => clearInterval(interval);
  }, []);

  // --- PREDICTION REMINDER SCHEDULER ---
  useEffect(() => {
    // Clear any existing timeouts if re-running (not easily possible with anonymous timeouts, 
    // but calculating fresh is fine if we check "already notified" or just standard behavior.
    // Ideally we track timeouts in a ref, but for simplicity/performance in this specific constraint:
    // We will just run this logic. Note: Setting many timeouts is cheap.
    // To prevent dupes, we can check if the time is VERY close to the trigger point?
    // Or just let the timeout fire. The timeout callback will check the condition (prediction exists) AT THAT MOMENT.

    if (!currentUser?.notificationSettings?.predictionReminder) return;

    const timers: NodeJS.Timeout[] = [];
    const now = new Date().getTime();

    matches.forEach(match => {
      if (match.status !== MatchStatus.SCHEDULED) return;

      const matchTime = new Date(match.date).getTime();
      // Notify 30 minutes before
      const notifyTime = matchTime - (30 * 60 * 1000);
      const timeUntilNotify = notifyTime - now;

      // Only schedule if it's in the future (and reasonable time, e.g. < 24h)
      if (timeUntilNotify > 0 && timeUntilNotify < 24 * 60 * 60 * 1000) {
        // Native: Schedule Local Notification (Android/iOS)
        const hasPrediction = predictions.some(p => p.matchId === match.id && p.userId === currentUser.id);
        if (!hasPrediction) {
          scheduleMatchReminder(match.id, `${match.homeTeamId} x ${match.awayTeamId}`, match.date).catch(() => { });
        }

        // Web/App open: Existing Timeout logic (Already in UI)
        const timer = setTimeout(() => {
          const stillNoPrediction = predictions.some(p => p.matchId === match.id && p.userId === currentUser.id);
          if (!stillNoPrediction) {
            addNotification('Lembrete ⏳', `Faltam 30 min para encerrar palpites de: ${match.homeTeamId} x ${match.awayTeamId}`, 'warning');
          }
        }, timeUntilNotify);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [matches, predictions, currentUser]); // Re-schedules if any data changes, which ensures correctness.
  useEffect(() => {
    mountedRef.current = true;

    const initAuth = async () => {
      try {
        setLoading(true);
        console.log("Initializing Auth...");

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
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
            whatsapp: metadata.whatsapp || '',
            notificationSettings: { matchStart: true, matchEnd: true },
            isPro: metadata.is_pro || false,
            provider
          };

          setCurrentUser(basicUser);
          currentUserRef.current = basicUser;

          // Background sync (don't block UI)
          fetchUserProfile(user.id, user.email || '', basicUser.avatar, basicUser.name, basicUser.whatsapp || '', provider);
          fetchAllData();

          setupPushNotifications(user.id).catch(e => console.error("Push Setup Error:", e));
        }
      } catch (err: any) {
        console.warn("Init Auth Error:", err.message);
      } finally {
        if (mountedRef.current) setLoading(false);
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
        }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
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
    try {
      const data = await api.leagues.listInvites(email);
      if (data) {
        const mappedInvites: Invitation[] = data.map((i: any) => ({
          id: i.id, leagueId: i.league_id, email: i.email, status: i.status
        }));
        setInvitations(mappedInvites);
      }
    } catch (e) { }
  };

  const fetchAllData = async (silent: boolean = false) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (!connectionError) setConnectionError(true);
      if (mountedRef.current) setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const [leaguesData, matchesData, predsData, profilesData] = await Promise.all([
        api.leagues.list().catch(e => {
          console.error("Leagues error", e);
          if (!silent) addNotification('Erro', `Falha ao carregar Ligas: ${e.message}`, 'warning');
          return [];
        }),
        api.matches.list().catch(e => {
          console.error("Matches error", e);
          if (!silent) addNotification('Erro', `Falha ao carregar Partidas: ${e.message}`, 'warning');
          return [];
        }),
        api.predictions.list().catch(e => {
          console.error("Preds error", e);
          if (!silent) addNotification('Erro', `Falha ao carregar Palpites: ${e.message}`, 'warning');
          return [];
        }),
        api.profiles.list().catch(e => {
          console.error("Profiles error", e);
          if (!silent) addNotification('Erro', `Falha ao carregar Perfis: ${e.message}`, 'warning');
          return [];
        })
      ]);

      if (leaguesData) {
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
      }

      if (matchesData && matchesData.length > 0) {
        const mappedMatches: Match[] = matchesData.map((m: any) => ({
          id: m.id, homeTeamId: m.home_team_id, awayTeamId: m.away_team_id,
          date: m.date, location: m.location, group: m.group, phase: m.phase,
          status: m.status, homeScore: m.home_score !== null ? Number(m.home_score) : null,
          awayScore: m.away_score !== null ? Number(m.away_score) : null
        }));
        setMatches(mappedMatches);
      }

      if (predsData) {
        const mappedPreds: Prediction[] = predsData.map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          points: p.points ? Number(p.points) : 0
        }));
        setPredictions(mappedPreds);
      }

      if (profilesData) {
        const mappedUsers: User[] = profilesData.map((p: any) => ({
          id: p.id, name: p.name, email: p.email, avatar: p.avatar, isAdmin: p.is_admin,
          whatsapp: p.whatsapp || '', notificationSettings: p.notification_settings, theme: p.theme, isPro: p.is_pro
        }));
        setUsers(mappedUsers);
      }

      setConnectionError(false);
      failureCountRef.current = 0;
    } catch (e: any) {
      console.error("API Fetch Error", e);
      failureCountRef.current += 1;
      if (failureCountRef.current > 3 && !connectionError) setConnectionError(true);
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
        },
      }
    });
    if (error) {
      addNotification('Erro no Login Google', error.message, 'warning');
      setLoading(false);
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
    const { data, error } = await supabase.auth.signUp({
      email, password: pass, options: { data: { name, full_name: name, whatsapp: whatsapp || null } }
    });
    if (error) {
      addNotification('Erro no Cadastro', error.message, 'warning');
      return false;
    }
    if (data.user && data.session) {
      const newUserDB = {
        id: data.user.id, email, name, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.user.id}`,
        is_admin: false, whatsapp: whatsapp || null, notification_settings: { matchStart: true, matchEnd: true, predictionReminder: true }
      };
      api.profiles.update(newUserDB).catch((err) => console.warn(err));
      const newUser: User = { ...newUserDB, isAdmin: false, whatsapp: whatsapp || '', notificationSettings: newUserDB.notification_settings };
      setCurrentUser(newUser);
      setUsers(prev => prev.some(u => u.id === newUser.id) ? prev : [...prev, newUser]);
    }
    if (!data.session) {
      addNotification('Verifique seu E-mail', 'Enviamos um link de confirmação.', 'info');
      return true;
    }
    addNotification('Bem-vindo!', 'Cadastro realizado.', 'success');
    return true;
  };

  const logout = async () => {
    console.log("Logout triggered.");
    try {
      // 1. Sign out from Supabase first
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("Sign out error", e);
    }

    // 2. Clear all local storage related to the app
    const keysToRemove = ['bolao-copa-native-v1', 'app-theme'];
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
      const finalSettings = { ...settings, isUnlimited: false, plan: plan || 'FREE' };
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
    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, ...updates } : l));
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
        addNotification('Sucesso', 'Liga atualizada.', 'success');
      } catch (e) {
        addNotification('Erro', 'Falha ao atualizar liga.', 'warning');
      }
    }
  }, [currentUser]);

  const deleteLeague = async (leagueId: string): Promise<boolean> => {
    if (!currentUser) return false;
    const league = leagues.find(l => l.id === leagueId);
    if (league && league.adminId !== currentUser.id) return false;
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

  const joinLeague = async (leagueId: string) => {
    if (!currentUser) return;
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return;
    if (league.participants.includes(currentUser.id)) { addNotification('Aviso', 'Você já participa desta liga.', 'info'); return; }
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Liga Cheia', 'O limite de participantes foi atingido.', 'warning'); return; }


    let updatedLeague = { ...league };
    if (league.isPrivate) {
      if (!league.pendingRequests.includes(currentUser.id)) updatedLeague.pendingRequests = [...league.pendingRequests, currentUser.id];
      else { addNotification('Aviso', 'Solicitação já enviada.', 'info'); return; }
    } else {
      updatedLeague.participants = [...league.participants, currentUser.id];
    }
    setLeagues(prev => prev.map(l => l.id === leagueId ? updatedLeague : l));
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

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    if (!currentUser) return;
    const invite = invitations.find(i => i.id === inviteId);
    if (!invite) return;
    if (accept) {
      const league = leagues.find(l => l.id === invite.leagueId);
      if (league) {
        const limit = getLeagueLimit(league);
        if (league.participants.includes(currentUser.id)) {
          addNotification('Aviso', 'Você já participa desta liga.', 'info');
        } else {
          const updatedParticipants = [...league.participants, currentUser.id];
          const updatedPending = (league.pendingRequests || []).filter(uid => uid !== currentUser.id);
          setLeagues(prev => prev.map(l => l.id === league.id ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
          addNotification('Sucesso', `Bem-vindo à liga ${league.name}!`, 'success');
        }
      }
    }
    setInvitations(prev => prev.filter(i => i.id !== inviteId));
    try {
      await api.leagues.respondInvite(inviteId, accept);
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
    try {
      const predsData = await api.predictions.list();
      if (predsData) {
        const mappedPreds: Prediction[] = predsData.map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          points: p.points ? Number(p.points) : 0
        }));
        setPredictions(mappedPreds);
        addNotification('Atualizado', 'Palpites sincronizados com sucesso.', 'success');
      }
    } catch (e) {
      console.error("Refresh Preds Error", e);
    }
  };

  useEffect(() => {
    if (!currentUser?.isAdmin || loading) return;
    const matchesToStart = matches.filter(m => m.status === MatchStatus.SCHEDULED && new Date(m.date) <= currentTime);
    if (matchesToStart.length > 0) {
      matchesToStart.forEach(match => {
        updateMatch({ ...match, status: MatchStatus.IN_PROGRESS, homeScore: 0, awayScore: 0 });
        addNotification('Jogo Iniciado', `${match.homeTeamId} x ${match.awayTeamId}`, 'info');
      });
    }
  }, [currentTime, currentUser, loading, matches]);

  return (
    <AppContext.Provider value={{
      currentUser, users, matches, leagues, predictions, currentTime, notifications, loading, invitations,
      setCurrentTime, loginGoogle, signInWithEmail, signUpWithEmail, logout, createLeague, updateLeague, joinLeague, deleteLeague, approveUser, rejectUser, deleteAccount,
      removeUserFromLeague, submitPrediction, submitPredictions, simulateMatchResult, updateMatch, removeNotification, updateUserProfile, syncInitialMatches,
      sendLeagueInvite, respondToInvite, theme, toggleTheme, connectionError, retryConnection, addNotification, refreshPredictions, refreshAllData: () => fetchAllData(false), isRecoveryMode
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
          const currentPath = locationRef.current.pathname;
          const currentKey = locationRef.current.key;

          console.log('Native Back Pressed. React Path:', currentPath, 'Key:', currentKey);

          // Only exit if at login, or at home with no history (key is 'default')
          if (currentPath === '/login' || (currentPath === '/' && currentKey === 'default')) {
            console.log('Exiting App...');
            CapApp.exitApp();
          } else {
            console.log('Navigating back internally...');
            navigate(-1);
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

const AppRoutes: React.FC = () => {
  const { currentUser, loading, connectionError, retryConnection, isRecoveryMode } = useStore();

  if (loading) {
    return <AppLoading />;
  }

  if (connectionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-6 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl max-w-md w-full border border-red-100 dark:border-red-800">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Erro de Conexão</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Não foi possível conectar ao servidor. Verifique sua internet.</p>
          <button onClick={retryConnection} className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <CapacitorBackButtonHandler />
      <Layout>
        <Routes>
          <Route path="/" element={isRecoveryMode ? <Navigate to="/reset-password" /> : <Home />} />
          <Route path="/table" element={isRecoveryMode ? <Navigate to="/reset-password" /> : <TablePage />} />
          <Route path="/leagues" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <LeaguesPage /> : <Navigate to="/" />)} />
          <Route path="/league/:id" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <LeagueDetails /> : <Navigate to="/" />)} />
          <Route path="/simulador" element={currentUser ? <SimulatePage /> : <Navigate to="/" />} />
          <Route path="/como-jogar" element={<HowToPlay />} />
          <Route path="/termos" element={<TermsPage />} />
          <Route path="/privacidade" element={<PrivacyPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/profile" element={isRecoveryMode ? <Navigate to="/reset-password" /> : (currentUser ? <ProfilePage /> : <Navigate to="/" />)} />

          <Route path="/admin" element={isRecoveryMode ? <Navigate to="/reset-password" /> : <AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/admin/leagues" element={<AdminRoute><AdminLeaguesPage /></AdminRoute>} />
          <Route path="/admin/matches" element={<AdminRoute><AdminMatchesPage /></AdminRoute>} />




          <Route path="/auth/callback" element={<ConfirmacaoCadastro />} />
          <Route path="/login" element={!currentUser ? <Login /> : <Navigate to="/" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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