-- ==============================================================================
-- 1. TABELA DE PERFIS (PROFILES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    email text,
    name text,
    avatar text,
    is_admin boolean DEFAULT false,
    whatsapp text,
    pix text,
    notification_settings jsonb DEFAULT '{"matchStart": true, "matchEnd": true}'::jsonb,
    theme text DEFAULT 'light'
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_settings jsonb DEFAULT '{"matchStart": true, "matchEnd": true}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme text DEFAULT 'light';

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ==============================================================================
-- TRIGGER FUNCTION PARA CÁLCULO AUTOMÁTICO DE PONTOS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.calculate_match_points()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o placar foi alterado (Home ou Away)
  IF (NEW.home_score IS DISTINCT FROM OLD.home_score) OR (NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
    
    -- Caso reset (nulo), zera pontos
    IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
        UPDATE predictions 
        SET points = 0 
        WHERE match_id = NEW.id;
    ELSE
        -- Calcula pontos baseado nas regras da liga
        UPDATE predictions p
        SET points = (
            CASE 
                -- 1. Placar Exato
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score 
                THEN COALESCE((l.settings->>'exactScore')::int, 10)
                
                -- 2. Empate (Não Exato)
                WHEN (p.home_score - p.away_score) = 0 AND (NEW.home_score - NEW.away_score) = 0
                THEN COALESCE((l.settings->>'draw')::int, 5)
                
                -- 3. Vencedor + Saldo de Gols (Não Empate)
                WHEN (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score)
                THEN COALESCE((l.settings->>'winnerAndDiff')::int, 7)
                
                -- 4. Apenas Vencedor (Não Empate, Saldo diferente)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score)
                THEN COALESCE((l.settings->>'winner')::int, 5)
                
                ELSE 0
            END
        )
        FROM leagues l
        WHERE p.league_id = l.id AND p.match_id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir e cria novo
DROP TRIGGER IF EXISTS on_match_score_update ON matches;
CREATE TRIGGER on_match_score_update
AFTER UPDATE ON matches
FOR EACH ROW
EXECUTE PROCEDURE public.calculate_match_points();


-- ==============================================================================
-- 4. TABELA DE PALPITES (PREDICTIONS) - REGRAS DE SEGURANÇA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS predictions (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    match_id text REFERENCES matches(id) ON DELETE CASCADE,
    league_id text REFERENCES leagues(id) ON DELETE CASCADE,
    home_score integer NOT NULL,
    away_score integer NOT NULL,
    points integer DEFAULT 0,
    PRIMARY KEY (user_id, match_id, league_id)
);

ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read predictions" ON predictions;
DROP POLICY IF EXISTS "Self manage predictions" ON predictions;
DROP POLICY IF EXISTS "Admin calc points" ON predictions;

-- Todos podem ver palpites
CREATE POLICY "Public read predictions" ON predictions FOR SELECT USING (true);

-- Usuários gerenciam APENAS seus próprios palpites
CREATE POLICY "Self manage predictions" ON predictions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ==============================================================================
-- GATILHO DE INTEGRIDADE (TRIGGER) - SEGURANÇA E TEMPO
-- ==============================================================================
CREATE OR REPLACE FUNCTION prevent_prediction_tampering()
RETURNS TRIGGER AS $$
DECLARE
    match_start timestamptz;
    deadline timestamptz;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();

    -- REGRA 0: BLOQUEIO ABSOLUTO DE EDIÇÃO MANUAL DE PONTOS
    -- Impede que QUALQUER UM (incluindo Admin via SQL Editor) altere a coluna 'points' diretamente.
    -- A alteração só é permitida se vier de um gatilho interno (Depth > 1), como o calculate_match_points.
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.points IS DISTINCT FROM OLD.points) THEN
            IF (pg_trigger_depth() <= 1) THEN
                RAISE EXCEPTION 'SYSTEM_ONLY: A pontuação não pode ser alterada manualmente. Ela é calculada automaticamente pelo sistema.';
            END IF;
        END IF;
    END IF;

    -- Obtém data do jogo
    SELECT date INTO match_start FROM matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
    
    IF match_start IS NULL THEN
        RETURN NEW;
    END IF;

    deadline := match_start - interval '5 minutes';

    -- REGRA 1: BLOQUEIO DE ALTERAÇÃO DE PLACAR POR TERCEIROS
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
            -- Verifica se o usuário logado é o dono do palpite
            IF (current_user_id IS DISTINCT FROM OLD.user_id) THEN
                RAISE EXCEPTION 'SECURITY_VIOLATION: Apenas o usuário que criou o palpite pode alterar o placar.';
            END IF;
        END IF;
    END IF;

    -- REGRA 2: BLOQUEIO POR TEMPO (5 min antes do jogo)
    -- Importante: Ignora updates de sistema (pontos) onde trigger depth > 1
    IF (NOW() >= deadline) THEN
        IF (pg_trigger_depth() <= 1) THEN 
            IF (TG_OP = 'DELETE' OR TG_OP = 'INSERT') THEN
                RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados (5 min antes do jogo).';
            END IF;

            IF (TG_OP = 'UPDATE') THEN
                -- Se tentar mudar o placar (home/away) após o prazo
                IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
                    RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_prediction_lock ON predictions;
CREATE TRIGGER check_prediction_lock
BEFORE INSERT OR UPDATE OR DELETE ON predictions
FOR EACH ROW
EXECUTE FUNCTION prevent_prediction_tampering();

-- ==============================================================================
-- PERMISSÕES
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
