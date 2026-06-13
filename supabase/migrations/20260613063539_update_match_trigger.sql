CREATE OR REPLACE FUNCTION public.on_match_status_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Envia push apenas se o status mudar para em andamento ou finalizado
  IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.status IN ('IN_PROGRESS', 'FINISHED')) THEN
    PERFORM public.send_push_webhook('match_update', jsonb_build_object(
      'match_id', NEW.id,
      'home_team_id', NEW.home_team_id,
      'away_team_id', NEW.away_team_id,
      'status', NEW.status,
      'home_score', NEW.home_score,
      'away_score', NEW.away_score,
      'old_status', OLD.status
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
