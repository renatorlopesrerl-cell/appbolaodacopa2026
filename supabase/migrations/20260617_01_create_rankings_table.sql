CREATE TABLE IF NOT EXISTS league_rankings (
    league_id text REFERENCES leagues(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points bigint DEFAULT 0,
    exact_scores bigint DEFAULT 0,
    winner_and_diff_count bigint DEFAULT 0,
    winner_and_winner_goals_count bigint DEFAULT 0,
    draw_count bigint DEFAULT 0,
    only_winner_count bigint DEFAULT 0,
    knockout_points bigint DEFAULT 0,
    tf_total bigint DEFAULT 0,
    PRIMARY KEY (league_id, user_id)
);

-- Tabela agregada para Ligas Modo Brasil
CREATE TABLE IF NOT EXISTS brazil_league_rankings (
    league_id text REFERENCES brazil_leagues(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points bigint DEFAULT 0,
    exact_scores bigint DEFAULT 0,
    winner_and_diff_count bigint DEFAULT 0,
    winner_and_winner_goals_count bigint DEFAULT 0,
    draw_count bigint DEFAULT 0,
    only_winner_count bigint DEFAULT 0,
    knockout_points bigint DEFAULT 0,
    PRIMARY KEY (league_id, user_id)
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_league_rankings_league ON league_rankings(league_id);
CREATE INDEX IF NOT EXISTS idx_league_rankings_points ON league_rankings(total_points DESC, exact_scores DESC);

CREATE INDEX IF NOT EXISTS idx_brazil_league_rankings_league ON brazil_league_rankings(league_id);
CREATE INDEX IF NOT EXISTS idx_brazil_league_rankings_points ON brazil_league_rankings(total_points DESC, exact_scores DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE league_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE brazil_league_rankings ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura (Qualquer um pode ler rankings, pois é público dentro da liga)
DROP POLICY IF EXISTS "Public read league rankings" ON league_rankings;
CREATE POLICY "Public read league rankings" ON league_rankings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read brazil league rankings" ON brazil_league_rankings;
CREATE POLICY "Public read brazil league rankings" ON brazil_league_rankings FOR SELECT USING (true);
