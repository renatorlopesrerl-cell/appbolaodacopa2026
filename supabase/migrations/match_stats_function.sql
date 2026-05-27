-- ==============================================================================
-- FUNÇÃO: get_match_stats
-- Calcula estatísticas agregadas de palpites para uma partida em uma liga.
-- SECURITY DEFINER: roda com privilégios do owner, bypassando RLS de forma segura.
-- Valida que o usuário é participante da liga antes de retornar os dados.
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_match_stats(
    p_match_id   text,
    p_league_id  text,
    p_league_type text,  -- 'brazil' | 'standard'
    p_user_id    uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_participants text[];
    v_total        integer := 0;
    v_home_wins    integer := 0;
    v_draws        integer := 0;
    v_away_wins    integer := 0;
    v_home_pct     integer;
    v_away_pct     integer;
    v_draw_pct     integer;
    v_most_score   text;
BEGIN
    -- 1. Verificar que o usuário é participante da liga
    IF p_league_type = 'brazil' THEN
        SELECT participants INTO v_participants
        FROM brazil_leagues WHERE id = p_league_id;
    ELSE
        SELECT participants INTO v_participants
        FROM leagues WHERE id = p_league_id;
    END IF;

    IF v_participants IS NULL THEN
        RETURN json_build_object('error', 'Liga não encontrada');
    END IF;

    IF NOT (p_user_id::text = ANY(v_participants)) THEN
        RETURN json_build_object('error', 'Proibido: usuário não é participante');
    END IF;

    -- 2. Calcular estatísticas diretamente no banco (sem expor dados individuais)
    IF p_league_type = 'brazil' THEN
        SELECT
            COUNT(*) FILTER (WHERE home_score > away_score),
            COUNT(*) FILTER (WHERE home_score = away_score),
            COUNT(*) FILTER (WHERE home_score < away_score),
            COUNT(*)
        INTO v_home_wins, v_draws, v_away_wins, v_total
        FROM brazil_predictions
        WHERE match_id   = p_match_id
          AND league_id  = p_league_id
          AND user_id::text = ANY(v_participants);

        -- Placar mais palpitado (maior contagem → menos gols → mais gols do mandante)
        SELECT home_score || '-' || away_score INTO v_most_score
        FROM brazil_predictions
        WHERE match_id  = p_match_id
          AND league_id = p_league_id
          AND user_id::text = ANY(v_participants)
        GROUP BY home_score, away_score
        ORDER BY COUNT(*) DESC, (home_score + away_score) ASC, home_score DESC
        LIMIT 1;

    ELSE
        SELECT
            COUNT(*) FILTER (WHERE home_score > away_score),
            COUNT(*) FILTER (WHERE home_score = away_score),
            COUNT(*) FILTER (WHERE home_score < away_score),
            COUNT(*)
        INTO v_home_wins, v_draws, v_away_wins, v_total
        FROM predictions
        WHERE match_id  = p_match_id
          AND league_id = p_league_id
          AND user_id::text = ANY(v_participants);

        SELECT home_score || '-' || away_score INTO v_most_score
        FROM predictions
        WHERE match_id  = p_match_id
          AND league_id = p_league_id
          AND user_id::text = ANY(v_participants)
        GROUP BY home_score, away_score
        ORDER BY COUNT(*) DESC, (home_score + away_score) ASC, home_score DESC
        LIMIT 1;
    END IF;

    -- 3. Retornar zeros se não houver palpites
    IF v_total = 0 THEN
        RETURN json_build_object(
            'totalPreds',        0,
            'mostPredictedScore', null,
            'homeWinPct',        0,
            'drawPct',           0,
            'awayWinPct',        0
        );
    END IF;

    -- 4. Calcular porcentagens (garantindo que somam 100)
    v_home_pct := ROUND((v_home_wins::numeric / v_total) * 100);
    v_away_pct := ROUND((v_away_wins::numeric / v_total) * 100);
    v_draw_pct := 100 - v_home_pct - v_away_pct;

    RETURN json_build_object(
        'totalPreds',        v_total,
        'mostPredictedScore', v_most_score,
        'homeWinPct',        v_home_pct,
        'drawPct',           v_draw_pct,
        'awayWinPct',        v_away_pct
    );
END;
$$;

-- Permitir que usuários autenticados chamem a função
GRANT EXECUTE ON FUNCTION get_match_stats(text, text, text, uuid) TO authenticated;
