-- 1. Helper function to get match round (1, 2, or 3) for Group Phase
CREATE OR REPLACE FUNCTION public.get_match_round(p_match_id text)
RETURNS text AS $$
DECLARE
    v_match_num integer;
BEGIN
    -- Group stage matches look like 'm-A1', 'm-B6', etc.
    -- We check if it matches the pattern 'm-[A-L][1-6]'
    IF p_match_id ~ '^m-[A-L][1-6]$' THEN
        v_match_num := substring(p_match_id from '[1-6]$')::integer;
        RETURN CASE 
            WHEN v_match_num IN (1, 2) THEN '1'
            WHEN v_match_num IN (3, 4) THEN '2'
            WHEN v_match_num IN (5, 6) THEN '3'
            ELSE NULL
        END;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Helper function to return array of periods a match belongs to
CREATE OR REPLACE FUNCTION public.get_match_period(p_match_id text, p_phase text)
RETURNS text[] AS $$
DECLARE
    v_periods text[] := ARRAY['total'];
    v_round text;
BEGIN
    -- Group Phase
    IF p_phase = 'Grupos' THEN
        v_periods := array_append(v_periods, 'group_phase');
        v_round := public.get_match_round(p_match_id);
        IF v_round IS NOT NULL THEN
            v_periods := array_append(v_periods, v_round);
        END IF;
    -- 16-avos de Final (Round of 32)
    ELSIF p_phase = '16-avos de Final' THEN
        v_periods := array_append(v_periods, '16_avos');
        v_periods := array_append(v_periods, 'knockout');
    -- Oitavas de Final, Quartas de Final, Semifinal
    ELSIF p_phase IN ('Oitavas de Final', 'Quartas de Final', 'Semifinal') THEN
        v_periods := array_append(v_periods, 'knockout');
    -- Final / Terceiro Lugar
    ELSIF p_phase = 'Final' THEN
        v_periods := array_append(v_periods, 'knockout');
        v_periods := array_append(v_periods, 'final_phase');
    END IF;
    
    RETURN v_periods;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Add period column and alter primary keys
ALTER TABLE public.league_rankings ADD COLUMN IF NOT EXISTS period text DEFAULT 'total';
ALTER TABLE public.brazil_league_rankings ADD COLUMN IF NOT EXISTS period text DEFAULT 'total';

-- Drop old constraints
ALTER TABLE public.league_rankings DROP CONSTRAINT IF EXISTS league_rankings_pkey;
ALTER TABLE public.brazil_league_rankings DROP CONSTRAINT IF EXISTS brazil_league_rankings_pkey;

-- Create composite primary keys
ALTER TABLE public.league_rankings ADD PRIMARY KEY (league_id, user_id, period);
ALTER TABLE public.brazil_league_rankings ADD PRIMARY KEY (league_id, user_id, period);

-- Recreate indices for optimal query speed
DROP INDEX IF EXISTS idx_league_rankings_points;
CREATE INDEX IF NOT EXISTS idx_league_rankings_points ON public.league_rankings(league_id, period, total_points DESC, exact_scores DESC);

DROP INDEX IF EXISTS idx_brazil_league_rankings_points;
CREATE INDEX IF NOT EXISTS idx_brazil_league_rankings_points ON public.brazil_league_rankings(league_id, period, total_points DESC, exact_scores DESC);

-- 4. Recreate refresh_multiple_league_rankings to support period-based calculations
CREATE OR REPLACE FUNCTION public.refresh_multiple_league_rankings(p_league_ids text[])
RETURNS void AS $$
BEGIN
    -- ---------------------------------------------------------
    -- 1. LIGAS PADRÕES (STANDARD LEAGUES)
    -- ---------------------------------------------------------
    DELETE FROM public.league_rankings WHERE league_id = ANY(p_league_ids);

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
    JOIN leagues l ON p.league_id = l.id  -- Garante que a liga existe
    JOIN profiles pr ON p.user_id = pr.id  -- Garante que o usuário existe
    CROSS JOIN unnest(public.get_match_period(m.id, m.phase)) as period_val
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id, period_val;

    -- ---------------------------------------------------------
    -- 2. LIGAS DO BRASIL (BRAZIL LEAGUES)
    -- ---------------------------------------------------------
    DELETE FROM public.brazil_league_rankings WHERE league_id = ANY(p_league_ids);

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
    JOIN brazil_leagues bl ON p.league_id = bl.id  -- Garante que a liga existe
    JOIN profiles pr ON p.user_id = pr.id  -- Garante que o usuário existe
    CROSS JOIN unnest(public.get_match_period(m.id, m.phase)) as period_val
    WHERE p.league_id = ANY(p_league_ids) AND m.status IN ('FINISHED', 'IN_PROGRESS') AND m.home_score IS NOT NULL
    GROUP BY p.league_id, p.user_id, period_val;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Run initial recalculation for all existing leagues to populate period rankings
DO $$
DECLARE
    l_ids text[];
    bl_ids text[];
BEGIN
    SELECT array_agg(id) INTO l_ids FROM public.leagues;
    IF array_length(l_ids, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(l_ids);
    END IF;

    SELECT array_agg(id) INTO bl_ids FROM public.brazil_leagues;
    IF array_length(bl_ids, 1) > 0 THEN
        PERFORM public.refresh_multiple_league_rankings(bl_ids);
    END IF;
END $$;
