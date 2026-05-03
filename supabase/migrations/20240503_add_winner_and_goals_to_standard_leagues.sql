-- ==============================================================================
-- MIGRATION: ADD WINNER AND WINNER GOALS SCORING TO STANDARD LEAGUES
-- ==============================================================================

-- 1. ATUALIZAR FUNÇÃO DE CÁLCULO DE PONTOS
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
                
                -- 2. Vencedor + Saldo de Gols (Diferença de Gols) - NÃO EMPATE
                WHEN (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) AND (NEW.home_score - NEW.away_score) <> 0
                THEN COALESCE((l.settings->>'winnerAndDiff')::int, 7)
                
                -- 3. NOVO: Vencedor + Gols do Vencedor (Acertou quem ganha e quantos gols o vencedor fez)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) AND 
                     (CASE 
                        WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                        WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                        ELSE FALSE
                      END)
                THEN COALESCE((l.settings->>'winnerAndWinnerGoals')::int, 6)

                -- 4. Empate (Não Exato)
                WHEN (p.home_score - p.away_score) = 0 AND (NEW.home_score - NEW.away_score) = 0
                THEN COALESCE((l.settings->>'draw')::int, 5)
                
                -- 5. Apenas Vencedor
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

-- 2. MIGRAR LIGAS EXISTENTES
-- Adiciona o campo winnerAndWinnerGoals se ele não existir, pegando o valor de 'winner' como fallback
UPDATE leagues 
SET settings = settings || jsonb_build_object('winnerAndWinnerGoals', COALESCE((settings->>'winner')::int, 5))
WHERE settings->>'winnerAndWinnerGoals' IS NULL;
