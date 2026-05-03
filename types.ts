
export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  FINISHED = 'FINISHED'
}

export enum Phase {
  GROUP = 'Grupos',
  ROUND_32 = '16-avos de Final',
  ROUND_16 = 'Oitavas de Final',
  QUARTER = 'Quartas de Final',
  SEMI = 'Semifinal',
  FINAL = 'Final'
}

export interface Team {
  id: string;
  name: string;
  group: string;
}

export interface Match {
  id: string;
  homeTeamId: string; // "TBD" if not yet decided
  awayTeamId: string; // "TBD" if not yet decided
  homeScore: number | null;
  awayScore: number | null;
  date: string; // ISO String
  phase: Phase;
  group?: string; // e.g. "A"
  status: MatchStatus;
  location: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  isAdmin?: boolean;
  whatsapp?: string;
  theme?: 'light' | 'dark'; // New field for theme preference
  notificationSettings?: {
    matchStart: boolean;
    matchEnd: boolean;
    predictionReminder?: boolean;
  };
  isPro?: boolean;
  proExpiresAt?: string; // ISO Date String
  provider?: string;
}

export interface Prediction {
  userId: string;
  matchId: string;
  homeScore: number;
  awayScore: number;
  leagueId: string;
  points?: number; // Calculated after match finishes
}

export type LeaguePlan = 'FREE' | 'VIP_BASIC' | 'VIP' | 'VIP_MASTER' | 'VIP_UNLIMITED';

export interface LeagueSettings {
  exactScore: number;
  winnerAndDiff: number;
  winner: number;
  draw: number; // Correct draw but wrong score (e.g. bet 1-1, result 2-2)
  isUnlimited?: boolean; // Deprecated: keep for backward compatibility
  plan?: LeaguePlan; // New field controlling the limit
}

export interface League {
  id: string;
  name: string;
  image?: string; // URL or Base64 of league logo
  description?: string; // New field
  leagueCode?: string; // Unique 6-char code
  adminId: string;
  isPrivate: boolean;
  participants: string[]; // User IDs
  pendingRequests: string[]; // User IDs
  settings: LeagueSettings;
}

export interface Invitation {
  id: string;
  leagueId: string;
  email: string;
  status: 'pending' | 'accepted' | 'rejected';
  leagueType: 'standard' | 'brazil';
}

export interface GroupStanding {
  teamId: string;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  gd: number;
}

// --- BRAZIL GAMES MODE ---
export const BRAZIL_PLAYERS = [
  'Marquinhos', 'Gabriel Magalhães', 'Wesley', 'Douglas Santos',
  'Casemiro', 'Bruno Guimarães', 'Vinicius Júnior', 'Raphinha',
  'Gabriel Martinelli', 'Matheus Cunha', 'Luiz Henrique'
] as const;

// Note: This is legacy for the initial 3 group matches. 
// New logic uses dynamic detection (team name === 'Brasil').
export const BRAZIL_MATCH_IDS = ['m-C1', 'm-C3', 'm-C5'] as const;


export interface BrazilLeagueSettings {
  exactScore: number;    // 10
  winnerAndDiff: number; // 7
  winnerAndWinnerGoals: number; // 6
  draw: number;          // 6
  winner: number;        // 5
  goalscorer: number;    // 2
  isUnlimited?: boolean;
  plan?: LeaguePlan;
}

export const DEFAULT_BRAZIL_SETTINGS: BrazilLeagueSettings = {
  exactScore: 10,
  winnerAndDiff: 7,
  winnerAndWinnerGoals: 6,
  draw: 6,
  winner: 5,
  goalscorer: 2,
  isUnlimited: false,
  plan: 'FREE'
};

export interface BrazilLeague {
  id: string;
  name: string;
  image?: string;
  description?: string;
  leagueCode?: string;
  adminId: string;
  isPrivate: boolean;
  participants: string[];
  pendingRequests: string[];
  settings: BrazilLeagueSettings;
}

export interface BrazilPrediction {
  userId: string;
  matchId: string;
  leagueId: string;
  homeScore: number;
  awayScore: number;
  playerPick: string; // player name picked to score
  points?: number;
  goalscorerPoints?: number;
}

// Admin records which players scored in each Brazil match
export interface BrazilMatchGoal {
  matchId: string;
  playerName: string;
  goals: number; // number of goals scored - points multiplied by this
}

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}