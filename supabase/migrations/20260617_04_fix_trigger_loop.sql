-- ==============================================================================
-- CORREÇÃO DE PERFORMANCE: REMOVER LOOP DE GATILHOS (N+1 PROBLEM)
-- ==============================================================================

-- 1. Removemos os gatilhos antigos que rodavam milhares de vezes (FOR EACH ROW)
DROP TRIGGER IF EXISTS on_prediction_points_update ON predictions;
DROP TRIGGER IF EXISTS on_brazil_prediction_points_update ON brazil_predictions;
DROP FUNCTION IF EXISTS public.trigger_refresh_rankings();
DROP FUNCTION IF EXISTS public.trigger_refresh_brazil_rankings();

-- 2. Atualizamos a função Mestre de Jogos Normais para rodar o ranking APENAS UMA VEZ no final
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
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score 
                THEN COALESCE((l.settings->>'exactScore')::int, 10)
                
                WHEN (p.home_score - p.away_score) = 0 AND (NEW.home_score - NEW.away_score) = 0
                THEN COALESCE((l.settings->>'draw')::int, 5)
                
                WHEN (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score)
                THEN COALESCE((l.settings->>'winnerAndDiff')::int, 7)
                
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score)
                THEN COALESCE((l.settings->>'winner')::int, 5)
                
                ELSE 0
            END
        )
        FROM leagues l
        WHERE p.league_id = l.id AND p.match_id = NEW.id;
    END IF;

    -- [NOVO]: Atualiza o ranking apenas 1x por liga afetada
    FOR r IN SELECT DISTINCT league_id FROM predictions WHERE match_id = NEW.id LOOP
        PERFORM public.refresh_league_rankings(r.league_id);
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Atualizamos a função Mestre de Jogos do Brasil
CREATE OR REPLACE FUNCTION public.calculate_brazil_match_points()
RETURNS TRIGGER AS $$
DECLARE
    r RECORD;
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
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score
                THEN COALESCE((bl.settings->>'exactScore')::int, 10)
                
                WHEN (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) AND (NEW.home_score - NEW.away_score) <> 0
                THEN COALESCE((bl.settings->>'winnerAndDiff')::int, 7)
                
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) AND 
                     (CASE 
                        WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                        WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                        ELSE FALSE
                      END)
                THEN COALESCE((bl.settings->>'winnerAndWinnerGoals')::int, 6)
                
                WHEN (p.home_score - p.away_score) = 0 AND (NEW.home_score - NEW.away_score) = 0
                THEN COALESCE((bl.settings->>'draw')::int, 6)
                
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

    -- [NOVO]: Atualiza o ranking apenas 1x por liga do Brasil afetada
    FOR r IN SELECT DISTINCT league_id FROM brazil_predictions WHERE match_id = NEW.id LOOP
        PERFORM public.refresh_brazil_league_rankings(r.league_id);
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Atualizamos a função de Gols de Jogadores (Artilheiros)
CREATE OR REPLACE FUNCTION public.recalc_brazil_goalscorer_points()
RETURNS TRIGGER AS $$
DECLARE
    the_match_id text;
    r RECORD;
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

    -- [NOVO]: Atualiza o ranking apenas 1x por liga do Brasil afetada
    FOR r IN SELECT DISTINCT league_id FROM brazil_predictions WHERE match_id = the_match_id LOOP
        PERFORM public.refresh_brazil_league_rankings(r.league_id);
    END LOOP;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
