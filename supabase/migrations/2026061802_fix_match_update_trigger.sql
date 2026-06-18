-- 1. Recreate public.refresh_multiple_league_rankings to ensure it joins leagues/brazil_leagues and profiles
-- This prevents calculations for deleted leagues/users and avoids foreign key violations on user_id and league_id
CREATE OR REPLACE FUNCTION public.refresh_multiple_league_rankings(p_league_ids text[])
RETURNS void AS $$
BEGIN
    -- ---------------------------------------------------------
    -- 1. LIGAS PADRÕES
    -- ---------------------------------------------------------
    DELETE FROM league_rankings WHERE league_id = ANY(p_league_ids);

    INSERT INTO league_rankings (
        league_id, user_id, total_points, exact_scores, 
        winner_and_diff_count, winner_and_winner_goals_count, 
        draw_count, only_winner_count, knockout_points
    )
    SELECT 
        p.league_id,
        p.user_id,
        SUM(COALESCE(p.points, 0)) as total_points,
        
        -- EXACT SCORE
        SUM(CASE WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN 1 ELSE 0 END) as exact_scores,
        
        -- WINNER AND DIFF
        SUM(CASE 
            WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
                 AND (p.home_score - p.away_score) = (m.home_score - m.away_score) 
                 AND (m.home_score - m.away_score) <> 0 
            THEN 1 ELSE 0 END) as winner_and_diff_count,
            
        -- WINNER AND WINNER GOALS
        SUM(CASE 
            WHEN (p.home_score - p.away_score) != (m.home_score - m.away_score) 
                 AND SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
                 AND (CASE 
                        WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                        WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                        ELSE FALSE
                      END)
            THEN 1 ELSE 0 END) as winner_and_winner_goals_count,
            
        -- DRAW
        SUM(CASE 
            WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
                 AND (p.home_score - p.away_score) = 0 
                 AND (m.home_score - m.away_score) = 0 
            THEN 1 ELSE 0 END) as draw_count,
            
        -- ONLY WINNER
        SUM(CASE 
            WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
                 AND (p.home_score - p.away_score) != (m.home_score - m.away_score) 
                 AND NOT (CASE 
                            WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                            WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                            ELSE FALSE
                          END)
                 AND (m.home_score - m.away_score) <> 0
            THEN 1 ELSE 0 END) as only_winner_count,
            
        SUM(CASE WHEN m.phase != 'Grupos' THEN COALESCE(p.points, 0) ELSE 0 END) as knockout_points
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    JOIN leagues l ON p.league_id = l.id  -- Garante que a liga existe
    JOIN profiles pr ON p.user_id = pr.id  -- Garante que o usuário existe
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id;

    -- ---------------------------------------------------------
    -- 2. LIGAS DO BRASIL
    -- ---------------------------------------------------------
    DELETE FROM brazil_league_rankings WHERE league_id = ANY(p_league_ids);

    INSERT INTO brazil_league_rankings (
        league_id, user_id, total_points, exact_scores, 
        winner_and_diff_count, winner_and_winner_goals_count, 
        draw_count, only_winner_count, knockout_points
    )
    SELECT 
        p.league_id,
        p.user_id,
        SUM(COALESCE(p.points, 0) + COALESCE(p.goalscorer_points, 0)) as total_points,
        
        -- EXACT SCORE
        SUM(CASE WHEN p.home_score = m.home_score AND p.away_score = m.away_score THEN 1 ELSE 0 END) as exact_scores,
        
        -- WINNER AND DIFF
        SUM(CASE 
            WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
                 AND (p.home_score - p.away_score) = (m.home_score - m.away_score) 
                 AND (m.home_score - m.away_score) <> 0 
            THEN 1 ELSE 0 END) as winner_and_diff_count,
            
        -- WINNER AND WINNER GOALS
        SUM(CASE 
            WHEN (p.home_score - p.away_score) != (m.home_score - m.away_score) 
                 AND SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
                 AND (CASE 
                        WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                        WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                        ELSE FALSE
                      END)
            THEN 1 ELSE 0 END) as winner_and_winner_goals_count,
            
        -- DRAW
        SUM(CASE 
            WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
                 AND (p.home_score - p.away_score) = 0 
                 AND (m.home_score - m.away_score) = 0 
            THEN 1 ELSE 0 END) as draw_count,
            
        -- ONLY WINNER
        SUM(CASE 
            WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
                 AND (p.home_score - p.away_score) != (m.home_score - m.away_score) 
                 AND NOT (CASE 
                            WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                            WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                            ELSE FALSE
                          END)
                 AND (m.home_score - m.away_score) <> 0
            THEN 1 ELSE 0 END) as only_winner_count,
            
        SUM(CASE WHEN m.phase != 'Grupos' THEN (COALESCE(p.points, 0) + COALESCE(p.goalscorer_points, 0)) ELSE 0 END) as knockout_points
    FROM brazil_predictions p
    JOIN matches m ON p.match_id = m.id
    JOIN brazil_leagues bl ON p.league_id = bl.id  -- Garante que a liga existe
    JOIN profiles pr ON p.user_id = pr.id  -- Garante que o usuário existe
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Recreate public.calculate_match_points with camelCase keys, joining leagues and profiles to ignore deleted data
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
                THEN COALESCE((l.settings->>'exactScore')::integer, 10)
                
                -- 2. Vencedor + Saldo (winnerAndDiff)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) 
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN COALESCE((l.settings->>'winnerAndDiff')::integer, 7)
                
                -- 3. Vencedor + Gols do Vencedor (winnerAndWinnerGoals)
                WHEN (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (CASE 
                            WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                            WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                            ELSE FALSE
                          END) 
                THEN COALESCE((l.settings->>'winnerAndWinnerGoals')::integer, 6)
                
                -- 4. Empate (draw)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = 0 
                     AND (NEW.home_score - NEW.away_score) = 0 
                THEN COALESCE((l.settings->>'draw')::integer, 5)
                
                -- 5. Apenas Vencedor (winner)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND NOT (CASE 
                                WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                                WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                                ELSE FALSE
                              END)
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN COALESCE((l.settings->>'winner')::integer, 5)
                
                ELSE 0
            END
        )::integer
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


-- 3. Recreate public.calculate_brazil_match_points with camelCase keys, correct column references, joining brazil_leagues and profiles to ignore deleted data
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
                THEN COALESCE((bl.settings->>'exactScore')::integer, 10)
                
                -- 2. Vencedor + Saldo (winnerAndDiff)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) 
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN COALESCE((bl.settings->>'winnerAndDiff')::integer, 7)
                
                -- 3. Vencedor + Gols do Vencedor (winnerAndWinnerGoals)
                WHEN (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (CASE 
                            WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                            WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                            ELSE FALSE
                          END) 
                THEN COALESCE((bl.settings->>'winnerAndWinnerGoals')::integer, 6)
                
                -- 4. Empate (draw)
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = 0 
                     AND (NEW.home_score - NEW.away_score) = 0 
                THEN COALESCE((bl.settings->>'draw')::integer, 6)
                
                -- 5. Apenas Vencedor (winner)
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND NOT (CASE 
                                WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                                WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                                ELSE FALSE
                              END)
                     AND (NEW.home_score - NEW.away_score) <> 0 
                THEN COALESCE((bl.settings->>'winner')::integer, 5)
                
                ELSE 0
            END
        )::integer,
        goalscorer_points = (
            SELECT COALESCE(SUM(bmg.goals * COALESCE((bl.settings->>'goalscorer')::integer, 2)), 0)
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


-- 4. Recalculate and restore all points that were corrupted to NULL/0
-- We temporarily disable the validation triggers during this query to allow setting the 'points' column, then re-enable them.
ALTER TABLE predictions DISABLE TRIGGER check_prediction_lock;
ALTER TABLE predictions DISABLE TRIGGER block_admin_predictions;
ALTER TABLE brazil_predictions DISABLE TRIGGER check_brazil_prediction_lock;
ALTER TABLE brazil_predictions DISABLE TRIGGER block_admin_brazil_predictions;

-- Recalculate standard predictions (only for active leagues and profiles, p.league_id = l.id AND p.user_id = pr.id)
UPDATE predictions p
SET points = (
    CASE 
        WHEN p.home_score = m.home_score AND p.away_score = m.away_score 
        THEN COALESCE((l.settings->>'exactScore')::integer, 10)
        
        WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
             AND (p.home_score - p.away_score) = (m.home_score - m.away_score) 
             AND (m.home_score - m.away_score) <> 0 
        THEN COALESCE((l.settings->>'winnerAndDiff')::integer, 7)
        
        WHEN (p.home_score - p.away_score) != (m.home_score - m.away_score) 
             AND SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
             AND (CASE 
                    WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                    WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                    ELSE FALSE
                  END) 
        THEN COALESCE((l.settings->>'winnerAndWinnerGoals')::integer, 6)
        
        WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
             AND (p.home_score - p.away_score) = 0 
             AND (m.home_score - m.away_score) = 0 
        THEN COALESCE((l.settings->>'draw')::integer, 5)
        
        WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
             AND (p.home_score - p.away_score) != (m.home_score - m.away_score) 
             AND NOT (CASE 
                        WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                        WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                        ELSE FALSE
                      END)
             AND (m.home_score - m.away_score) <> 0 
        THEN COALESCE((l.settings->>'winner')::integer, 5)
        
        ELSE 0
    END
)
FROM matches m, leagues l, profiles pr
WHERE p.match_id = m.id AND p.league_id = l.id AND p.user_id = pr.id AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL;

-- Recalculate Brazil predictions (only for active leagues and profiles, p.league_id = bl.id AND p.user_id = pr.id)
UPDATE brazil_predictions p
SET points = (
    CASE 
        WHEN p.home_score = m.home_score AND p.away_score = m.away_score 
        THEN COALESCE((bl.settings->>'exactScore')::integer, 10)
        
        WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
             AND (p.home_score - p.away_score) = (bl.settings->>'winnerAndDiff')::integer 
             AND (m.home_score - m.away_score) <> 0 
        THEN COALESCE((bl.settings->>'winnerAndDiff')::integer, 7)
        
        WHEN (p.home_score - p.away_score) != (m.home_score - m.away_score) 
             AND SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
             AND (CASE 
                    WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                    WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                    ELSE FALSE
                  END) 
        THEN COALESCE((bl.settings->>'winnerAndWinnerGoals')::integer, 6)
        
        WHEN (p.home_score != m.home_score OR p.away_score != m.away_score) 
             AND (p.home_score - p.away_score) = 0 
             AND (m.home_score - m.away_score) = 0 
        THEN COALESCE((bl.settings->>'draw')::integer, 6)
        
        WHEN SIGN(p.home_score - p.away_score) = SIGN(m.home_score - m.away_score) 
             AND (p.home_score - p.away_score) != (m.home_score - m.away_score) 
             AND NOT (CASE 
                        WHEN m.home_score > m.away_score THEN p.home_score = m.home_score
                        WHEN m.away_score > m.home_score THEN p.away_score = m.away_score
                        ELSE FALSE
                      END)
             AND (m.home_score - m.away_score) <> 0 
        THEN COALESCE((bl.settings->>'winner')::integer, 5)
        
        ELSE 0
    END
),
goalscorer_points = (
    SELECT COALESCE(SUM(bmg.goals * COALESCE((bl.settings->>'goalscorer')::integer, 2)), 0)
    FROM brazil_match_goals bmg
    WHERE bmg.match_id = m.id AND bmg.player_name = p.player_pick
)
FROM matches m, brazil_leagues bl, profiles pr
WHERE p.match_id = m.id AND p.league_id = bl.id AND p.user_id = pr.id AND m.home_score IS NOT NULL AND m.away_score IS NOT NULL;

-- Re-enable all triggers
ALTER TABLE predictions ENABLE TRIGGER check_prediction_lock;
ALTER TABLE predictions ENABLE TRIGGER block_admin_predictions;
ALTER TABLE brazil_predictions ENABLE TRIGGER check_brazil_prediction_lock;
ALTER TABLE brazil_predictions ENABLE TRIGGER block_admin_brazil_predictions;


-- 5. Recalculate all rankings for active leagues and profiles to ensure consistency total
DO $$
DECLARE
    l_ids text[];
    bl_ids text[];
BEGIN
    SELECT array_agg(id) INTO l_ids FROM leagues;
    IF array_length(l_ids, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(l_ids);
    END IF;

    SELECT array_agg(id) INTO bl_ids FROM brazil_leagues;
    IF array_length(bl_ids, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(bl_ids);
    END IF;
END $$;
