import { supabase } from './supabase'; // Only for Auth Session

// Detect if we are running in a Capacitor (Native) environment
// We check for both window.Capacitor and that it's actually a native platform
const isCapacitor = (window as any).Capacitor?.isNativePlatform?.() || false;

// Use the production URL when in APK/Capacitor, otherwise use relative /api
const PRODUCAO_URL = 'https://bolaodacopa2026.app';
const API_BASE = isCapacitor
    ? `${PRODUCAO_URL}/api`
    : (import.meta.env.VITE_API_URL || '/api');

console.log(`API initialized with BASE: ${API_BASE} (Capacitor: ${isCapacitor})`);


/**
 * Helper to fetch from Vercel API
 * Adds Authorization header automatically from Supabase Session
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as any) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            // Handle 503 Service Unavailable specifically if needed by UI
            if (res.status === 503) {
                console.error("API Service Unavailable (Retries exhausted)");
            }
            const errorData = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(errorData.error || `API Error: ${res.status}`);
        }

        return res.json();
    } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') throw new Error('Timeout na conexão');
        throw error;
    }
}


export const api = {
    leagues: {
        list: () => apiFetch<any[]>('/leagues'),
        create: async (data: any) => {
            const { error } = await supabase.from('leagues').insert(data);
            if (error) throw error;
            return { error: null };
        },
        update: async (id: string, data: any) => {
            const { error } = await supabase.from('leagues').update(data).eq('id', id);
            if (error) throw error;
            return { error: null };
        },
        delete: async (id: string) => {
            return apiFetch(`/leagues?id=${id}`, { method: 'DELETE' });
        },

        // Actions
        join: (id: string) => apiFetch('/leagues/join', { method: 'POST', body: JSON.stringify({ id }) }),

        // Members Management
        approveUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'approve' }) }),
        rejectUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'reject' }) }),
        removeUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'remove' }) }),

        // Invites
        invite: (leagueId: string, email: string, leagueType: 'standard' | 'brazil' = 'standard') => apiFetch('/leagues/invites', { method: 'POST', body: JSON.stringify({ leagueId, email, action: 'invite', leagueType }) }),
        respondInvite: (inviteId: string, accept: boolean) => apiFetch('/leagues/invites', { method: 'POST', body: JSON.stringify({ inviteId, accept, action: 'respond' }) }),
        listInvites: (email: string) => apiFetch<any[]>(`/leagues/invites?email=${encodeURIComponent(email)}`)
    },
    matches: {
        list: () => apiFetch<any[]>('/matches'),
        update: (data: any) => apiFetch('/admin/matches', { method: 'POST', body: JSON.stringify(data) }) // Admin
    },
    profiles: {
        list: () => apiFetch<any[]>('/profiles'),
        get: (id: string) => apiFetch<any>(`/profiles?id=${id}`),
        update: (data: any) => apiFetch('/profiles', { method: 'POST', body: JSON.stringify(data) }),
        saveFcmToken: (userId: string, token: string, deviceType: string) => 
            apiFetch('/profiles', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    id: userId, 
                    token: token, 
                    device_type: deviceType,
                    targetTable: 'user_fcm_tokens' // Signal to the backend to use the specific table
                }) 
            }),
        removeFcmToken: (token: string) => 
            apiFetch(`/profiles?token=${encodeURIComponent(token)}`, { method: 'DELETE' }),
        getByEmail: async (email: string) => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('email', email)
                .single();
            if (error) return null;
            return data;
        },
        delete: async () => {
            const { error } = await supabase.rpc('delete_own_user');
            if (error) throw error;
            return { error: null };
        }
    },
    predictions: {
        list: () => apiFetch<any[]>('/predictions'),
        submit: (data: any) => apiFetch('/predictions', { method: 'POST', body: JSON.stringify(data) })
    },
    simulations: {
        get: async (userId: string) => {
            const { data, error } = await supabase
                .from('user_simulations')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
            return data;
        },
        save: async (data: { userId: string, simulationData: any }) => {
            const { error } = await supabase
                .from('user_simulations')
                .upsert({
                    user_id: data.userId,
                    simulation_data: data.simulationData,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
        }
    },
    admin: {
        listUsers: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('name');
            if (error) throw error;
            return data;
        },
        togglePro: async (userId: string, isPro: boolean) => {
            const { error } = await supabase
                .from('profiles')
                .update({ is_pro: isPro })
                .eq('id', userId);
            if (error) throw error;
        },
        testPush: () => apiFetch<any>('/admin/test-push')
    },
    // --- BRAZIL GAMES MODE ---
    brazilLeagues: {
        list: () => apiFetch<any[]>('/brazil-leagues'),
        create: async (leagueData: any) => {
            const { error } = await supabase.from('brazil_leagues').insert(leagueData);
            if (error) throw error;
            return { error: null };
        },
        update: async (id: string, updates: any) => {
            const { error } = await supabase.from('brazil_leagues').update(updates).eq('id', id);
            if (error) throw error;
            return { error: null };
        },
        delete: async (id: string) => {
            return apiFetch(`/brazil-leagues?id=${id}`, { method: 'DELETE' });
        },
        join: async (leagueId: string, userId: string, isPrivate: boolean) => {
            const { data: league, error: fetchError } = await supabase
                .from('brazil_leagues')
                .select('participants, pending_requests')
                .eq('id', leagueId)
                .single();
            if (fetchError) throw fetchError;
            if (!league) throw new Error('Liga não encontrada');

            if (isPrivate) {
                const pendingRequests = league.pending_requests || [];
                if (pendingRequests.includes(userId)) return;
                const { error } = await supabase
                    .from('brazil_leagues')
                    .update({ pending_requests: [...pendingRequests, userId] })
                    .eq('id', leagueId);
                if (error) throw error;
            } else {
                const participants = league.participants || [];
                if (participants.includes(userId)) return;
                const { error } = await supabase
                    .from('brazil_leagues')
                    .update({ participants: [...participants, userId] })
                    .eq('id', leagueId);
                if (error) throw error;
            }
        },
        approveUser: async (leagueId: string, userId: string) => {
            const { data: league, error: fetchError } = await supabase
                .from('brazil_leagues')
                .select('participants, pending_requests')
                .eq('id', leagueId)
                .single();
            if (fetchError) throw fetchError;
            const { error } = await supabase
                .from('brazil_leagues')
                .update({
                    participants: [...(league.participants || []), userId],
                    pending_requests: (league.pending_requests || []).filter((id: string) => id !== userId)
                })
                .eq('id', leagueId);
            if (error) throw error;
        },
        rejectUser: async (leagueId: string, userId: string) => {
            const { data: league, error: fetchError } = await supabase
                .from('brazil_leagues')
                .select('pending_requests')
                .eq('id', leagueId)
                .single();
            if (fetchError) throw fetchError;
            const { error } = await supabase
                .from('brazil_leagues')
                .update({
                    pending_requests: (league.pending_requests || []).filter((id: string) => id !== userId)
                })
                .eq('id', leagueId);
            if (error) throw error;
        },
        removeUser: async (leagueId: string, userId: string) => {
            const { data: league, error: fetchError } = await supabase
                .from('brazil_leagues')
                .select('participants')
                .eq('id', leagueId)
                .single();
            if (fetchError) throw fetchError;
            const { error } = await supabase
                .from('brazil_leagues')
                .update({
                    participants: (league.participants || []).filter((id: string) => id !== userId)
                })
                .eq('id', leagueId);
            if (error) throw error;
        },
        invite: async (leagueId: string, email: string) => {
            return api.leagues.invite(leagueId, email, 'brazil');
        }
    },
    brazilPredictions: {
        list: async () => {
            const { data, error } = await supabase.from('brazil_predictions').select('*');
            if (error) throw error;
            return data || [];
        },
        submit: async (predictions: any[]) => {
            const { error } = await supabase.from('brazil_predictions').upsert(predictions, {
                onConflict: 'user_id,match_id,league_id'
            });
            if (error) throw error;
        }
    },
    brazilMatchGoals: {
        list: async () => {
            const { data, error } = await supabase.from('brazil_match_goals').select('*');
            if (error) throw error;
            return data || [];
        },
        add: async (matchId: string, playerName: string, goals: number = 1) => {
            const { error } = await supabase.from('brazil_match_goals').upsert(
                { match_id: matchId, player_name: playerName, goals },
                { onConflict: 'match_id,player_name' }
            );
            if (error) throw error;
        },
        remove: async (matchId: string, playerName: string) => {
            const { error } = await supabase
                .from('brazil_match_goals')
                .delete()
                .eq('match_id', matchId)
                .eq('player_name', playerName);
            if (error) throw error;
        }
    }
};
