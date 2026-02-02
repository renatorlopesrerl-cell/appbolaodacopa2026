
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
  pix?: string;
  theme?: 'light' | 'dark'; // New field for theme preference
  notificationSettings?: {
    matchStart: boolean;
    matchEnd: boolean;
    predictionReminder?: boolean;
  };
  isPro?: boolean;
  proExpiresAt?: string; // ISO Date String
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

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}