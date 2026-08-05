import { supabase } from './supabase';

export interface MatchDetails {
  lineups: any;
  events: any;
  statistics: any;
}

export const fetchMatchDetails = async (matchId: string | number): Promise<MatchDetails | null> => {
  try {
    const { data, error } = await supabase
      .from('brasileirao_matches')
      .select('lineups, events, statistics')
      .eq('id', matchId)
      .single();

    if (error) {
      console.error('Erro ao buscar detalhes da partida:', error);
      return null;
    }

    return {
      lineups: data.lineups || null,
      events: data.events || null,
      statistics: data.statistics || null,
    };
  } catch (err) {
    console.error('Erro inesperado ao buscar detalhes da partida:', err);
    return null;
  }
};
