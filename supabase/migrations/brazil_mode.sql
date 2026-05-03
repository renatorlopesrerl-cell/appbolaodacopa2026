-- ==============================================================================
-- JOGOS DO BRASIL MODE - DATABASE MIGRATION
-- ==============================================================================

-- 1. TABELA DE LIGAS DO BRASIL
CREATE TABLE IF NOT EXISTS brazil_leagues (
    id text PRIMARY KEY,
    name text NOT NULL,
    image text,
    description text,
    league_code text UNIQUE,
    admin_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    is_private boolean DEFAULT true,
    participants text[] DEFAULT '{}',
    pending_requests text[] DEFAULT '{}',
    settings jsonb DEFAULT '{"exactScore": 10, "winnerAndDiff": 7, "winnerAndWinnerGoals": 6, "draw": 6, "winner": 5, "goalscorer": 2}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE brazil_leagues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brazil leagues viewable by everyone" ON brazil_leagues;
DROP POLICY IF EXISTS "Users can create brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admins can update their brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admins can delete their brazil leagues" ON brazil_leagues;

CREATE POLICY "Brazil leagues viewable by everyone" ON brazil_leagues FOR SELECT USING (true);
CREATE POLICY "Users can create brazil leagues" ON brazil_leagues FOR INSERT WITH CHECK (auth.uid()::text = admin_id::text);
CREATE POLICY "Admins can update their brazil leagues" ON brazil_leagues FOR UPDATE USING (auth.uid()::text = admin_id::text);
CREATE POLICY "Admins can delete their brazil leagues" ON brazil_leagues FOR DELETE USING (auth.uid()::text = admin_id::text);

-- 2. TABELA DE PALPITES DO BRASIL (com player_pick)
CREATE TABLE IF NOT EXISTS brazil_predictions (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id text NOT NULL,
    league_id text REFERENCES brazil_leagues(id) ON DELETE CASCADE,
    home_score integer NOT NULL,
    away_score integer NOT NULL,
    player_pick text,
    points integer DEFAULT 0,
    goalscorer_points integer DEFAULT 0,
    PRIMARY KEY (user_id, match_id, league_id)
);

ALTER TABLE brazil_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brazil predictions viewable" ON brazil_predictions;
DROP POLICY IF EXISTS "Self manage brazil predictions" ON brazil_predictions;

CREATE POLICY "Brazil predictions viewable" ON brazil_predictions FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
        SELECT 1 FROM matches
        WHERE id = match_id
        AND (date - interval '5 minutes') <= now()
    )
);

CREATE POLICY "Self manage brazil predictions" ON brazil_predictions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. TABELA DE GOLS DO BRASIL (Admin marca quem fez gol e quantos)
CREATE TABLE IF NOT EXISTS brazil_match_goals (
    id serial PRIMARY KEY,
    match_id text NOT NULL,
    player_name text NOT NULL,
    goals integer DEFAULT 1,
    created_at timestamptz DEFAULT now(),
    UNIQUE(match_id, player_name)
);

ALTER TABLE brazil_match_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brazil goals viewable by everyone" ON brazil_match_goals;
DROP POLICY IF EXISTS "Admins can manage brazil goals" ON brazil_match_goals;

CREATE POLICY "Brazil goals viewable by everyone" ON brazil_match_goals FOR SELECT USING (true);
CREATE POLICY "Admins can manage brazil goals" ON brazil_match_goals FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- 4. TRIGGER: Calcular pontos do Brasil quando placar do jogo muda
CREATE OR REPLACE FUNCTION public.calculate_brazil_match_points()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.home_score IS DISTINCT FROM OLD.home_score) OR (NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
    IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
        UPDATE brazil_predictions
        SET points = 0, goalscorer_points = 0
        WHERE match_id = NEW.id;
    ELSE
        UPDATE brazil_predictions p
        SET points = (
            CASE
                -- 1. Placar Exato (10)
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score
                THEN COALESCE((bl.settings->>'exactScore')::int, 10)
                
                -- 2. Vencedor + Saldo (7)
                WHEN (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) AND (NEW.home_score - NEW.away_score) <> 0
                THEN COALESCE((bl.settings->>'winnerAndDiff')::int, 7)
                
                -- 3. Vencedor + Gols do Vencedor (6)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) AND 
                     (CASE 
                        WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                        WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                        ELSE FALSE
                      END)
                THEN COALESCE((bl.settings->>'winnerAndWinnerGoals')::int, 6)
                
                -- 4. Empate (6)
                WHEN (p.home_score - p.away_score) = 0 AND (NEW.home_score - NEW.away_score) = 0
                THEN COALESCE((bl.settings->>'draw')::int, 6)
                
                -- 5. Apenas Vencedor (5)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score)
                THEN COALESCE((bl.settings->>'winner')::int, 5)
                
                ELSE 0
            END
        ),
        goalscorer_points = (
            CASE
                WHEN p.player_pick IS NOT NULL THEN
                    COALESCE(
                        (SELECT CASE 
                                  WHEN g.goals > 0 THEN COALESCE((bl.settings->>'goalscorer')::int, 2) + (g.goals - 1)
                                  ELSE 0
                                END
                         FROM brazil_match_goals g
                         WHERE g.match_id = NEW.id AND g.player_name = p.player_pick),
                        0
                    )
                ELSE 0
            END
        )
        FROM brazil_leagues bl
        WHERE p.league_id = bl.id AND p.match_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_brazil_match_score_update ON matches;
CREATE TRIGGER on_brazil_match_score_update
AFTER UPDATE ON matches
FOR EACH ROW
WHEN (NEW.home_team_id = 'Brasil' OR NEW.away_team_id = 'Brasil')
EXECUTE PROCEDURE public.calculate_brazil_match_points();

-- 5. TRIGGER: Recalcular goalscorer_points quando admin marca/atualiza gols
-- Multiplica pontos base pelo numero de gols do jogador
CREATE OR REPLACE FUNCTION public.recalc_brazil_goalscorer_points()
RETURNS TRIGGER AS $$
DECLARE
    the_match_id text;
BEGIN
    the_match_id := COALESCE(NEW.match_id, OLD.match_id);

    UPDATE brazil_predictions p
    SET goalscorer_points = (
        CASE
            WHEN p.player_pick IS NOT NULL THEN
                COALESCE(
                    (SELECT CASE 
                              WHEN g.goals > 0 THEN COALESCE((bl.settings->>'goalscorer')::int, 2) + (g.goals - 1)
                              ELSE 0
                            END
                     FROM brazil_match_goals g
                     WHERE g.match_id = the_match_id AND g.player_name = p.player_pick),
                    0
                )
            ELSE 0
        END
    )
    FROM brazil_leagues bl
    WHERE p.league_id = bl.id AND p.match_id = the_match_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_brazil_goals_change ON brazil_match_goals;
CREATE TRIGGER on_brazil_goals_change
AFTER INSERT OR UPDATE OR DELETE ON brazil_match_goals
FOR EACH ROW
EXECUTE PROCEDURE public.recalc_brazil_goalscorer_points();

-- 6. PERMISSÕES
GRANT SELECT ON brazil_leagues TO authenticated;
GRANT INSERT, UPDATE, DELETE ON brazil_leagues TO authenticated;
GRANT SELECT ON brazil_predictions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON brazil_predictions TO authenticated;
GRANT SELECT ON brazil_match_goals TO authenticated;
GRANT INSERT, UPDATE, DELETE ON brazil_match_goals TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. TRIGGER DE SEGURANÇA
CREATE OR REPLACE FUNCTION prevent_brazil_prediction_tampering()
RETURNS TRIGGER AS $$
DECLARE
    match_start timestamptz;
    deadline timestamptz;
BEGIN
    SELECT date INTO match_start FROM matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
    IF match_start IS NULL THEN RETURN NEW; END IF;
    deadline := match_start - interval '5 minutes';
    IF (NOW() >= deadline) THEN
        IF (pg_trigger_depth() <= 1) THEN
            IF (TG_OP = 'DELETE' OR TG_OP = 'INSERT') THEN
                RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados (5 min antes do jogo).';
            END IF;
            IF (TG_OP = 'UPDATE') THEN
                IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score OR NEW.player_pick IS DISTINCT FROM OLD.player_pick) THEN
                    RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados.';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_brazil_prediction_lock ON brazil_predictions;
CREATE TRIGGER check_brazil_prediction_lock
BEFORE INSERT OR UPDATE OR DELETE ON brazil_predictions
FOR EACH ROW
EXECUTE FUNCTION prevent_brazil_prediction_tampering();

-- 8. MIGRAÇÃO: Inicializar winnerAndWinnerGoals para ligas existentes
-- Copia o valor de 'winner' para 'winnerAndWinnerGoals' caso a nova chave não exista.
-- Removendo o bloqueio de edição manual para permitir alterações direto no dashboard.
DROP TRIGGER IF EXISTS block_admin_brazil_leagues ON brazil_leagues;

UPDATE brazil_leagues
SET settings = settings || jsonb_build_object('winnerAndWinnerGoals', COALESCE((settings->>'winner')::int, 5))
WHERE settings->>'winnerAndWinnerGoals' IS NULL;
