CREATE OR REPLACE FUNCTION public.refresh_multiple_league_rankings(p_league_ids text[])
RETURNS void AS $$
BEGIN
    -- ---------------------------------------------------------
    -- 1. LIGAS PADRÕES
    -- ---------------------------------------------------------
    INSERT INTO public.league_rankings (
        league_id, user_id, period, total_points, exact_scores, 
        winner_and_diff_count, winner_and_winner_goals_count, 
        draw_count, only_winner_count, knockout_points
    )
    SELECT 
        p.league_id,
        p.user_id,
        period_val as period,
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
    JOIN leagues l ON p.league_id = l.id
    JOIN profiles pr ON p.user_id = pr.id
    CROSS JOIN unnest(public.get_match_period(m.id, m.phase)) as period_val
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id, period_val
    ORDER BY p.league_id, p.user_id, period_val
    ON CONFLICT (league_id, user_id, period) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        exact_scores = EXCLUDED.exact_scores,
        winner_and_diff_count = EXCLUDED.winner_and_diff_count,
        winner_and_winner_goals_count = EXCLUDED.winner_and_winner_goals_count,
        draw_count = EXCLUDED.draw_count,
        only_winner_count = EXCLUDED.only_winner_count,
        knockout_points = EXCLUDED.knockout_points;

    -- ---------------------------------------------------------
    -- 2. LIGAS DO BRASIL
    -- ---------------------------------------------------------
    INSERT INTO public.brazil_league_rankings (
        league_id, user_id, period, total_points, exact_scores, 
        winner_and_diff_count, winner_and_winner_goals_count, 
        draw_count, only_winner_count, knockout_points
    )
    SELECT 
        p.league_id,
        p.user_id,
        period_val as period,
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
    JOIN brazil_leagues bl ON p.league_id = bl.id
    JOIN profiles pr ON p.user_id = pr.id
    CROSS JOIN unnest(public.get_match_period(m.id, m.phase)) as period_val
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id, period_val
    ORDER BY p.league_id, p.user_id, period_val
    ON CONFLICT (league_id, user_id, period) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        exact_scores = EXCLUDED.exact_scores,
        winner_and_diff_count = EXCLUDED.winner_and_diff_count,
        winner_and_winner_goals_count = EXCLUDED.winner_and_winner_goals_count,
        draw_count = EXCLUDED.draw_count,
        only_winner_count = EXCLUDED.only_winner_count,
        knockout_points = EXCLUDED.knockout_points;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
