-- ==============================================================================
-- 1. FUNÇÕES DE REFRESH DE RANKING (LIGAS NORMAIS E BRASIL)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.refresh_league_rankings(p_league_id text)
RETURNS void AS $$
BEGIN
    -- Removemos os dados antigos para evitar sobras de usuários que saíram
    DELETE FROM league_rankings WHERE league_id = p_league_id;

    -- Recalcula os pontos baseados na tabela de palpites e configurações da liga
    INSERT INTO league_rankings (
        league_id, user_id, total_points, exact_scores, 
        winner_and_diff_count, winner_and_winner_goals_count, 
        draw_count, only_winner_count, knockout_points
    )
    SELECT 
        p.league_id,
        p.user_id,
        SUM(p.points) as total_points,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'exactScore')::numeric, 10) THEN 1 ELSE 0 END) as exact_scores,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'winnerAndDiff')::numeric, 7) THEN 1 ELSE 0 END) as winner_and_diff_count,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'winnerAndWinnerGoals')::numeric, 6) THEN 1 ELSE 0 END) as winner_and_winner_goals_count,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'draw')::numeric, 5) THEN 1 ELSE 0 END) as draw_count,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'winner')::numeric, 5) THEN 1 ELSE 0 END) as only_winner_count,
        SUM(CASE WHEN m.phase != 'Grupos' THEN p.points ELSE 0 END) as knockout_points
    FROM predictions p
    JOIN matches m ON p.match_id = m.id
    JOIN leagues l ON p.league_id = l.id
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.league_id = p_league_id
    GROUP BY p.league_id, p.user_id, l.settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION public.refresh_brazil_league_rankings(p_league_id text)
RETURNS void AS $$
BEGIN
    -- Removemos os dados antigos
    DELETE FROM brazil_league_rankings WHERE league_id = p_league_id;

    -- Recalcula os pontos
    INSERT INTO brazil_league_rankings (
        league_id, user_id, total_points, exact_scores, 
        winner_and_diff_count, winner_and_winner_goals_count, 
        draw_count, only_winner_count, knockout_points
    )
    SELECT 
        p.league_id,
        p.user_id,
        SUM(p.points + COALESCE(p.goalscorer_points, 0)) as total_points,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'exactScore')::numeric, 10) THEN 1 ELSE 0 END) as exact_scores,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'winnerAndDiff')::numeric, 7) THEN 1 ELSE 0 END) as winner_and_diff_count,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'winnerAndWinnerGoals')::numeric, 6) THEN 1 ELSE 0 END) as winner_and_winner_goals_count,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'draw')::numeric, 6) THEN 1 ELSE 0 END) as draw_count,
        SUM(CASE WHEN p.points = COALESCE((l.settings->>'winner')::numeric, 5) THEN 1 ELSE 0 END) as only_winner_count,
        SUM(CASE WHEN m.phase != 'Grupos' THEN (p.points + COALESCE(p.goalscorer_points, 0)) ELSE 0 END) as knockout_points
    FROM brazil_predictions p
    JOIN matches m ON p.match_id = m.id
    JOIN brazil_leagues l ON p.league_id = l.id
    JOIN profiles pr ON p.user_id = pr.id
    WHERE p.league_id = p_league_id
    GROUP BY p.league_id, p.user_id, l.settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==============================================================================
-- 2. TRIGGERS PARA ATIVAÇÃO AUTOMÁTICA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.trigger_refresh_rankings()
RETURNS TRIGGER AS $$
BEGIN
    -- Se houve atualização nos pontos do palpite
    IF (TG_OP = 'UPDATE' AND NEW.points IS DISTINCT FROM OLD.points) THEN
        PERFORM public.refresh_league_rankings(NEW.league_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_prediction_points_update ON predictions;
CREATE TRIGGER on_prediction_points_update
AFTER UPDATE ON predictions
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_refresh_rankings();


CREATE OR REPLACE FUNCTION public.trigger_refresh_brazil_rankings()
RETURNS TRIGGER AS $$
BEGIN
    -- Se houve atualização nos pontos (placares ou artilheiros)
    IF (TG_OP = 'UPDATE' AND (NEW.points IS DISTINCT FROM OLD.points OR NEW.goalscorer_points IS DISTINCT FROM OLD.goalscorer_points)) THEN
        PERFORM public.refresh_brazil_league_rankings(NEW.league_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_brazil_prediction_points_update ON brazil_predictions;
CREATE TRIGGER on_brazil_prediction_points_update
AFTER UPDATE ON brazil_predictions
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_refresh_brazil_rankings();
