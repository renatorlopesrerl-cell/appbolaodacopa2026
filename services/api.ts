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
 * Retry com backoff exponencial para chamadas diretas ao Supabase.
 * Tenta até `retries` vezes com delays crescentes: 500ms → 1000ms → 2000ms.
 * Apenas para erros de rede — erros de negócio (PGRST116, etc.) passam direto.
 */
export async function supabaseWithRetry<T>(
    fn: () => Promise<{ data: T | null; error: any }>,
    retries = 2
): Promise<T | null> {
    let lastError: any;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const { data, error } = await fn();
            if (error) {
                // Erros esperados (not found, etc.) — não fazer retry
                if (error.code === 'PGRST116') return null;
                throw error;
            }
            return data;
        } catch (err: any) {
            lastError = err;
            const isNetworkError = err.name === 'AbortError' ||
                err.message === 'Failed to fetch' ||
                err.message?.includes('network');
            if (!isNetworkError || attempt === retries) break;
            const delay = 500 * Math.pow(2, attempt);
            console.warn(`[supabaseWithRetry] Tentativa ${attempt + 1} falhou. Aguardando ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}

export async function fetchAllPaginated(tableName: string, columns = '*'): Promise<any[]> {
    const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
    const total = count || 0;
    const step = 1000;
    const promises = [];
    for (let i = 0; i < total; i += step) {
        promises.push(
            supabaseWithRetry(async () => await supabase.from(tableName).select(columns).range(i, i + step - 1))
        );
    }
    if (total === 0) {
        const data = await supabaseWithRetry(async () => await supabase.from(tableName).select(columns));
        return (data as any[]) || [];
    }
    const results = await Promise.all(promises);
    return results.flatMap(r => (r as any[]) || []);
}

/**
 * Helper to fetch from the Cloudflare Workers API.
 * Adds Authorization header automatically from Supabase Session.
 * Retries automatically on network errors and 5xx with exponential backoff.
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}, retries = 2): Promise<T> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as any) || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        try {
            const res = await fetch(`${API_BASE}${endpoint}`, {
                ...options,
                headers,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                // Não fazer retry em erros 4xx (client errors)
                if (res.status >= 400 && res.status < 500) {
                    if (res.status === 503) {
                        console.error("API Service Unavailable (Retries exhausted)");
                    }
                    const errorData = await res.json().catch(() => ({ error: res.statusText }));
                    throw new Error(errorData.error || `API Error: ${res.status}`);
                }

                // Erros 5xx: fazer retry com backoff
                const errorData = await res.json().catch(() => ({ error: res.statusText }));
                lastError = new Error(errorData.error || `API Error: ${res.status}`);
                console.warn(`[apiFetch] Erro ${res.status} na tentativa ${attempt + 1}. Retrying...`);
            } else {
                return res.json();
            }
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                lastError = new Error('Timeout na conexão');
            } else if (error.message && !error.message.includes('API Error')) {
                // Erro de rede real — pode ser transitório, fazer retry
                lastError = error;
            } else {
                // Erro de negócio (4xx) — propagar imediatamente
                throw error;
            }
        }

        // Aguarda antes da próxima tentativa (backoff exponencial: 500ms → 1000ms → 2000ms)
        if (attempt < retries) {
            const delay = 500 * Math.pow(2, attempt);
            console.warn(`[apiFetch] Aguardando ${delay}ms antes da tentativa ${attempt + 2}...`);
            await new Promise(r => setTimeout(r, delay));
        }
    }

    throw lastError || new Error('Erro desconhecido na requisição');
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
        update: (data: any) => apiFetch('/admin/matches', { method: 'POST', body: JSON.stringify(data) }), // Admin
        getStats: (matchId: string, leagueId: string, leagueType: 'standard' | 'brazil') => 
            apiFetch<any>(`/match-stats?matchId=${matchId}&leagueId=${leagueId}&leagueType=${leagueType}`)
    },
    profiles: {
        list: () => apiFetch<any[]>('/profiles'),
        get: (id: string) => apiFetch<any>(`/profiles?id=${id}`),
        getByIds: (ids: string[]) => apiFetch<any[]>('/profiles', { method: 'POST', body: JSON.stringify({ action: 'getByIds', ids }) }),
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
                .maybeSingle();
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
            return supabaseWithRetry(async () =>
                await supabase.from('user_simulations').select('*').eq('user_id', userId).maybeSingle()
            );
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
            return supabaseWithRetry(async () =>
                await supabase.from('profiles').select('*').order('name')
            );
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
        join: (leagueId: string) => apiFetch('/leagues/join', { method: 'POST', body: JSON.stringify({ id: leagueId, leagueType: 'brazil' }) }),
        approveUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'approve', leagueType: 'brazil' }) }),
        rejectUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'reject', leagueType: 'brazil' }) }),
        removeUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'remove', leagueType: 'brazil' }) }),
        invite: async (leagueId: string, email: string) => {
            return api.leagues.invite(leagueId, email, 'brazil');
        }
    },
    brazilPredictions: {
        list: async () => {
            return await fetchAllPaginated('brazil_predictions');
        },
        submit: async (predictions: any[]) => {
            const { error } = await supabase.from('brazil_predictions').upsert(predictions, {
                onConflict: 'user_id,match_id,league_id'
            });
            if (error) throw error;
        }
    },
    brazilPlayers: {
        list: async () => {
            const data = await supabaseWithRetry(async () =>
                await supabase.from('brazil_players').select('*').order('name')
            );
            return (data as any[]) || [];
        },
        upsert: async (player: any) => {
            const { error } = await supabase.from('brazil_players').upsert(player, {
                onConflict: 'id'
            });
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('brazil_players').delete().eq('id', id);
            if (error) throw error;
        }
    },
    brazilMatchGoals: {
        list: async () => {
            const data = await supabaseWithRetry(async () =>
                await supabase.from('brazil_match_goals').select('*')
            );
            return (data as any[]) || [];
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
    },
    topFinisherPredictions: {
        list: async () => {
            return await fetchAllPaginated('top_finisher_predictions');
        },
        upsert: async (prediction: {
            user_id: string; league_id: string;
            champion: string; runner_up: string; third: string; fourth: string;
        }) => {
            const { error } = await supabase.from('top_finisher_predictions').upsert(
                prediction,
                { onConflict: 'user_id,league_id' }
            );
            if (error) throw error;
        }
    },
    topFinishersResult: {
        get: async () => {
            return supabaseWithRetry(async () =>
                await supabase.from('top_finishers_result').select('*').maybeSingle()
            );
        },
        upsert: async (result: { champion: string; runner_up: string; third: string; fourth: string }) => {
            const { error } = await supabase.from('top_finishers_result').upsert(
                { id: 1, ...result },
                { onConflict: 'id' }
            );
            if (error) throw error;
        }
    }
};
