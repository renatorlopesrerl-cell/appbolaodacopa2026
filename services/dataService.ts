import { Match, MatchStatus, Phase, Team, League, User, Prediction, GroupStanding } from '../types';

// --- INITIAL DATA SETUP ---

export const GROUPS_CONFIG: Record<string, string[]> = {
  A: ['México', 'África do Sul', 'Coréia do Sul', 'Europa D'],
  B: ['Canadá', 'Europa A', 'Catar', 'Suíça'],
  C: ['Brasil', 'Marrocos', 'Haiti', 'Escócia'],
  D: ['Estados Unidos', 'Paraguai', 'Austrália', 'Europa C'],
  E: ['Alemanha', 'Curaçau', 'Costa do Marfim', 'Equador'],
  F: ['Holanda', 'Japão', 'Europa B', 'Tunísia'],
  G: ['Bélgica', 'Egito', 'Irã', 'Nova Zelândia'],
  H: ['Espanha', 'Cabo Verde', 'Arábia Saudita', 'Uruguai'],
  I: ['França', 'Senegal', 'Intercontinental 2', 'Noruega'],
  J: ['Argentina', 'Argélia', 'Áustria', 'Jordânia'],
  K: ['Portugal', 'Intercontinental 1', 'Uzbequistão', 'Colômbia'],
  L: ['Inglaterra', 'Croácia', 'Gana', 'Panamá'],
};

// Flatten teams for easy access
export const ALL_TEAMS: Team[] = Object.entries(GROUPS_CONFIG).flatMap(([group, names]) =>
  names.map(name => ({ id: name, name, group }))
);

// Map Portuguese names to ISO 3166-1 alpha-2 codes for FlagCDN
const FLAG_CODES: Record<string, string> = {
  'México': 'mx', 'África do Sul': 'za', 'Coréia do Sul': 'kr',
  'Canadá': 'ca', 'Catar': 'qa', 'Suíça': 'ch',
  'Brasil': 'br', 'Marrocos': 'ma', 'Haiti': 'ht', 'Escócia': 'gb-sct',
  'Estados Unidos': 'us', 'Paraguai': 'py', 'Austrália': 'au',
  'Alemanha': 'de', 'Curaçau': 'cw', 'Costa do Marfim': 'ci', 'Equador': 'ec',
  'Holanda': 'nl', 'Japão': 'jp', 'Tunísia': 'tn',
  'Bélgica': 'be', 'Egito': 'eg', 'Irã': 'ir', 'Nova Zelândia': 'nz',
  'Espanha': 'es', 'Cabo Verde': 'cv', 'Arábia Saudita': 'sa', 'Uruguai': 'uy',
  'França': 'fr', 'Senegal': 'sn', 'Noruega': 'no',
  'Argentina': 'ar', 'Argélia': 'dz', 'Áustria': 'at', 'Jordânia': 'jo',
  'Portugal': 'pt', 'Uzbequistão': 'uz', 'Colômbia': 'co',
  'Inglaterra': 'gb-eng', 'Croácia': 'hr', 'Gana': 'gh', 'Panamá': 'pa'
};

export const getTeamFlag = (teamName: string): string => {
  // Placeholder for TBD teams - Increased resolution
  if (teamName.includes('Venc.') || teamName.includes('Perd.') || teamName.includes('Grupo')) {
    return 'https://placehold.co/160x120/e2e8f0/94a3b8?text=?';
  }

  // Question mark for placeholders (Europa/Intercontinental) - Increased resolution
  if (teamName.includes('Europa') || teamName.includes('Intercontinental')) {
    return 'https://placehold.co/160x120/cbd5e1/475569?text=?';
  }

  const code = FLAG_CODES[teamName];
  if (code) {
    // Changed from w40 to w160 for better quality (High DPI screens)
    return `https://flagcdn.com/w160/${code}.png`;
  }

  // Fallback - Increased resolution
  return 'https://placehold.co/160x120/e2e8f0/94a3b8?text=?';
};

// Realistic Database for World Cup 2026
// Dates are formatted in ISO 8601 (UTC)
export const INITIAL_MATCHES: Match[] = [
  { id: 'm-A1', homeTeamId: 'México', awayTeamId: 'África do Sul', date: '2026-06-11T19:00:00+00:00', location: 'Estádio Azteca, Cidade do México', group: 'A', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-A2', homeTeamId: 'Coréia do Sul', awayTeamId: 'Europa D', date: '2026-06-12T02:00:00+00:00', location: 'Estádio Akron, Guadalajara', group: 'A', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-A3', homeTeamId: 'México', awayTeamId: 'Coréia do Sul', date: '2026-06-19T01:00:00+00:00', location: 'Estádio Akron, Guadalajara', group: 'A', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-A4', homeTeamId: 'Europa D', awayTeamId: 'África do Sul', date: '2026-06-18T16:00:00+00:00', location: 'Mercedes-Benz Stadium, Atlanta', group: 'A', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-A5', homeTeamId: 'Europa D', awayTeamId: 'México', date: '2026-06-25T01:00:00+00:00', location: 'Estádio Azteca, Cidade do México', group: 'A', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-A6', homeTeamId: 'África do Sul', awayTeamId: 'Coréia do Sul', date: '2026-06-25T01:00:00+00:00', location: 'Estádio BBVA, Monterrey', group: 'A', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-B1', homeTeamId: 'Canadá', awayTeamId: 'Europa A', date: '2026-06-12T19:00:00+00:00', location: 'BMO Field, Toronto', group: 'B', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-B2', homeTeamId: 'Catar', awayTeamId: 'Suíça', date: '2026-06-13T19:00:00+00:00', location: 'BC Place, Vancouver', group: 'B', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-B3', homeTeamId: 'Canadá', awayTeamId: 'Catar', date: '2026-06-18T22:00:00+00:00', location: 'BC Place, Vancouver', group: 'B', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-B4', homeTeamId: 'Suíça', awayTeamId: 'Europa A', date: '2026-06-18T19:00:00+00:00', location: 'Lumen Field, Seattle', group: 'B', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-B5', homeTeamId: 'Suíça', awayTeamId: 'Canadá', date: '2026-06-24T19:00:00+00:00', location: 'BC Place, Vancouver', group: 'B', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-B6', homeTeamId: 'Europa A', awayTeamId: 'Catar', date: '2026-06-24T19:00:00+00:00', location: 'Lumen Field, Seattle', group: 'B', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-C1', homeTeamId: 'Brasil', awayTeamId: 'Marrocos', date: '2026-06-13T22:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'C', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-C2', homeTeamId: 'Haiti', awayTeamId: 'Escócia', date: '2026-06-14T01:00:00+00:00', location: 'Gillette Stadium, Boston', group: 'C', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-C3', homeTeamId: 'Brasil', awayTeamId: 'Haiti', date: '2026-06-20T01:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'C', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-C4', homeTeamId: 'Escócia', awayTeamId: 'Marrocos', date: '2026-06-19T22:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'C', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-C5', homeTeamId: 'Escócia', awayTeamId: 'Brasil', date: '2026-06-24T22:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'C', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-C6', homeTeamId: 'Marrocos', awayTeamId: 'Haiti', date: '2026-06-24T22:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'C', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-D1', homeTeamId: 'Estados Unidos', awayTeamId: 'Paraguai', date: '2026-06-13T01:00:00+00:00', location: 'SoFi Stadium, Los Angeles', group: 'D', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-D2', homeTeamId: 'Austrália', awayTeamId: 'Europa C', date: '2026-06-13T04:00:00+00:00', location: "Levi's Stadium, San Francisco", group: 'D', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-D3', homeTeamId: 'Estados Unidos', awayTeamId: 'Austrália', date: '2026-06-19T19:00:00+00:00', location: 'SoFi Stadium, Los Angeles', group: 'D', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-D4', homeTeamId: 'Europa C', awayTeamId: 'Paraguai', date: '2026-06-19T04:00:00+00:00', location: "Levi's Stadium, San Francisco", group: 'D', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-D5', homeTeamId: 'Europa C', awayTeamId: 'Estados Unidos', date: '2026-06-26T02:00:00+00:00', location: 'SoFi Stadium, Los Angeles', group: 'D', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-D6', homeTeamId: 'Paraguai', awayTeamId: 'Austrália', date: '2026-06-26T02:00:00+00:00', location: "Levi's Stadium, San Francisco", group: 'D', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-E1', homeTeamId: 'Alemanha', awayTeamId: 'Curaçau', date: '2026-06-14T17:00:00+00:00', location: 'Mercedes-Benz Stadium, Atlanta', group: 'E', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-E2', homeTeamId: 'Costa do Marfim', awayTeamId: 'Equador', date: '2026-06-14T23:00:00+00:00', location: 'NRG Stadium, Houston', group: 'E', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-E3', homeTeamId: 'Alemanha', awayTeamId: 'Costa do Marfim', date: '2026-06-20T20:00:00+00:00', location: 'AT&T Stadium, Dallas', group: 'E', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-E4', homeTeamId: 'Equador', awayTeamId: 'Curaçau', date: '2026-06-21T00:00:00+00:00', location: 'NRG Stadium, Houston', group: 'E', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-E5', homeTeamId: 'Equador', awayTeamId: 'Alemanha', date: '2026-06-25T20:00:00+00:00', location: 'AT&T Stadium, Dallas', group: 'E', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-E6', homeTeamId: 'Curaçau', awayTeamId: 'Costa do Marfim', date: '2026-06-25T20:00:00+00:00', location: 'NRG Stadium, Houston', group: 'E', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-F1', homeTeamId: 'Holanda', awayTeamId: 'Japão', date: '2026-06-14T20:00:00+00:00', location: 'Arrowhead Stadium, Kansas City', group: 'F', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-F2', homeTeamId: 'Europa B', awayTeamId: 'Tunísia', date: '2026-06-15T02:00:00+00:00', location: 'AT&T Stadium, Dallas', group: 'F', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-F3', homeTeamId: 'Holanda', awayTeamId: 'Europa B', date: '2026-06-20T17:00:00+00:00', location: 'Mercedes-Benz Stadium, Atlanta', group: 'F', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-F4', homeTeamId: 'Tunísia', awayTeamId: 'Japão', date: '2026-06-21T04:00:00+00:00', location: 'Arrowhead Stadium, Kansas City', group: 'F', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-F5', homeTeamId: 'Tunísia', awayTeamId: 'Holanda', date: '2026-06-25T23:00:00+00:00', location: 'AT&T Stadium, Dallas', group: 'F', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-F6', homeTeamId: 'Japão', awayTeamId: 'Europa B', date: '2026-06-25T23:00:00+00:00', location: 'Arrowhead Stadium, Kansas City', group: 'F', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-G1', homeTeamId: 'Bélgica', awayTeamId: 'Egito', date: '2026-06-15T19:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'G', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-G2', homeTeamId: 'Irã', awayTeamId: 'Nova Zelândia', date: '2026-06-16T01:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'G', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-G3', homeTeamId: 'Bélgica', awayTeamId: 'Irã', date: '2026-06-21T19:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'G', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-G4', homeTeamId: 'Nova Zelândia', awayTeamId: 'Egito', date: '2026-06-22T01:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'G', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-G5', homeTeamId: 'Nova Zelândia', awayTeamId: 'Bélgica', date: '2026-06-27T03:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'G', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-G6', homeTeamId: 'Egito', awayTeamId: 'Irã', date: '2026-06-27T03:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'G', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-H1', homeTeamId: 'Espanha', awayTeamId: 'Cabo Verde', date: '2026-06-15T16:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'H', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-H2', homeTeamId: 'Arábia Saudita', awayTeamId: 'Uruguai', date: '2026-06-15T22:00:00+00:00', location: 'Mercedes-Benz Stadium, Atlanta', group: 'H', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-H3', homeTeamId: 'Espanha', awayTeamId: 'Arábia Saudita', date: '2026-06-21T16:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'H', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-H4', homeTeamId: 'Uruguai', awayTeamId: 'Cabo Verde', date: '2026-06-21T22:00:00+00:00', location: 'Mercedes-Benz Stadium, Atlanta', group: 'H', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-H5', homeTeamId: 'Uruguai', awayTeamId: 'Espanha', date: '2026-06-27T00:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'H', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-H6', homeTeamId: 'Cabo Verde', awayTeamId: 'Arábia Saudita', date: '2026-06-27T00:00:00+00:00', location: 'Mercedes-Benz Stadium, Atlanta', group: 'H', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-I1', homeTeamId: 'França', awayTeamId: 'Senegal', date: '2026-06-16T19:00:00+00:00', location: 'Gillette Stadium, Boston', group: 'I', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-I2', homeTeamId: 'Intercontinental 2', awayTeamId: 'Noruega', date: '2026-06-16T22:00:00+00:00', location: 'BMO Field, Toronto', group: 'I', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-I3', homeTeamId: 'França', awayTeamId: 'Intercontinental 2', date: '2026-06-22T21:00:00+00:00', location: 'Gillette Stadium, Boston', group: 'I', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-I4', homeTeamId: 'Noruega', awayTeamId: 'Senegal', date: '2026-06-23T00:00:00+00:00', location: 'BMO Field, Toronto', group: 'I', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-I5', homeTeamId: 'Noruega', awayTeamId: 'França', date: '2026-06-26T19:00:00+00:00', location: 'Gillette Stadium, Boston', group: 'I', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-I6', homeTeamId: 'Senegal', awayTeamId: 'Intercontinental 2', date: '2026-06-26T19:00:00+00:00', location: 'BMO Field, Toronto', group: 'I', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-J1', homeTeamId: 'Argentina', awayTeamId: 'Argélia', date: '2026-06-17T01:00:00+00:00', location: 'SoFi Stadium, Los Angeles', group: 'J', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-J2', homeTeamId: 'Áustria', awayTeamId: 'Jordânia', date: '2026-06-17T04:00:00+00:00', location: "Levi's Stadium, San Francisco", group: 'J', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-J3', homeTeamId: 'Argentina', awayTeamId: 'Áustria', date: '2026-06-22T17:00:00+00:00', location: 'SoFi Stadium, Los Angeles', group: 'J', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-J4', homeTeamId: 'Jordânia', awayTeamId: 'Argélia', date: '2026-06-23T03:00:00+00:00', location: "Levi's Stadium, San Francisco", group: 'J', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-J5', homeTeamId: 'Jordânia', awayTeamId: 'Argentina', date: '2026-06-28T02:00:00+00:00', location: 'SoFi Stadium, Los Angeles', group: 'J', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-J6', homeTeamId: 'Argélia', awayTeamId: 'Áustria', date: '2026-06-28T02:00:00+00:00', location: "Levi's Stadium, San Francisco", group: 'J', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-K1', homeTeamId: 'Portugal', awayTeamId: 'Intercontinental 1', date: '2026-06-17T17:00:00+00:00', location: 'Gillette Stadium, Boston', group: 'K', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-K2', homeTeamId: 'Uzbequistão', awayTeamId: 'Colômbia', date: '2026-06-18T02:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'K', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-K3', homeTeamId: 'Portugal', awayTeamId: 'Uzbequistão', date: '2026-06-23T17:00:00+00:00', location: 'Gillette Stadium, Boston', group: 'K', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-K4', homeTeamId: 'Colômbia', awayTeamId: 'Intercontinental 1', date: '2026-06-24T02:00:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'K', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-K5', homeTeamId: 'Colômbia', awayTeamId: 'Portugal', date: '2026-06-27T23:30:00+00:00', location: 'Gillette Stadium, Boston', group: 'K', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-K6', homeTeamId: 'Intercontinental 1', awayTeamId: 'Uzbequistão', date: '2026-06-27T23:30:00+00:00', location: 'MetLife Stadium, Nova Jersey', group: 'K', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-L1', homeTeamId: 'Inglaterra', awayTeamId: 'Croácia', date: '2026-06-17T20:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'L', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-L2', homeTeamId: 'Gana', awayTeamId: 'Panamá', date: '2026-06-17T23:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'L', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-L3', homeTeamId: 'Inglaterra', awayTeamId: 'Gana', date: '2026-06-23T20:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'L', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-L4', homeTeamId: 'Panamá', awayTeamId: 'Croácia', date: '2026-06-23T23:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'L', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-L5', homeTeamId: 'Panamá', awayTeamId: 'Inglaterra', date: '2026-06-27T21:00:00+00:00', location: 'Lincoln Financial Field, Filadélfia', group: 'L', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-L6', homeTeamId: 'Croácia', awayTeamId: 'Gana', date: '2026-06-27T21:00:00+00:00', location: 'Hard Rock Stadium, Miami', group: 'L', phase: Phase.GROUP, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  // R32
  { id: 'm-R32-1', homeTeamId: '1º Grupo E', awayTeamId: '3º Grupo A/B/C/D/F', date: '2026-06-29T17:30:00-04:00', location: 'Estádio Gillette, Boston', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-2', homeTeamId: '1º Grupo I', awayTeamId: '3º Grupo C/D/F/G/H', date: '2026-06-30T18:00:00-04:00', location: 'MetLife Stadium, Nova Jersey', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-3', homeTeamId: '2º Grupo A', awayTeamId: '2º Grupo B', date: '2026-06-28T16:00:00-07:00', location: 'SoFi Stadium, Los Angeles', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-4', homeTeamId: '1º Grupo F', awayTeamId: '2º Grupo C', date: '2026-06-29T22:00:00-06:00', location: 'Estádio BBVA, Monterrey', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-5', homeTeamId: '2º Grupo K', awayTeamId: '2º Grupo L', date: '2026-07-02T20:00:00-04:00', location: 'BMO Field, Toronto', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-6', homeTeamId: '1º Grupo H', awayTeamId: '2º Grupo J', date: '2026-07-02T16:00:00-07:00', location: 'SoFi Stadium, Los Angeles', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-7', homeTeamId: '1º Grupo D', awayTeamId: '3º Grupo B/E/F/I/J', date: '2026-07-01T21:00:00-07:00', location: "Levi's Stadium, Santa Clara", phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-8', homeTeamId: '1º Grupo G', awayTeamId: '3º Grupo A/E/H/I/J', date: '2026-07-01T17:00:00-07:00', location: 'Lumen Field, Seattle', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-9', homeTeamId: '1º Grupo C', awayTeamId: '2º Grupo F', date: '2026-06-29T14:00:00-05:00', location: 'NRG Stadium, Houston', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-10', homeTeamId: '2º Grupo E', awayTeamId: '2º Grupo I', date: '2026-06-30T14:00:00-05:00', location: 'AT&T Stadium, Dallas', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-11', homeTeamId: '1º Grupo A', awayTeamId: '3º Grupo C/E/F/H/I', date: '2026-06-30T22:00:00-06:00', location: 'Estádio Azteca, Cidade do México', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-12', homeTeamId: '1º Grupo L', awayTeamId: '3º Grupo E/H/I/J/K', date: '2026-07-01T13:00:00-04:00', location: 'Mercedes-Benz Stadium, Atlanta', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-13', homeTeamId: '1º Grupo J', awayTeamId: '2º Grupo H', date: '2026-07-03T19:00:00-04:00', location: 'Hard Rock Stadium, Miami', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-14', homeTeamId: '2º Grupo D', awayTeamId: '2º Grupo G', date: '2026-07-03T15:00:00-05:00', location: 'AT&T Stadium, Dallas', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-15', homeTeamId: '1º Grupo B', awayTeamId: '3º Grupo E/F/G/I/H', date: '2026-07-03T00:00:00-07:00', location: 'BC Place, Vancouver', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R32-16', homeTeamId: '1º Grupo K', awayTeamId: '3º Grupo D/E/I/J/L', date: '2026-07-03T22:30:00-05:00', location: 'Arrowhead Stadium, Kansas City', phase: Phase.ROUND_32, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },

  // R16
  { id: 'm-R16-1', homeTeamId: 'Venc. R32-1', awayTeamId: 'Venc. R32-2', date: '2026-07-04T18:00:00-04:00', location: 'Lincoln Financial Field, Filadélfia', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-2', homeTeamId: 'Venc. R32-3', awayTeamId: 'Venc. R32-4', date: '2026-07-04T14:00:00-05:00', location: 'NRG Stadium, Houston', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-3', homeTeamId: 'Venc. R32-5', awayTeamId: 'Venc. R32-6', date: '2026-07-06T16:00:00-05:00', location: 'AT&T Stadium, Dallas', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-4', homeTeamId: 'Venc. R32-7', awayTeamId: 'Venc. R32-8', date: '2026-07-06T21:00:00-07:00', location: 'Lumen Field, Seattle', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-5', homeTeamId: 'Venc. R32-9', awayTeamId: 'Venc. R32-10', date: '2026-07-05T17:00:00-04:00', location: 'MetLife Stadium, Nova Jersey', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-6', homeTeamId: 'Venc. R32-11', awayTeamId: 'Venc. R32-12', date: '2026-07-05T21:00:00-06:00', location: 'Estádio Azteca, Cidade do México', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-7', homeTeamId: 'Venc. R32-13', awayTeamId: 'Venc. R32-14', date: '2026-07-07T13:00:00-04:00', location: 'Mercedes-Benz Stadium, Atlanta', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-R16-8', homeTeamId: 'Venc. R32-15', awayTeamId: 'Venc. R32-16', date: '2026-07-07T17:00:00-07:00', location: 'BC Place, Vancouver', phase: Phase.ROUND_16, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },

  // QF
  { id: 'm-QF-1', homeTeamId: 'Venc. R16-1', awayTeamId: 'Venc. R16-2', date: '2026-07-09T17:00:00-04:00', location: 'Estádio Gillette, Boston', phase: Phase.QUARTER, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-QF-2', homeTeamId: 'Venc. R16-3', awayTeamId: 'Venc. R16-4', date: '2026-07-10T16:00:00-07:00', location: 'SoFi Stadium, Los Angeles', phase: Phase.QUARTER, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-QF-3', homeTeamId: 'Venc. R16-5', awayTeamId: 'Venc. R16-6', date: '2026-07-11T18:00:00-04:00', location: 'Hard Rock Stadium, Miami', phase: Phase.QUARTER, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-QF-4', homeTeamId: 'Venc. R16-7', awayTeamId: 'Venc. R16-8', date: '2026-07-11T22:00:00-05:00', location: 'Arrowhead Stadium, Kansas City', phase: Phase.QUARTER, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },

  // SF
  { id: 'm-SF-1', homeTeamId: 'Venc. QF-1', awayTeamId: 'Venc. QF-2', date: '2026-07-14T16:00:00-05:00', location: 'AT&T Stadium, Dallas', phase: Phase.SEMI, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-SF-2', homeTeamId: 'Venc. QF-3', awayTeamId: 'Venc. QF-4', date: '2026-07-15T16:00:00-04:00', location: 'Mercedes-Benz Stadium, Atlanta', phase: Phase.SEMI, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },

  // FINAL / 3RD
  { id: 'm-3RD', homeTeamId: 'Perd. SF-1', awayTeamId: 'Perd. SF-2', date: '2026-07-18T18:00:00-04:00', location: 'Hard Rock Stadium, Miami', phase: Phase.FINAL, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null },
  { id: 'm-FINAL', homeTeamId: 'Venc. SF-1', awayTeamId: 'Venc. SF-2', date: '2026-07-19T16:00:00-04:00', location: 'MetLife Stadium, Nova Jersey', phase: Phase.FINAL, status: MatchStatus.SCHEDULED, homeScore: null, awayScore: null }
];

// --- LOGIC HELPERS ---

export const getTeam = (id: string): Team | undefined => ALL_TEAMS.find(t => t.id === id);

// Calculate Match Round (1, 2, or 3) for Groups
export const getMatchRound = (match: Match, allMatches: Match[]): number | null => {
  if (match.phase !== Phase.GROUP || !match.group) return null;
  const groupMatches = allMatches
    .filter(m => m.group === match.group && m.phase === Phase.GROUP)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const index = groupMatches.findIndex(m => m.id === match.id);
  if (index === -1) return null;
  return Math.floor(index / 2) + 1;
};

export const calculatePoints = (
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  settings: { exactScore: number, winnerAndDiff: number, winner: number, draw: number }
): number => {
  // 1. Exact Score
  if (predHome === actualHome && predAway === actualAway) {
    return settings.exactScore;
  }

  const predDiff = predHome - predAway;
  const actualDiff = actualHome - actualAway;
  const predWinner = predDiff > 0 ? 'HOME' : (predDiff < 0 ? 'AWAY' : 'DRAW');
  const actualWinner = actualDiff > 0 ? 'HOME' : (actualDiff < 0 ? 'AWAY' : 'DRAW');

  // 2. Winner + Goal Diff (only if not a draw, usually)
  // If it's a draw, exact score covers specific draws, generic draw covers the rest.
  if (predWinner === actualWinner) {
    if (predWinner !== 'DRAW' && predDiff === actualDiff) {
      return settings.winnerAndDiff;
    }
    // 3. Winner
    if (predWinner !== 'DRAW') {
      return settings.winner;
    }
    // 4. Draw (but not exact score)
    return settings.draw;
  }

  return 0;
};

export const calculateStandings = (matches: Match[]): Record<string, GroupStanding[]> => {
  const standings: Record<string, Record<string, GroupStanding>> = {};

  // Initialize
  Object.keys(GROUPS_CONFIG).forEach(group => {
    standings[group] = {};
    GROUPS_CONFIG[group].forEach(teamName => {
      standings[group][teamName] = {
        teamId: teamName, points: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0
      };
    });
  });

  // Process Matches - Includes FINISHED and IN_PROGRESS matches
  matches.filter(m =>
    m.phase === Phase.GROUP &&
    (m.status === MatchStatus.FINISHED || m.status === MatchStatus.IN_PROGRESS) &&
    m.group
  ).forEach(match => {
    const group = match.group!;
    const home = standings[group][match.homeTeamId];
    const away = standings[group][match.awayTeamId];

    if (!home || !away) return; // Should not happen

    const hScore = match.homeScore || 0;
    const aScore = match.awayScore || 0;

    home.played++; away.played++;
    home.gf += hScore; home.ga += aScore; home.gd = home.gf - home.ga;
    away.gf += aScore; away.ga += hScore; away.gd = away.gf - away.ga;

    if (hScore > aScore) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (aScore > hScore) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points += 1;
      away.drawn++; away.points += 1;
    }
  });

  // Convert to array and sort
  const result: Record<string, GroupStanding[]> = {};
  Object.keys(standings).forEach(group => {
    result[group] = Object.values(standings[group]).sort((a, b) => {
      // 1. Points
      if (b.points !== a.points) return b.points - a.points;
      // 2. Goal Difference (Saldo de Gols)
      if (b.gd !== a.gd) return b.gd - a.gd;
      // 3. Goals For (Gols Marcados)
      if (b.gf !== a.gf) return b.gf - a.gf;
      // 4. Fair Play (Not tracked, random/alphabetic fallback)
      return a.teamId.localeCompare(b.teamId);
    });
  });

  return result;
};

export const isPredictionLocked = (matchDate: string, currentTime: Date): boolean => {
  const matchTime = new Date(matchDate).getTime();
  const lockThreshold = 5 * 60 * 1000; // 5 Minutes
  return currentTime.getTime() >= (matchTime - lockThreshold);
};

// --- IMAGE COMPRESSION UTILITY ---
export const processImageForUpload = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        // Resize logic
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context failed'));
          return;
        }

        // CORREÇÃO: Preencher fundo branco para evitar transparência preta em JPEGs
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Quality reduction loop
        // Target: ~500KB (approx 680,000 base64 chars)
        const MAX_CHARS = 680000;
        let quality = 0.9;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        while (dataUrl.length > MAX_CHARS && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};