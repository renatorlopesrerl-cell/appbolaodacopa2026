-- Cria a função que verifica a data da partida antes de salvar o palpite
CREATE OR REPLACE FUNCTION check_match_lock_time()
RETURNS TRIGGER AS $$
DECLARE
    match_start_time TIMESTAMPTZ;
    is_guess_changing BOOLEAN := FALSE;
BEGIN
    -- Se for UPDATE, verifica se o palpite em si está sendo alterado.
    -- Se for apenas atualização de pontuação (points), não bloqueia.
    IF TG_OP = 'UPDATE' THEN
        -- Para a tabela `predictions` (que tem home_score, away_score)
        IF TG_TABLE_NAME = 'predictions' THEN
            IF (OLD.home_score IS DISTINCT FROM NEW.home_score) OR (OLD.away_score IS DISTINCT FROM NEW.away_score) THEN
                is_guess_changing := TRUE;
            END IF;
        -- Para a tabela `brazil_predictions` (que tem home_score, away_score, player_pick)
        ELSIF TG_TABLE_NAME = 'brazil_predictions' THEN
            IF (OLD.home_score IS DISTINCT FROM NEW.home_score) OR (OLD.away_score IS DISTINCT FROM NEW.away_score) OR (OLD.player_pick IS DISTINCT FROM NEW.player_pick) THEN
                is_guess_changing := TRUE;
            END IF;
        END IF;
    ELSE
        -- Se for INSERT, sempre conta como alteração/criação do palpite
        is_guess_changing := TRUE;
    END IF;

    -- Se o palpite em si estiver mudando, verifica o tempo de bloqueio
    IF is_guess_changing THEN
        -- Busca a data da partida na tabela matches
        SELECT "date" INTO match_start_time 
        FROM matches 
        WHERE id = NEW.match_id;

        -- Compara a data da partida com o horário atual do servidor UTC
        -- Se faltar menos de 5 minutos (ou se o jogo já passou), bloqueia a inserção/atualização
        IF match_start_time IS NOT NULL AND match_start_time - INTERVAL '5 minutes' < NOW() THEN
            RAISE EXCEPTION 'Tempo esgotado. Os palpites são bloqueados 5 minutos antes do início do jogo.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Remove os triggers caso já existam (para segurança ao rodar o script de novo)
DROP TRIGGER IF EXISTS trg_check_match_time_predictions ON predictions;
DROP TRIGGER IF EXISTS trg_check_match_time_brazil_predictions ON brazil_predictions;

-- Aplica a trava de segurança na tabela de palpites de ligas normais
CREATE TRIGGER trg_check_match_time_predictions
BEFORE INSERT OR UPDATE ON predictions
FOR EACH ROW
EXECUTE FUNCTION check_match_lock_time();

-- Aplica a trava de segurança na tabela de palpites de ligas Modo BR
CREATE TRIGGER trg_check_match_time_brazil_predictions
BEFORE INSERT OR UPDATE ON brazil_predictions
FOR EACH ROW
EXECUTE FUNCTION check_match_lock_time();
