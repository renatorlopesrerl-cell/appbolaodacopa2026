import { supabase } from './supabase'; // Only for Auth Session
import { Capacitor } from '@capacitor/core';

// Evaluate platform dynamically to avoid race conditions during app startup
const getApiBase = () => {
    // Check both the core library and window object to be absolutely sure
    const isCapacitor = Capacitor.isNativePlatform() || !!(window as any).Capacitor?.isNativePlatform?.();
    const PRODUCAO_URL = 'https://bolaodacopa2026.app';
    return isCapacitor ? `${PRODUCAO_URL}/api` : (import.meta.env.VITE_API_URL || '/api');
};

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
        const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout

        try {
            const res = await fetch(`${getApiBase()}${endpoint}`, {
                cache: 'no-store',
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

const CACHE_TIME_MS = 5 * 60 * 1000; // 5 minutos
const teamHistoryCache: Record<string, { data: any, timestamp: number }> = {};

export const api = {
    leagues: {
        list: () => apiFetch<any[]>('/leagues'),
        search: (code: string) => apiFetch<any[]>(`/leagues?code=${encodeURIComponent(code)}`),
        getById: async (id: string) => {
            const { data, error } = await supabase
                .from('leagues')
                .select('*')
                .eq('id', id)
                .single();
            if (error) return null;
            return data;
        },
        getRankings: async (leagueId: string) => {
            const { data, error } = await supabase
                .from('league_rankings')
                .select('*')
                .eq('league_id', leagueId);
            if (error) return [];
            return data;
        },
        create: async (data: any) => {
            const { error } = await supabase.from('leagues').insert(data);
            if (error) throw error;
            return { error: null };
        },
        update: (id: string, updates: any) =>
            apiFetch('/leagues', {
                method: 'PUT',
                body: JSON.stringify({ id, ...updates })
            }),
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
        getStats: async (matchId: string, leagueId: string, leagueType: 'standard' | 'brazil') => {
            const data = await apiFetch<any>(`/match-stats?matchId=${matchId}&leagueId=${leagueId}&leagueType=${leagueType}`);
            return data;
        },
        getDetailedMatchStats: async (matchId: string, leagueId: string, isBrazil: boolean) => {
            const { data, error } = await supabase.rpc('get_match_detailed_stats', {
                p_league_id: leagueId,
                p_match_id: matchId,
                p_is_brazil: isBrazil
            });
            if (error) {
                console.error('Error fetching detailed match stats:', error);
                return null;
            }
            return data;
        }
    },
    profiles: {
        list: (leagueId?: string) => {
            const params = new URLSearchParams();
            if (leagueId) params.append('leagueId', leagueId);
            const query = params.toString();
            return apiFetch<any[]>('/profiles' + (query ? `?${query}` : ''));
        },
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
        getByEmail: (email: string) => apiFetch<any>(`/profiles?email=${encodeURIComponent(email)}`),
        delete: async () => {
            const { error } = await supabase.rpc('delete_own_user');
            if (error) throw error;
            return { error: null };
        }
    },
    predictions: {
        list: (leagueId?: string | string[], userId?: string, matchIds?: string[]) => {
            const params = new URLSearchParams();
            if (leagueId) {
                if (Array.isArray(leagueId)) params.append('leagueId', leagueId.join(','));
                else params.append('leagueId', leagueId);
            }
            if (userId) params.append('userId', userId);
            if (matchIds && matchIds.length > 0) params.append('matchIds', matchIds.join(','));
            const query = params.toString();
            return apiFetch<any[]>('/predictions' + (query ? `?${query}` : ''));
        },
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
        // SECURITY: togglePro goes through the Cloudflare Worker (admin-only middleware)
        // to prevent any authenticated user from promoting themselves via the ANON key.
        togglePro: (userId: string, isPro: boolean) =>
            apiFetch('/admin/toggle-pro', { method: 'POST', body: JSON.stringify({ userId, isPro }) }),
        testPush: () => apiFetch<any>('/admin/test-push'),
        broadcastPush: (body: any) => apiFetch<any>('/admin/broadcast-push', { method: 'POST', body: JSON.stringify(body) })
    },
    // --- BRAZIL GAMES MODE ---
    brazilLeagues: {
        list: () => apiFetch<any[]>('/brazil-leagues'),
        search: (code: string) => apiFetch<any[]>(`/brazil-leagues?code=${encodeURIComponent(code)}`),
        getById: async (id: string) => {
            const { data, error } = await supabase
                .from('brazil_leagues')
                .select('*')
                .eq('id', id)
                .single();
            if (error) return null;
            return data;
        },
        getRankings: async (leagueId: string) => {
            const { data, error } = await supabase
                .from('brazil_league_rankings')
                .select('*')
                .eq('league_id', leagueId);
            if (error) return [];
            return data;
        },
        // SECURITY: create and update go through the Worker for server-side ownership validation.
        // This prevents users from injecting arbitrary admin_id or other fields.
        create: (leagueData: any) =>
            apiFetch<{ success: boolean; data: any }>('/brazil-leagues', {
                method: 'POST',
                body: JSON.stringify(leagueData)
            }),
        update: (id: string, updates: any) =>
            apiFetch('/brazil-leagues', {
                method: 'PUT',
                body: JSON.stringify({ id, ...updates })
            }),
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
        list: async (leagueId?: string | string[], userId?: string, matchIds?: string[]) => {
            const step = 1000;
            const allPredictions: any[] = [];
            let offset = 0;
            let keepFetching = true;

            while (keepFetching) {
                let query = supabase.from('brazil_predictions').select('*').order('user_id').order('match_id').range(offset, offset + step - 1);
                if (leagueId) {
                    if (Array.isArray(leagueId)) query = query.in('league_id', leagueId);
                    else query = query.eq('league_id', leagueId);
                }
                if (userId) query = query.eq('user_id', userId);
                if (matchIds && matchIds.length > 0) query = query.in('match_id', matchIds);

                const data = await supabaseWithRetry(async () => await query);
                const page = data as any[] || [];
                
                if (page.length === 0) {
                    keepFetching = false;
                } else {
                    allPredictions.push(...page);
                    offset += step;
                    if (page.length < step) keepFetching = false;
                }
            }
            return allPredictions;
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
        list: async (leagueId?: string | string[], userId?: string) => {
            const step = 1000;
            const allPredictions: any[] = [];
            let offset = 0;
            let keepFetching = true;

            while (keepFetching) {
                let query = supabase.from('top_finisher_predictions').select('*').order('user_id').order('league_id').range(offset, offset + step - 1);
                if (leagueId) {
                    if (Array.isArray(leagueId)) query = query.in('league_id', leagueId);
                    else query = query.eq('league_id', leagueId);
                }
                if (userId) query = query.eq('user_id', userId);

                const data = await supabaseWithRetry(async () => await query);
                const page = data as any[] || [];
                
                if (page.length === 0) {
                    keepFetching = false;
                } else {
                    allPredictions.push(...page);
                    offset += step;
                    if (page.length < step) keepFetching = false;
                }
            }
            return allPredictions;
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
    },
    teamHistory: {
        getForTeams: async (teams: string[]) => {
            const cacheKey = teams.sort().join('|');
            const cached = teamHistoryCache[cacheKey];
            if (cached && Date.now() - cached.timestamp < CACHE_TIME_MS) {
                return cached.data;
            }

            const dbTeams = teams.map(t => t === 'Coréia do Sul' ? 'Coreia do Sul' : t);
            const { data, error } = await supabase
                .from('team_matches_history')
                .select('*')
                .in('team_id', dbTeams)
                .order('match_order', { ascending: true });
            if (error) {
                console.error('Error fetching team history:', error);
                return [];
            }
            
            const mappedData = (data || []).map(h => ({
                ...h,
                team_id: h.team_id === 'Coreia do Sul' ? 'Coréia do Sul' : h.team_id
            }));
            
            teamHistoryCache[cacheKey] = { data: mappedData, timestamp: Date.now() };
            return mappedData;
        }
    },
    system: {
        triggerPushReminder: () => {
            fetch(`${getApiBase()}/push_reminder?secret=bolao2026_secure_webhook_key`).catch(() => {});
        }
    }
};
