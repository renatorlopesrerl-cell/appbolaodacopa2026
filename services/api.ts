import { supabase } from './supabaseClient'; // Only for Auth Session

const API_BASE = '/api';

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

    const res = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (!res.ok) {
        // Handle 503 Service Unavailable specifically if needed by UI
        if (res.status === 503) {
            console.error("API Service Unavailable (Retries exhausted)");
        }
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `API Error: ${res.status}`);
    }

    return res.json();
}

export const api = {
    leagues: {
        list: () => apiFetch<any[]>('/leagues'),
        create: (data: any) => apiFetch('/leagues', { method: 'POST', body: JSON.stringify(data) }),
        update: (id: string, data: any) => apiFetch('/leagues', { method: 'PUT', body: JSON.stringify({ id, ...data }) }),
        delete: (id: string) => apiFetch(`/leagues?id=${id}`, { method: 'DELETE' }), // Owner Delete (api/leagues handles it)

        // Actions
        join: (id: string) => apiFetch('/leagues/join', { method: 'POST', body: JSON.stringify({ id }) }),

        // Members Management
        approveUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'approve' }) }),
        rejectUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'reject' }) }),
        removeUser: (leagueId: string, userId: string) => apiFetch('/leagues/members', { method: 'POST', body: JSON.stringify({ leagueId, userId, action: 'remove' }) }),

        // Invites
        invite: (leagueId: string, email: string) => apiFetch('/leagues/invites', { method: 'POST', body: JSON.stringify({ leagueId, email, action: 'invite' }) }),
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
        update: (data: any) => apiFetch('/profiles', { method: 'POST', body: JSON.stringify(data) })
    },
    predictions: {
        list: () => apiFetch<any[]>('/predictions'),
        submit: (data: any) => apiFetch('/predictions', { method: 'POST', body: JSON.stringify(data) })
    }
};
