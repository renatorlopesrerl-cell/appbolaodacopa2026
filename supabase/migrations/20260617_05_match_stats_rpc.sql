-- Migration to create the match statistics RPC
CREATE OR REPLACE FUNCTION get_match_detailed_stats(p_league_id UUID, p_match_id UUID, p_is_brazil BOOLEAN)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result json;
BEGIN
  IF p_is_brazil THEN
    SELECT json_build_object(
      'stats', (
        SELECT json_build_object(
          'total', count(*),
          'home_wins', count(*) FILTER (WHERE home_score > away_score),
          'draws', count(*) FILTER (WHERE home_score = away_score),
          'away_wins', count(*) FILTER (WHERE home_score < away_score)
        )
        FROM brazil_predictions
        WHERE league_id = p_league_id AND match_id = p_match_id
      ),
      'predictions', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'user_id', user_id,
            'home_score', home_score,
            'away_score', away_score,
            'points', points,
            'goalscorer_points', goalscorer_points,
            'player_pick', player_pick
          )
        ), '[]'::json)
        FROM brazil_predictions
        WHERE league_id = p_league_id AND match_id = p_match_id
      )
    ) INTO v_result;
  ELSE
    SELECT json_build_object(
      'stats', (
        SELECT json_build_object(
          'total', count(*),
          'home_wins', count(*) FILTER (WHERE home_score > away_score),
          'draws', count(*) FILTER (WHERE home_score = away_score),
          'away_wins', count(*) FILTER (WHERE home_score < away_score)
        )
        FROM predictions
        WHERE league_id = p_league_id AND match_id = p_match_id
      ),
      'predictions', (
        SELECT COALESCE(json_agg(
          json_build_object(
            'user_id', user_id,
            'home_score', home_score,
            'away_score', away_score,
            'points', points
          )
        ), '[]'::json)
        FROM predictions
        WHERE league_id = p_league_id AND match_id = p_match_id
      )
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;
