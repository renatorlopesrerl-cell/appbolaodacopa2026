-- ==============================================================================
-- SINCRONIZAÇÃO DE RLS E SEGURANÇA: brazil_predictions <-> predictions
-- ==============================================================================

-- 1. Atualiza a Função de Proteção contra Tampering para incluir regras da predictions
CREATE OR REPLACE FUNCTION prevent_brazil_prediction_tampering()
RETURNS TRIGGER AS $$
DECLARE
    match_start timestamptz;
    deadline timestamptz;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();

    -- REGRA 0: BLOQUEIO ABSOLUTO DE EDIÇÃO MANUAL DE PONTOS
    -- Impede alteração manual de 'points' e 'goalscorer_points'.
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.points IS DISTINCT FROM OLD.points OR NEW.goalscorer_points IS DISTINCT FROM OLD.goalscorer_points) THEN
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

    -- REGRA 1: BLOQUEIO DE ALTERAÇÃO POR TERCEIROS
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score OR NEW.player_pick IS DISTINCT FROM OLD.player_pick) THEN
            -- Verifica se o usuário logado é o dono do palpite
            IF (current_user_id IS DISTINCT FROM OLD.user_id) THEN
                RAISE EXCEPTION 'SECURITY_VIOLATION: Apenas o usuário que criou o palpite pode alterar os dados.';
            END IF;
        END IF;
    END IF;

    -- REGRA 2: BLOQUEIO POR TEMPO (5 min antes do jogo)
    IF (NOW() >= deadline) THEN
        IF (pg_trigger_depth() <= 1) THEN 
            IF (TG_OP = 'DELETE' OR TG_OP = 'INSERT') THEN
                RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados (5 min antes do jogo).';
            END IF;

            IF (TG_OP = 'UPDATE') THEN
                -- Se tentar mudar o palpite (home/away/player_pick) após o prazo
                IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score OR NEW.player_pick IS DISTINCT FROM OLD.player_pick) THEN
                    RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Recria as Políticas de RLS para seguir o padrão da security_patch.sql
ALTER TABLE brazil_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Brazil predictions viewable" ON brazil_predictions;
DROP POLICY IF EXISTS "Secure read brazil predictions" ON brazil_predictions;

CREATE POLICY "Secure read brazil predictions" ON brazil_predictions 
FOR SELECT 
USING (
  -- O próprio dono pode ver
  auth.uid() = user_id 
  OR 
  -- Outros podem ver se o jogo já bloqueou os palpites (5 min antes)
  EXISTS (
    SELECT 1 FROM matches 
    WHERE matches.id = brazil_predictions.match_id 
    AND NOW() >= (matches.date - interval '5 minutes')
  )
);

DROP POLICY IF EXISTS "Self manage brazil predictions" ON brazil_predictions;
CREATE POLICY "Self manage brazil predictions" ON brazil_predictions 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Políticas adicionais para espelhar exatamente a tabela predictions (conforme print)
CREATE POLICY "Viewable brazil predictions" ON brazil_predictions FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id 
        AND (date - interval '5 minutes') <= now()
    )
);

CREATE POLICY "Brazil predictions visibility rule" ON brazil_predictions FOR SELECT USING (
    auth.uid() = user_id OR 
    EXISTS (
        SELECT 1 FROM matches 
        WHERE id = match_id 
        AND (date - interval '5 minutes') <= now()
    )
);

-- 4. Aplica o trigger de Bloqueio Admin (vido da admin_lockdown.sql)
DROP TRIGGER IF EXISTS block_admin_brazil_predictions ON brazil_predictions;
CREATE TRIGGER block_admin_brazil_predictions
BEFORE INSERT OR UPDATE OR DELETE ON brazil_predictions
FOR EACH ROW
EXECUTE FUNCTION prevent_manual_admin_edits();
