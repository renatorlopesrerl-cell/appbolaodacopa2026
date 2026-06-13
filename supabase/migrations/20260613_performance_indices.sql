-- ==============================================================================
-- OTIMIZAÇÃO DE PERFORMANCE PARA ALTA ESCALA (1 MILHÃO+ DE PALPITES)
-- ==============================================================================

-- 1. Tabela: predictions
-- O índice match_id é essencial para a trigger calculate_match_points rodar instantaneamente.
CREATE INDEX IF NOT EXISTS idx_predictions_match_id ON predictions(match_id);
-- O índice league_id é essencial para carregar o ranking de uma liga rapidamente.
CREATE INDEX IF NOT EXISTS idx_predictions_league_id ON predictions(league_id);

-- 2. Tabela: brazil_predictions
-- Mesma lógica de indexação para o modo Brasil.
CREATE INDEX IF NOT EXISTS idx_brazil_predictions_match_id ON brazil_predictions(match_id);
CREATE INDEX IF NOT EXISTS idx_brazil_predictions_league_id ON brazil_predictions(league_id);

-- 3. Índices GIN para Arrays (Participantes) nas Ligas
-- Permite que o painel do usuário ("Minhas Ligas") carregue rapidamente
-- evitando Full Table Scan na tabela de ligas.
CREATE INDEX IF NOT EXISTS idx_leagues_participants ON leagues USING GIN (participants);
CREATE INDEX IF NOT EXISTS idx_brazil_leagues_participants ON brazil_leagues USING GIN (participants);

-- 4. Tabela: matches
-- Ajuda a filtrar e ordenar jogos pela data de forma eficiente.
CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(date);
