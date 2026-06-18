-- 1. Create a bulk version of refresh_league_rankings
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
        SUM(p.points) as total_points,
        
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
            
        SUM(CASE WHEN m.phase != 'Grupos' THEN p.points ELSE 0 END) as knockout_points
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
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
        SUM(p.points + COALESCE(p.goalscorer_points, 0)) as total_points,
        
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
            
        SUM(CASE WHEN m.phase != 'Grupos' THEN (p.points + COALESCE(p.goalscorer_points, 0)) ELSE 0 END) as knockout_points
    FROM brazil_predictions p
    JOIN matches m ON p.match_id = m.id
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update calculate_match_points
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
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score THEN l.settings->>'exact_score'
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) 
                     AND (NEW.home_score - NEW.away_score) <> 0 THEN l.settings->>'winner_and_diff'
                WHEN (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (CASE 
                            WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                            WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                            ELSE FALSE
                          END) THEN l.settings->>'winner_and_winner_goals'
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = 0 
                     AND (NEW.home_score - NEW.away_score) = 0 THEN l.settings->>'draw'
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND NOT (CASE 
                                WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                                WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                                ELSE FALSE
                              END)
                     AND (NEW.home_score - NEW.away_score) <> 0 THEN l.settings->>'only_winner'
                ELSE '0'
            END
        )::integer
        FROM leagues l
        WHERE p.league_id = l.id AND p.match_id = NEW.id;
    END IF;

    SELECT array_agg(DISTINCT league_id) INTO affected_leagues FROM predictions WHERE match_id = NEW.id;
    IF array_length(affected_leagues, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(affected_leagues);
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Update calculate_brazil_match_points
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
                WHEN p.home_score = NEW.home_score AND p.away_score = NEW.away_score THEN bl.settings->>'exact_score'
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = (NEW.home_score - NEW.away_score) 
                     AND (NEW.home_score - NEW.away_score) <> 0 THEN bl.settings->>'winner_and_diff'
                WHEN (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (CASE 
                            WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                            WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                            ELSE FALSE
                          END) THEN bl.settings->>'winner_and_winner_goals'
                WHEN (p.home_score != NEW.home_score OR p.away_score != NEW.away_score) 
                     AND (p.home_score - p.away_score) = 0 
                     AND (NEW.home_score - NEW.away_score) = 0 THEN bl.settings->>'draw'
                WHEN SIGN(p.home_score - p.away_score) = SIGN(NEW.home_score - NEW.away_score) 
                     AND (p.home_score - p.away_score) != (NEW.home_score - NEW.away_score) 
                     AND NOT (CASE 
                                WHEN NEW.home_score > NEW.away_score THEN p.home_score = NEW.home_score
                                WHEN NEW.away_score > NEW.home_score THEN p.away_score = NEW.away_score
                                ELSE FALSE
                              END)
                     AND (NEW.home_score - NEW.away_score) <> 0 THEN bl.settings->>'only_winner'
                ELSE '0'
            END
        )::integer,
        goalscorer_points = (
            SELECT COALESCE(SUM(bmg.goals * (bl.settings->>'goalscorer')::integer), 0)
            FROM brazil_match_goals bmg
            WHERE bmg.match_id = NEW.id AND bmg.player_name = p.goalscorer_name
        )
        FROM brazil_leagues bl
        WHERE p.league_id = bl.id AND p.match_id = NEW.id;
    END IF;

    SELECT array_agg(DISTINCT league_id) INTO affected_leagues FROM brazil_predictions WHERE match_id = NEW.id;
    IF array_length(affected_leagues, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(affected_leagues);
    END IF;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
