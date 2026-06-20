-- ==============================================================================
-- MIGRATION: SAFE SETTINGS PARSING AND FIX CORRUPT LEAGUES
-- ==============================================================================

-- 1. Helper function to parse setting values safely (guaranteeing it returns integer between 0 and 10000)
CREATE OR REPLACE FUNCTION public.safe_get_setting(settings jsonb, key text, default_val integer)
RETURNS integer AS $$
DECLARE
    val_numeric numeric;
BEGIN
    IF settings IS NULL OR NOT (settings ? key) THEN
        RETURN default_val;
    END IF;
    
    -- If it's a JSON number
    IF jsonb_typeof(settings -> key) = 'number' THEN
        val_numeric := (settings -> key)::numeric;
        IF val_numeric BETWEEN 0 AND 10000 THEN
            RETURN val_numeric::integer;
        END IF;
    -- If it's a JSON string containing a number
    ELSIF jsonb_typeof(settings -> key) = 'string' THEN
        IF (settings ->> key) ~ '^[0-9]+$' THEN
            val_numeric := (settings ->> key)::numeric;
            IF val_numeric BETWEEN 0 AND 10000 THEN
                RETURN val_numeric::integer;
            END IF;
        END IF;
    END IF;
    
    RETURN default_val;
EXCEPTION WHEN OTHERS THEN
    RETURN default_val;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. Recreate calculate_match_points with safe settings parsing
CREATE OR REPLACE FUNCTION public.calculate_match_points()
RETURNS TRIGGER AS $$
DECLARE
    affected_leagues text[];
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
                -- 1. Placar Exato (exactScore)
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score 
                THEN public.safe_get_setting(l.settings, 'exactScore', 10)
                
                -- 2. Vencedor + Saldo (winnerAndDiff)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) 
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN public.safe_get_setting(l.settings, 'winnerAndDiff', 7)
                
                -- 3. Vencedor + Gols do Vencedor (winnerAndWinnerGoals)
                WHEN (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (CASE 
                            WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                            WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                            ELSE FALSE
                          END) 
                THEN public.safe_get_setting(l.settings, 'winnerAndWinnerGoals', 6)
                
                -- 4. Empate (draw)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = 0 
                     AND (NEW.home_score - NEW.away_score) = 0 
                THEN public.safe_get_setting(l.settings, 'draw', 5)
                
                -- 5. Apenas Vencedor (winner)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND NOT (CASE 
                                WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                                WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                                ELSE FALSE
                              END)
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN public.safe_get_setting(l.settings, 'winner', 5)
                
                ELSE 0
            END
        )
        FROM leagues l
        WHERE p.league_id = l.id AND p.match_id = NEW.id;
    END IF;

    -- Only select affected leagues that actually exist and have active user predictions
    SELECT array_agg(DISTINCT p.league_id) INTO affected_leagues 
    FROM predictions p
    JOIN leagues l ON p.league_id = l.id
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.match_id = NEW.id;
    
    IF array_length(affected_leagues, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(affected_leagues);
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Recreate calculate_brazil_match_points with safe settings parsing
CREATE OR REPLACE FUNCTION public.calculate_brazil_match_points()
RETURNS TRIGGER AS $$
DECLARE
    affected_leagues text[];
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
                -- 1. Placar Exato (exactScore)
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score 
                THEN public.safe_get_setting(bl.settings, 'exactScore', 10)
                
                -- 2. Vencedor + Saldo (winnerAndDiff)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) 
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN public.safe_get_setting(bl.settings, 'winnerAndDiff', 7)
                
                -- 3. Vencedor + Gols do Vencedor (winnerAndWinnerGoals)
                WHEN (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (CASE 
                            WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                            WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                            ELSE FALSE
                          END) 
                THEN public.safe_get_setting(bl.settings, 'winnerAndWinnerGoals', 6)
                
                -- 4. Empate (draw)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = 0 
                     AND (NEW.home_score - NEW.away_score) = 0 
                THEN public.safe_get_setting(bl.settings, 'draw', 6)
                
                -- 5. Apenas Vencedor (winner)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND NOT (CASE 
                                WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                                WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                                ELSE FALSE
                              END)
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN public.safe_get_setting(bl.settings, 'winner', 5)
                
                ELSE 0
            END
        )::integer,
        goalscorer_points = (
            SELECT COALESCE(SUM(bmg.goals * public.safe_get_setting(bl.settings, 'goalscorer', 2)), 0)
            FROM brazil_match_goals bmg
            WHERE bmg.match_id = NEW.id AND bmg.player_name = p.player_pick
        )
        FROM brazil_leagues bl
        WHERE p.league_id = bl.id AND p.match_id = NEW.id;
    END IF;

    -- Only select affected leagues that actually exist and have active user predictions
    SELECT array_agg(DISTINCT p.league_id) INTO affected_leagues 
    FROM brazil_predictions p
    JOIN brazil_leagues bl ON p.league_id = bl.id
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.match_id = NEW.id;
    
    IF array_length(affected_leagues, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(affected_leagues);
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Recreate recalc_brazil_goalscorer_points with safe settings parsing
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
                              WHEN g.goals > 0 THEN public.safe_get_setting(bl.settings, 'goalscorer', 2) + (g.goals - 1)
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


-- 5. Fix the corrupt rows in both brazil_leagues and standard leagues
UPDATE brazil_leagues 
SET settings = '{"exactScore": 10, "winnerAndDiff": 7, "winnerAndWinnerGoals": 6, "draw": 6, "winner": 5, "goalscorer": 2}'::jsonb 
WHERE id = 'bl-1781349415302-654';

UPDATE brazil_leagues 
SET settings = settings || '{"exactScore": 10}'::jsonb 
WHERE id = 'bl-1781789148005-515';

UPDATE leagues 
SET settings = '{"draw":5,"plan":"FREE","winner":4,"exactScore":10,"isUnlimited":false,"winnerAndDiff":6,"manualScoringLock":false,"topFinishersPoints":{"third":10,"fourth":5,"champion":20,"runnerUp":15},"topFinishersEnabled":false,"winnerAndWinnerGoals":5}'::jsonb
WHERE id = 'l-1779549140434';
