import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { TablePage } from './pages/TablePage';
import { LeaguesPage } from './pages/LeaguesPage';
import { LeagueDetails } from './pages/LeagueDetails';
import { AdminPage } from './pages/AdminPage';
import { AdminLeaguesPage } from './pages/AdminLeaguesPage';
import { AdminMatchesPage } from './pages/AdminMatchesPage';
import { ProfilePage } from './pages/ProfilePage';
import { User, League, Match, Prediction, MatchStatus, AppNotification, Invitation, LeaguePlan } from './types';
import { INITIAL_MATCHES, calculatePoints } from './services/dataService';
import { supabase } from './services/supabase'; // Auth Only
import { api } from './services/api'; // New API Service
import { uploadBase64Image } from './services/storageService';
import { Loader2 } from 'lucide-react';

// --- STORE CONTEXT ---

interface AppState {
  currentUser: User | null;
  users: User[];
  matches: Match[];
  leagues: League[];
  predictions: Prediction[];
  notifications: AppNotification[];
  invitations: Invitation[];
  currentTime: Date;
  setCurrentTime: (d: Date) => void;
  loginGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<boolean>;
  signUpWithEmail: (email: string, pass: string, name: string, whatsapp?: string) => Promise<boolean>;
  logout: () => void;
  createLeague: (name: string, isPrivate: boolean, settings: any, image: string, description: string) => Promise<boolean>;
  updateLeague: (leagueId: string, updates: Partial<League>) => Promise<void>;
  joinLeague: (leagueId: string) => void;
  deleteLeague: (leagueId: string) => Promise<boolean>;
  approveUser: (leagueId: string, userId: string) => void;
  rejectUser: (leagueId: string, userId: string) => void;
  removeUserFromLeague: (leagueId: string, userId: string) => void;
  sendLeagueInvite: (leagueId: string, email: string) => Promise<boolean>;
  respondToInvite: (inviteId: string, accept: boolean) => Promise<void>;
  /* REMOVED: submitPrediction (single) unused if we use batch, or just implement if needed. 
     Keeping the signature in interface? It's used in one place maybe. 
     Let's map single submit to batch logic or new endpoint? 
     The logic below updates state directly then calls DB. 
  */
  submitPrediction: (matchId: string, leagueId: string, home: number, away: number) => void;
  submitPredictions: (predictions: { matchId: string, home: number, away: number }[], leagueId: string) => Promise<boolean>;
  simulateMatchResult: (matchId: string, home: number, away: number) => void;
  updateMatch: (match: Match) => Promise<boolean>;
  removeNotification: (id: number) => void;
  updateUserProfile: (name: string, avatar: string, whatsapp: string, pix: string, notificationSettings: { matchStart: boolean, matchEnd: boolean }, themePreference: 'light' | 'dark') => Promise<void>;
  syncInitialMatches: () => Promise<void>;
  loading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  connectionError: boolean;
  retryConnection: () => void;
}

const AppContext = createContext<AppState | null>(null);

export const useStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useStore must be used within AppProvider");
  return context;
};

// Helper to determine league limit based on plan
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

  // Theme State
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return (savedTheme as 'light' | 'dark') || 'light';
  });

  // Refs to prevent race conditions and loops
  const fetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const mountedRef = useRef(true);
  const matchesRef = useRef<Match[]>([]);
  const currentUserRef = useRef<User | null>(null);
  const failureCountRef = useRef(0); // Circuit Breaker counter

  const addNotification = (title: string, message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 6000);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const triggerSystemNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        navigator.vibrate?.([200, 100, 200]);
        new Notification(title, {
          body,
          icon: 'https://sjianpqzozufnobftksp.supabase.co/storage/v1/object/public/Public/logo.png',
          tag: 'match-update'
        });
      } catch (e) {
        console.error("Erro ao enviar notificação nativa", e);
      }
    }
  };

  useEffect(() => {
    matchesRef.current = matches;
  }, [matches]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  // --- AUTO RECONNECT LOGIC ---
  const retryConnection = useCallback(() => {
    console.log("Tentando reconexão manual...");
    failureCountRef.current = 0;
    setConnectionError(false);
    setLoading(true); // Feedback visual
    fetchAllData();
  }, []);

  useEffect(() => {
    let interval: any;
    if (connectionError) {
      // Tenta reconectar a cada 10 segundos se estiver em erro
      interval = setInterval(() => {
        if (navigator.onLine) {
          console.log("Tentando reconexão automática...");
          failureCountRef.current = 0; // Reset para permitir nova tentativa
          fetchAllData();
        }
      }, 10000);
    }
    return () => clearInterval(interval);
  }, [connectionError]);
  // ---------------------------

  const toggleTheme = () => {
    setTheme(prev => {
      const newTheme = prev === 'light' ? 'dark' : 'light';
      if (currentUser) {
        updateUserProfile(currentUser.name, currentUser.avatar, currentUser.whatsapp || '', currentUser.pix || '', currentUser.notificationSettings || { matchStart: true, matchEnd: true }, newTheme).catch(() => { });
      }
      return newTheme;
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- INITIAL DATA FETCHING ---
  useEffect(() => {
    mountedRef.current = true;

    // Initial Auth Check
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.warn("Sessão: Erro de rede ou sessão inválida (modo offline possível).", error.message);
        if (mountedRef.current) setLoading(false);
        return;
      }

      if (!data?.session) {
        if (mountedRef.current) setLoading(false);
      }

      if (data?.session?.user) {
        const session = data.session;
        const avatarUrl = session.user.user_metadata.avatar_url || session.user.user_metadata.picture || '';
        const fullName = session.user.user_metadata.full_name || session.user.user_metadata.name || session.user.user_metadata.custom_claims?.global_name || '';
        const whatsappMeta = session.user.user_metadata.whatsapp || '';

        // Trigger fetch immediately
        fetchUserProfile(session.user.id, session.user.email || '', avatarUrl, fullName, whatsappMeta);
        fetchAllData();
      }

    }).catch(err => {
      // Trata erro de "Failed to fetch" no auth como warning
      if (err.message === 'Failed to fetch') {
        console.warn("Falha de conexão na verificação de sessão (Offline).");
      } else {
        console.error("Erro inesperado na sessão:", err);
      }
      if (mountedRef.current) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setCurrentUser(null);
        setLeagues([]);
        setPredictions([]);
        setInvitations([]);
        if (mountedRef.current) setLoading(false);
      } else if (session?.user) {
        const user = session.user;
        const metadata = user.user_metadata || {};

        // LOGIN OTIMISTA: Define um usuário provisório imediatamente para desbloquear a UI
        const basicUser: User = {
          id: user.id,
          email: user.email || '',
          name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'Usuário',
          avatar: metadata.avatar_url || metadata.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
          isAdmin: false,
          whatsapp: metadata.whatsapp || '',
          notificationSettings: { matchStart: true, matchEnd: true }
        };

        if (!currentUserRef.current || currentUserRef.current.id !== user.id) {
          // Define estado imediatamente
          setCurrentUser(basicUser);

          // Busca dados completos em segundo plano
          await fetchUserProfile(user.id, user.email || '', basicUser.avatar, basicUser.name, basicUser.whatsapp || '');
          fetchAllData();
        }
      }
    });

    // 2. REALTIME (REMOVED FOR ARCHITECTURE UPDATE)
    // Refactored to strictly use API Routes. 
    // We could implement polling here if needed, but fetchAllData already exists and can be called manually or on interval.
    // For now, reliance on Auto-Reconnect/Polling interval in useEffect below.

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      // supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserProfile = async (uid: string, email: string, photoURL: string, fullName: string = '', whatsappMeta: string = '') => {
    // FALLBACK USER: Criado imediatamente para garantir que a UI não trave em estado nulo
    const savedPrefs = localStorage.getItem(`notify_${uid}`);
    const fallbackPrefs = savedPrefs ? JSON.parse(savedPrefs) : { matchStart: true, matchEnd: true };
    const shouldBeAdmin = email.toLowerCase() === 'renatinhorlopes@hotmail.com';

    const fallbackUser: User = {
      id: uid,
      name: fullName || email.split('@')[0] || 'Usuário',
      email: email,
      avatar: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${uid}`,
      isAdmin: shouldBeAdmin,
      whatsapp: whatsappMeta || '',
      pix: '',
      notificationSettings: fallbackPrefs,
      theme: 'light'
    };

    try {
      const data = await api.profiles.get(uid).catch(() => null);

      if (data) {
        // Sucesso: Atualiza com dados do banco
        // Admin fix check handled by API or separate trigger? 
        // For now, assume API returns correct data. Admin check logic:
        if (shouldBeAdmin && !data.is_admin) {
          await api.profiles.update({ id: uid, is_admin: true });
          data.is_admin = true;
        }

        const user: User = {
          id: data.id,
          name: data.name || fallbackUser.name,
          email: data.email || email,
          avatar: data.avatar || fallbackUser.avatar,
          isAdmin: data.is_admin === true,
          whatsapp: data.whatsapp || '',
          pix: data.pix || '',
          notificationSettings: data.notification_settings || fallbackPrefs,
          theme: data.theme // Load DB Theme
        };

        if (user.theme && (user.theme === 'light' || user.theme === 'dark')) {
          setTheme(user.theme);
        }

        setCurrentUser(user);
        // Reset connection error if success
        setConnectionError(false);
        failureCountRef.current = 0;

        fetchInvitations(user.email);
      }
      else {
        // Usuário não existe: Cria novo via API?
        // API.profiles.update works as upsert if logic allows.
        // Or create explicit endpoint. 
        // Existing api.profiles.update logic is upsert. 
        const newUserDB = {
          id: uid, email: email, name: fallbackUser.name, avatar: fallbackUser.avatar,
          is_admin: shouldBeAdmin, whatsapp: whatsappMeta || null, notification_settings: fallbackPrefs
        };

        try {
          await api.profiles.update(newUserDB);
          setCurrentUser(fallbackUser);
          fetchInvitations(fallbackUser.email);
          setUsers(prev => prev.some(u => u.id === fallbackUser.id) ? prev : [...prev, fallbackUser]);
        } catch (insertError) {
          throw insertError;
        }
      }
    } catch (e: any) {
      if (e.message !== 'Failed to fetch') console.error("Fetch profile error", e);

      // EM CASO DE ERRO CRÍTICO (Banco fora, timeout, etc):
      // Usa o fallbackUser para permitir que o app funcione em modo "degradado"
      console.warn("Entrando em modo de contingência para o perfil.");
      setCurrentUser(fallbackUser);
      // Se for "Failed to fetch", provavelmente é offline, então setamos erro de conexão
      if (e.message === 'Failed to fetch') {
        setConnectionError(true);
      }
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
    } catch (e) {
      // Ignora erros de convite para não bloquear o app
    }
  };

  const fetchAllData = async () => {
    // 0. CHECK ONLINE
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log("Offline: Skipping fetch.");
      if (!connectionError) setConnectionError(true);
      if (mountedRef.current) setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      // Parallel Fetching for speed
      const [leaguesData, matchesData, predsData, profilesData] = await Promise.all([
        api.leagues.list().catch(e => { console.error("Leagues error", e); return []; }),
        api.matches.list().catch(e => { console.error("Matches error", e); return []; }),
        api.predictions.list().catch(e => { console.error("Preds error", e); return []; }),
        api.profiles.list().catch(e => { console.error("Profiles error", e); return []; })
      ]);

      // 1. LEAGUES
      if (leaguesData) {
        const mappedLeagues: League[] = leaguesData
          .map((l: any) => ({
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

      // 2. MATCHES
      if (matchesData && matchesData.length > 0) {
        const mappedMatches: Match[] = matchesData.map((m: any) => ({
          id: m.id, homeTeamId: m.home_team_id, awayTeamId: m.away_team_id,
          date: m.date, location: m.location, group: m.group, phase: m.phase,
          status: m.status, homeScore: m.home_score !== null ? Number(m.home_score) : null,
          awayScore: m.away_score !== null ? Number(m.away_score) : null
        }));
        setMatches(mappedMatches);
      }

      // 3. PREDICTIONS
      if (predsData) {
        const mappedPreds: Prediction[] = predsData.map((p: any) => ({
          userId: p.user_id, matchId: p.match_id, leagueId: p.league_id,
          homeScore: Number(p.home_score), awayScore: Number(p.away_score),
          points: p.points ? Number(p.points) : 0
        }));
        setPredictions(mappedPreds);
      }

      // 4. PROFILES
      if (profilesData) {
        const mappedUsers: User[] = profilesData.map((p: any) => ({
          id: p.id, name: p.name, email: p.email, avatar: p.avatar, isAdmin: p.is_admin,
          whatsapp: p.whatsapp || '', pix: p.pix || '', notificationSettings: p.notification_settings, theme: p.theme
        }));
        setUsers(mappedUsers);
      }

      setConnectionError(false);
      failureCountRef.current = 0;

    } catch (e: any) {
      console.error("API Fetch Error", e);
      failureCountRef.current += 1;
      if (failureCountRef.current > 3 && !connectionError) {
        setConnectionError(true);
      }
    } finally {
      fetchingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  // --- ACTIONS ---

  const loginGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
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
        is_admin: false, whatsapp: whatsapp || null, notification_settings: { matchStart: true, matchEnd: true }
      };
      // Tenta salvar, mas não bloqueia se falhar (rls/offline)
      api.profiles.update(newUserDB).catch((error) => console.warn(error));

      const newUser: User = { ...newUserDB, isAdmin: false, whatsapp: whatsapp || '', pix: '', notificationSettings: newUserDB.notification_settings };
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
    try {
      // Force loading while signing out
      setLoading(true);
      await supabase.auth.signOut({ scope: 'global' });
    } catch (e) {
      console.error("Sign out error", e);
    } finally {
      // Clear EVERYTHING
      setCurrentUser(null);
      setLeagues([]);
      setPredictions([]);
      setInvitations([]);
      setLoading(false);
      // Force clear potential stale localStorage keys if any
      localStorage.removeItem('supabase.auth.token');
      console.log("Logout completed successfully.");
    }
  };

  const updateUserProfile = async (name: string, avatar: string, whatsapp: string, pix: string, notificationSettings: { matchStart: boolean, matchEnd: boolean }, themePreference: 'light' | 'dark') => {
    if (!currentUser) return;

    let finalAvatar = avatar;
    // Upload avatar if it is base64 (new upload)
    if (avatar && !avatar.startsWith('http')) {
      try {
        addNotification('Processando', 'Enviando imagem...', 'info');
        finalAvatar = await uploadBase64Image(avatar, 'avatars');
      } catch (e) {
        console.error("Avatar upload failed", e);
        addNotification('Erro', 'Falha no upload da imagem.', 'warning');
        return;
      }
    }

    const updatedUser = { ...currentUser, name, avatar: finalAvatar, whatsapp, pix, notificationSettings, theme: themePreference };

    // Optimistic Update
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
    setTheme(themePreference);

    localStorage.setItem(`notify_${currentUser.id}`, JSON.stringify(notificationSettings));

    try {
      await api.profiles.update({
        id: currentUser.id,
        name, avatar: finalAvatar, whatsapp: whatsapp.trim() || null, pix: pix.trim() || null,
        notification_settings: notificationSettings, theme: themePreference
      });
      addNotification('Perfil Atualizado', 'Seus dados foram salvos.', 'success');
    } catch (e) {
      console.error("Update Profile Error", e);
      // Fallback retry minimal?
      // Let's just warn for now.
    }
  };

  // Generic Create/Update helpers
  const createLeague = async (name: string, isPrivate: boolean, settings: any, image: string, description: string): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      // const { data: existingLeague } = await supabase.from('leagues').select('id').ilike('name', name).maybeSingle();
      // Remove DB check in favor of API constraint handling? 
      // Or we can leave this check if we expose an API endpoint for checking existence safely. 
      // For now, let's just proceed and handle API error.
      // if (existingLeague) { addNotification('Nome Indisponível', `Já existe uma liga chamada "${name}".`, 'warning'); return false; }

      let leagueCode = '';
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < 6; i++) leagueCode += chars.charAt(Math.floor(Math.random() * chars.length));

      const newLeagueId = `l-${Date.now()}`;
      let finalImage = image || `https://api.dicebear.com/7.x/identicon/svg?seed=${newLeagueId}`;

      // Upload League Image
      if (image && !image.startsWith('http')) {
        try {
          addNotification('Processando', 'Enviando logo da liga...', 'info');
          finalImage = await uploadBase64Image(image, 'leagues');
        } catch (e) {
          console.error("League image upload failed", e);
          // Fallback to base64 or placeholder? Let's try base64 if upload fails, or just fail safely.
          // For now, keep base64 as fallback to strictly match old behavior if S3 fails
        }
      }

      const finalSettings = { ...settings, isUnlimited: false, plan: 'FREE' };

      const newLeagueApp: League = {
        id: newLeagueId, name, image: finalImage, description: description || '',
        leagueCode: leagueCode, adminId: currentUser.id, isPrivate, participants: [currentUser.id],
        pendingRequests: [], settings: finalSettings
      };

      // Optimistic
      setLeagues(prev => [...prev, newLeagueApp]);

      try {
        await api.leagues.create({
          id: newLeagueId, name, image: finalImage, description: description || '',
          league_code: leagueCode, admin_id: currentUser.id, is_private: isPrivate, participants: [currentUser.id],
          pending_requests: [], settings: finalSettings
        });
        addNotification('Liga Criada', `A liga "${name}" foi criada!`, 'success');
        return true;
      } catch (err) {
        throw err;
      }
    } catch (e: any) {
      console.error("Create League Exception:", e);
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
      } catch (e: any) {
        console.error("Update League Error", e);
        // Rollback? For now simplistically just notify error
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
    } catch (e: any) {
      console.error("Delete League Error", e);
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

    // Optimistic
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
      addNotification('Sucesso', league.isPrivate ? 'Solicitação enviada.' : 'Você entrou na liga.', league.isPrivate ? 'info' : 'success');
    } catch (e: any) {
      console.error("Join League Error", e);
      addNotification('Erro', e.message || 'Falha ao entrar na liga.', 'warning');
      // Rollback?
    }
  };

  const approveUser = async (leagueId: string, userId: string) => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return;
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano (${limit}) atingido.`, 'warning'); return; }

    const updatedPending = league.pendingRequests.filter(id => id !== userId);
    const updatedParticipants = Array.from(new Set([...league.participants, userId]));

    setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
    try {
      await api.leagues.approveUser(leagueId, userId);
    } catch (e: any) {
      console.error("Approve User Error", e);
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
    } catch (e: any) {
      console.error("Reject User Error", e);
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
    } catch (e: any) {
      console.error("Remove User Error", e);
    }
  };

  const sendLeagueInvite = async (leagueId: string, email: string): Promise<boolean> => {
    const league = leagues.find(l => l.id === leagueId);
    if (!league) return false;
    const limit = getLeagueLimit(league);
    if (league.participants.length >= limit) { addNotification('Limite Atingido', `Limite do plano atingido.`, 'warning'); return false; }

    const emailNormalized = email.toLowerCase().trim();
    const existingUser = users.find(u => u.email.toLowerCase() === emailNormalized);
    if (existingUser && league.participants.includes(existingUser.id)) { addNotification('Já Participa', 'Usuário já está na liga.', 'warning'); return false; }

    try {
      await api.leagues.invite(leagueId, emailNormalized);
      addNotification('Sucesso', 'Convite enviado.', 'success');
      return true;
    } catch (e: any) {
      console.error("Invite Error", e);
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
        if (league.participants.length >= limit) { addNotification('Liga Cheia', 'Limite atingido.', 'warning'); return; }

        const updatedParticipants = [...league.participants, currentUser.id];
        const updatedPending = league.pendingRequests.filter(uid => uid !== currentUser.id);
        setLeagues(prev => prev.map(l => l.id === league.id ? { ...l, participants: updatedParticipants, pendingRequests: updatedPending } : l));
        addNotification('Sucesso', `Bem-vindo à liga ${league.name}!`, 'success');
      }
    }

    // Optimistic Remove
    setInvitations(prev => prev.filter(i => i.id !== inviteId));

    try {
      await api.leagues.respondInvite(inviteId, accept);
    } catch (e: any) {
      console.error("Respond Invite Error", e);
      addNotification('Erro', 'Falha ao responder convite.', 'warning');
      // Rollback? Should fetch invitations again
      if (currentUser?.email) fetchInvitations(currentUser.email);
    }
  };



  const updateMatch = async (updatedMatch: Match): Promise<boolean> => {
    // 1. Capture previous state for rollback
    const previousMatches = [...matches];

    // 2. Optimistic Update
    setMatches(prev => prev.map(m => m.id === updatedMatch.id ? updatedMatch : m));

    try {
      const dbPayload = {
        id: updatedMatch.id, home_team_id: updatedMatch.homeTeamId, away_team_id: updatedMatch.awayTeamId,
        date: updatedMatch.date, location: updatedMatch.location, group: updatedMatch.group || null,
        phase: updatedMatch.phase, status: updatedMatch.status, home_score: updatedMatch.homeScore, away_score: updatedMatch.awayScore
      };

      await api.matches.update(dbPayload);

      // Calculation logic removed from here; it's now handled by DB trigger
      return true;
    } catch (e: any) {
      // 3. ROLLBACK ON ERROR
      console.error("Failed to update match, rolling back", e);
      // DB ERROR NOTIFICATION?
      addNotification('Erro', 'Falha ao atualizar a partida.', 'warning');

      setMatches(previousMatches);
      return false;
    }
  };

  /* API BASED PREDICTIONS */
  const submitPredictions = async (predictionsToSubmit: { matchId: string, home: number, away: number }[], leagueId: string) => {
    if (!currentUser) return false;

    // Optimistic Update
    setPredictions(prev => {
      let newPreds = [...prev];
      predictionsToSubmit.forEach(p => {
        // remove old
        newPreds = newPreds.filter(existing => !(existing.matchId === p.matchId && existing.leagueId === leagueId && existing.userId === currentUser.id));
        // add new
        newPreds.push({
          userId: currentUser.id, matchId: p.matchId, leagueId,
          homeScore: p.home, awayScore: p.away, points: 0
        });
      });
      return newPreds;
    });

    try {
      const dbPayload = predictionsToSubmit.map(p => ({
        user_id: currentUser.id,
        match_id: p.matchId,
        league_id: leagueId,
        home_score: p.home,
        away_score: p.away
      }));

      await api.predictions.submit(dbPayload);
      addNotification('Palpites Salvos', 'Seus palpites foram registrados.', 'success');
      return true;
    } catch (e) {
      console.error("Submit Preds Error", e);
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

  const syncInitialMatches = async () => {
    // Only for admin or init
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
      setCurrentTime, loginGoogle, signInWithEmail, signUpWithEmail, logout, createLeague, updateLeague, joinLeague, deleteLeague, approveUser, rejectUser,
      removeUserFromLeague, submitPrediction, submitPredictions, simulateMatchResult, updateMatch, removeNotification, updateUserProfile, syncInitialMatches,
      sendLeagueInvite, respondToInvite, theme, toggleTheme, connectionError, retryConnection
    }}>
      {children}
    </AppContext.Provider>
  );
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useStore();
  if (loading) return null;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading } = useStore();
  if (loading) return null;
  if (!currentUser?.isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/table" element={<ProtectedRoute><TablePage /></ProtectedRoute>} />
            <Route path="/leagues" element={<ProtectedRoute><LeaguesPage /></ProtectedRoute>} />
            <Route path="/leagues/:id" element={<ProtectedRoute><LeagueDetails /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
            <Route path="/admin/leagues" element={<AdminRoute><AdminLeaguesPage /></AdminRoute>} />
            <Route path="/admin/matches" element={<AdminRoute><AdminMatchesPage /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
};

export default App;