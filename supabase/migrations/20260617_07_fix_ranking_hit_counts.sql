-- Atualiza a função de Ranking para contar os acertos da forma perfeita (baseado nos placares, não nos pontos)
CREATE OR REPLACE FUNCTION public.refresh_league_rankings(p_league_id text)
RETURNS void AS $$
BEGIN
    -- ---------------------------------------------------------
    -- 1. LIGAS PADRÕES
    -- ---------------------------------------------------------
    DELETE FROM league_rankings WHERE league_id = p_league_id;

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
    WHERE p.league_id = p_league_id AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id;

    -- (Top Finishers continua igual, o banco já cuida disso separadamente)

    -- ---------------------------------------------------------
    -- 2. LIGAS DO BRASIL
    -- ---------------------------------------------------------
    DELETE FROM brazil_league_rankings WHERE league_id = p_league_id;

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
    WHERE p.league_id = p_league_id AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Script para forçar a reconstrução imediata de todos os rankings com a matemática correta
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM leagues LOOP
        PERFORM public.refresh_league_rankings(r.id);
    END LOOP;
    
    FOR r IN SELECT id FROM brazil_leagues LOOP
        PERFORM public.refresh_league_rankings(r.id);
    END LOOP;
END;
$$;
