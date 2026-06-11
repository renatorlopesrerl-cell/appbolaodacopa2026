-- Cria a função que verifica a data da partida antes de salvar o palpite
CREATE OR REPLACE FUNCTION check_match_lock_time()
RETURNS TRIGGER AS $$
DECLARE
    match_start_time TIMESTAMPTZ;
BEGIN
    -- Busca a data da partida na tabela matches
    SELECT "date" INTO match_start_time 
    FROM matches 
    WHERE id = NEW.match_id;

    -- Compara a data da partida com o horário atual do servidor UTC
    -- Se faltar menos de 5 minutos (ou se o jogo já passou), bloqueia a inserção/atualização
    IF match_start_time - INTERVAL '5 minutes' < NOW() THEN
        RAISE EXCEPTION 'Tempo esgotado. Os palpites são bloqueados 5 minutos antes do início do jogo.';
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
