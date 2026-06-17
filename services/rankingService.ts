// rankingService.ts
import { User } from '../types';
import { supabase } from './supabase';
import { Capacitor } from '@capacitor/core';

export interface RankingEntry {
    league_id: string;
    user_id: string;
    total_points: number;
    exact_scores: number;
    winner_and_diff_count: number;
    winner_and_winner_goals_count: number;
    draw_count: number;
    only_winner_count: number;
    knockout_points: number;
    tf_total: number;
    profiles: {
        name: string;
        avatar: string;
        is_pro?: boolean;
    };
    
    // Front-end mapped user for compatibility
    user?: User;
}

export const fetchLeagueRankings = async (leagueId: string, leagueType: 'standard' | 'brazil' = 'standard'): Promise<RankingEntry[]> => {
    try {
        const isCapacitor = Capacitor.isNativePlatform() || !!(window as any).Capacitor?.isNativePlatform?.();
        const PRODUCAO_URL = 'https://bolaodacopa2026.app';
        const apiBase = isCapacitor ? `${PRODUCAO_URL}/api` : (import.meta.env.VITE_API_URL || '/api');
        
        const endpoint = leagueType === 'standard' ? '/rankings' : '/brazil-rankings';
        const fullUrl = `${apiBase}${endpoint}?leagueId=${leagueId}`;

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(fullUrl, { headers });
        if (!response.ok) {
            throw new Error(`Failed to fetch rankings: ${response.status}`);
        }
        const data: RankingEntry[] = await response.json();
        
        // Map the profiles to our standard User format so the UI components don't break
        return data.map(entry => ({
            ...entry,
            user: {
                id: entry.user_id,
                name: entry.profiles?.name || 'Usuário',
                avatar: entry.profiles?.avatar || '',
                email: '', // Email usually hidden in public ranking
                isPro: !!entry.profiles?.is_pro
            } as User
        }));
    } catch (e) {
        console.error('Error fetching rankings from API:', e);
        return [];
    }
};
