-- 1. Atualizar a Função de Cálculo de Pontos da Liga Padrão
CREATE OR REPLACE FUNCTION public.calculate_match_points()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
BEGIN
  IF (NEW.home_score IS DISTINCT FROM OLD.home_score) OR (NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
    
    IF NEW.home_score IS NULL OR NEW.away_score IS NULL THEN
        UPDATE predictions 
        SET points = 0 
        WHERE match_id = NEW.id;
    ELSE
        UPDATE predictions p
        SET points = (
            CASE 
                -- 1. Placar Exato
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score 
                THEN COALESCE((l.settings->>'exactScore')::int, 10)
                
                -- 2. Saldo de Gols (Acertou vencedor + diferença de gols)
                WHEN (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) AND (NEW.home_score - NEW.away_score) <> 0
                THEN COALESCE((l.settings->>'winnerAndDiff')::int, 7)
                
                -- 3. Acertou Vencedor + Quantidade de Gols do Vencedor
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) AND 
                     (CASE 
                        WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                        WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                        ELSE FALSE
                      END)
                THEN COALESCE((l.settings->>'winnerAndWinnerGoals')::int, 6)

                -- 4. Acertou Empate (mas não placar exato)
                WHEN (p.home_score - p.away_score) = 0 AND (NEW.home_score - NEW.away_score) = 0
                THEN COALESCE((l.settings->>'draw')::int, 5)
                
                -- 5. Acertou Apenas Vencedor
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score)
                THEN COALESCE((l.settings->>'winner')::int, 5)
                
                ELSE 0
            END
        )
        FROM leagues l
        WHERE p.match_id = NEW.id AND p.league_id = l.id;
    END IF;

    -- Atualiza as tabelas de ranking unificadas
    FOR r IN SELECT DISTINCT league_id FROM predictions WHERE match_id = NEW.id LOOP
        PERFORM public.refresh_league_rankings(r.league_id);
    END LOOP;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Script Retroativo: Recalcular pontos antigos baseados na nova regra
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Desliga as travas de segurança temporariamente
    ALTER TABLE predictions DISABLE TRIGGER block_admin_predictions;
    ALTER TABLE predictions DISABLE TRIGGER check_prediction_lock;

    -- Recalcula pontos de todos os palpites para os jogos já encerrados/em andamento
    UPDATE predictions p
    SET points = (
        CASE 
            WHEN p.home_score = m.home_score AND p.away_score = m.away_score 
            THEN COALESCE((l.settings->>'exactScore')::int, 10)
            
            WHEN (p.home_score - p.away_score) = (m.home_score - m.away_score) AND (m.home_score - m.away_score) <> 0
            THEN COALESCE((l.settings->>'winnerAndDiff')::int, 7)
            
            WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) AND 
                 (CASE 
                    WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                    WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                    ELSE FALSE
                  END)
            THEN COALESCE((l.settings->>'winnerAndWinnerGoals')::int, 6)

            WHEN (p.home_score - p.away_score) = 0 AND (m.home_score - m.away_score) = 0
            THEN COALESCE((l.settings->>'draw')::int, 5)
            
            WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score)
            THEN COALESCE((l.settings->>'winner')::int, 5)
            
            ELSE 0
        END
    )
    FROM matches m, leagues l
    WHERE p.match_id = m.id AND p.league_id = l.id
    AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL;

    -- Religa as travas de segurança imediatamente
    ALTER TABLE predictions ENABLE TRIGGER block_admin_predictions;
    ALTER TABLE predictions ENABLE TRIGGER check_prediction_lock;

    -- Atualiza as tabelas de ranking de todas as ligas impactadas
    FOR r IN SELECT id FROM leagues LOOP
        PERFORM public.refresh_league_rankings(r.id);
    END LOOP;
END;
$$;
