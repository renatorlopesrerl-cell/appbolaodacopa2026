-- Arquivo: update_matches_2026.sql
-- Descrição: Atualiza as datas, horários, locais e chaveamentos dos jogos da fase final da Copa 2026.
-- Horário de Brasília (-03:00) definido nas strings ISO.

-- 16-avos de Final (Round of 32)
UPDATE matches SET date = '2026-06-29T17:30:00-03:00', location = 'Estádio Gillette, Boston', home_team_id = '1º Grupo E', away_team_id = '3º Grupo A/B/C/D/F' WHERE id = 'm-R32-1';
UPDATE matches SET date = '2026-06-30T18:00:00-03:00', location = 'MetLife Stadium, Nova Jersey', home_team_id = '1º Grupo I', away_team_id = '3º Grupo C/D/F/G/H' WHERE id = 'm-R32-2';
UPDATE matches SET date = '2026-06-28T16:00:00-03:00', location = 'SoFi Stadium, Los Angeles', home_team_id = '2º Grupo A', away_team_id = '2º Grupo B' WHERE id = 'm-R32-3';
UPDATE matches SET date = '2026-06-29T22:00:00-03:00', location = 'Estádio BBVA, Monterrey', home_team_id = '1º Grupo F', away_team_id = '2º Grupo C' WHERE id = 'm-R32-4';
UPDATE matches SET date = '2026-07-02T20:00:00-03:00', location = 'BMO Field, Toronto', home_team_id = '2º Grupo K', away_team_id = '2º Grupo L' WHERE id = 'm-R32-5';
UPDATE matches SET date = '2026-07-02T16:00:00-03:00', location = 'SoFi Stadium, Los Angeles', home_team_id = '1º Grupo H', away_team_id = '2º Grupo J' WHERE id = 'm-R32-6';
UPDATE matches SET date = '2026-07-01T21:00:00-03:00', location = 'Levi''s Stadium, San Francisco', home_team_id = '1º Grupo D', away_team_id = '3º Grupo B/E/F/I/J' WHERE id = 'm-R32-7';
UPDATE matches SET date = '2026-07-01T17:00:00-03:00', location = 'Lumen Field, Seattle', home_team_id = '1º Grupo G', away_team_id = '3º Grupo A/E/H/I/J' WHERE id = 'm-R32-8';
UPDATE matches SET date = '2026-06-29T14:00:00-03:00', location = 'NRG Stadium, Houston', home_team_id = '1º Grupo C', away_team_id = '2º Grupo F' WHERE id = 'm-R32-9';
UPDATE matches SET date = '2026-06-30T14:00:00-03:00', location = 'AT&T Stadium, Dallas', home_team_id = '2º Grupo E', away_team_id = '2º Grupo I' WHERE id = 'm-R32-10';
UPDATE matches SET date = '2026-06-30T22:00:00-03:00', location = 'Estádio Azteca, Cidade do México', home_team_id = '1º Grupo A', away_team_id = '3º Grupo C/E/F/H/I' WHERE id = 'm-R32-11';
UPDATE matches SET date = '2026-07-01T13:00:00-03:00', location = 'Mercedes-Benz Stadium, Atlanta', home_team_id = '1º Grupo L', away_team_id = '3º Grupo E/H/I/J/K' WHERE id = 'm-R32-12';
UPDATE matches SET date = '2026-07-03T19:00:00-03:00', location = 'Hard Rock Stadium, Miami', home_team_id = '1º Grupo J', away_team_id = '2º Grupo H' WHERE id = 'm-R32-13';
UPDATE matches SET date = '2026-07-03T15:00:00-03:00', location = 'AT&T Stadium, Dallas', home_team_id = '2º Grupo D', away_team_id = '2º Grupo G' WHERE id = 'm-R32-14';
UPDATE matches SET date = '2026-07-03T00:00:00-03:00', location = 'BC Place, Vancouver', home_team_id = '1º Grupo B', away_team_id = '3º Grupo E/F/G/I/J' WHERE id = 'm-R32-15';
UPDATE matches SET date = '2026-07-03T22:30:00-03:00', location = 'Arrowhead Stadium, Kansas City', home_team_id = '1º Grupo K', away_team_id = '3º Grupo D/E/I/J/L' WHERE id = 'm-R32-16';

-- Oitavas de Final (Round of 16)
UPDATE matches SET date = '2026-07-04T18:00:00-03:00', location = 'Lincoln Financial Field, Filadélfia', home_team_id = 'Venc. R32-1', away_team_id = 'Venc. R32-2' WHERE id = 'm-R16-1';
UPDATE matches SET date = '2026-07-04T14:00:00-03:00', location = 'NRG Stadium, Houston', home_team_id = 'Venc. R32-3', away_team_id = 'Venc. R32-4' WHERE id = 'm-R16-2';
UPDATE matches SET date = '2026-07-06T16:00:00-03:00', location = 'AT&T Stadium, Dallas', home_team_id = 'Venc. R32-5', away_team_id = 'Venc. R32-6' WHERE id = 'm-R16-3';
UPDATE matches SET date = '2026-07-06T21:00:00-03:00', location = 'Lumen Field, Seattle', home_team_id = 'Venc. R32-7', away_team_id = 'Venc. R32-8' WHERE id = 'm-R16-4';
UPDATE matches SET date = '2026-07-05T17:00:00-03:00', location = 'MetLife Stadium, Nova Jersey', home_team_id = 'Venc. R32-9', away_team_id = 'Venc. R32-10' WHERE id = 'm-R16-5';
UPDATE matches SET date = '2026-07-05T21:00:00-03:00', location = 'Estádio Azteca, Cidade do México', home_team_id = 'Venc. R32-11', away_team_id = 'Venc. R32-12' WHERE id = 'm-R16-6';
UPDATE matches SET date = '2026-07-07T13:00:00-03:00', location = 'Mercedes-Benz Stadium, Atlanta', home_team_id = 'Venc. R32-13', away_team_id = 'Venc. R32-14' WHERE id = 'm-R16-7';
UPDATE matches SET date = '2026-07-07T17:00:00-03:00', location = 'BC Place, Vancouver', home_team_id = 'Venc. R32-15', away_team_id = 'Venc. R32-16' WHERE id = 'm-R16-8';

-- Quartas de Final (Quarter Finals)
UPDATE matches SET date = '2026-07-09T17:00:00-03:00', location = 'Estádio Gillette, Boston', home_team_id = 'Venc. R16-1', away_team_id = 'Venc. R16-2' WHERE id = 'm-QF-1';
UPDATE matches SET date = '2026-07-10T16:00:00-03:00', location = 'SoFi Stadium, Los Angeles', home_team_id = 'Venc. R16-3', away_team_id = 'Venc. R16-4' WHERE id = 'm-QF-2';
UPDATE matches SET date = '2026-07-11T18:00:00-03:00', location = 'Hard Rock Stadium, Miami', home_team_id = 'Venc. R16-5', away_team_id = 'Venc. R16-6' WHERE id = 'm-QF-3';
UPDATE matches SET date = '2026-07-11T22:00:00-03:00', location = 'Arrowhead Stadium, Kansas City', home_team_id = 'Venc. R16-7', away_team_id = 'Venc. R16-8' WHERE id = 'm-QF-4';

-- Semifinais (Semi Finals)
UPDATE matches SET date = '2026-07-14T16:00:00-03:00', location = 'AT&T Stadium, Dallas', home_team_id = 'Venc. QF-1', away_team_id = 'Venc. QF-2' WHERE id = 'm-SF-1';
UPDATE matches SET date = '2026-07-15T16:00:00-03:00', location = 'Mercedes-Benz Stadium, Atlanta', home_team_id = 'Venc. QF-3', away_team_id = 'Venc. QF-4' WHERE id = 'm-SF-2';

-- Final e Terceiro Lugar
UPDATE matches SET date = '2026-07-18T18:00:00-03:00', location = 'Hard Rock Stadium, Miami', home_team_id = 'Perd. SF-1', away_team_id = 'Perd. SF-2' WHERE id = 'm-3RD';
UPDATE matches SET date = '2026-07-19T16:00:00-03:00', location = 'MetLife Stadium, Nova Jersey', home_team_id = 'Venc. SF-1', away_team_id = 'Venc. SF-2' WHERE id = 'm-FINAL';
