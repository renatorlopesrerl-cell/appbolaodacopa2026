-- ==============================================================================
-- GATILHO DE INTEGRIDADE (TRIGGER) - SEGURANÇA E TEMPO (TOP FINISHERS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.prevent_top_finisher_tampering()
RETURNS TRIGGER AS $$
DECLARE
    tournament_start timestamptz;
    deadline timestamptz;
    current_user_id uuid;
BEGIN
    current_user_id := auth.uid();

    -- REGRA 1: BLOQUEIO DE ALTERAÇÃO POR TERCEIROS (E ADMIN MANUAL)
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.champion IS DISTINCT FROM OLD.champion OR 
            NEW.runner_up IS DISTINCT FROM OLD.runner_up OR
            NEW.third IS DISTINCT FROM OLD.third OR
            NEW.fourth IS DISTINCT FROM OLD.fourth) THEN
            
            -- Verifica se o usuário logado é o dono do palpite. 
            -- Se current_user_id for nulo (como acontece se o Admin alterar via SQL Editor), também será barrado.
            IF (current_user_id IS DISTINCT FROM OLD.user_id) THEN
                RAISE EXCEPTION 'SECURITY_VIOLATION: Apenas o usuário que criou o palpite pode alterar as seleções.';
            END IF;
        END IF;
    END IF;

    -- Obtém a data do primeiro jogo do campeonato
    SELECT MIN(date) INTO tournament_start FROM public.matches;
    
    IF tournament_start IS NULL THEN
        RETURN NEW;
    END IF;

    -- deadline := tournament_start - interval '5 minutes';
    -- Ajustado conforme solicitado: travar exatamente no horário do primeiro jogo
    deadline := tournament_start;

    -- REGRA 2: BLOQUEIO POR TEMPO (Horário exato do primeiro jogo)
    IF (NOW() >= deadline) THEN
        IF (pg_trigger_depth() <= 1) THEN 
            IF (TG_OP = 'DELETE' OR TG_OP = 'INSERT') THEN
                RAISE EXCEPTION 'TIME_LOCKED: Palpites dos 4 primeiros colocados encerrados (campeonato iniciado).';
            END IF;

            IF (TG_OP = 'UPDATE') THEN
                -- Se tentar mudar as seleções após o prazo
                IF (NEW.champion IS DISTINCT FROM OLD.champion OR 
                    NEW.runner_up IS DISTINCT FROM OLD.runner_up OR
                    NEW.third IS DISTINCT FROM OLD.third OR
                    NEW.fourth IS DISTINCT FROM OLD.fourth) THEN
                    RAISE EXCEPTION 'TIME_LOCKED: Palpites dos 4 primeiros colocados encerrados.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove gatilho antigo se existir
DROP TRIGGER IF EXISTS check_top_finisher_lock ON top_finisher_predictions;

-- Cria novo gatilho
CREATE TRIGGER check_top_finisher_lock
BEFORE INSERT OR UPDATE OR DELETE ON top_finisher_predictions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_top_finisher_tampering();
