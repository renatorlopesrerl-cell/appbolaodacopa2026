
-- 1. FUNÇÃO PARA INICIAR JOGOS AUTOMATICAMENTE (RODA COM PERMISSÃO DE SISTEMA)
-- Agora garante que o placar inicie em 0x0 se estiver nulo
CREATE OR REPLACE FUNCTION public.auto_start_upcoming_matches()
RETURNS integer AS $$
DECLARE
  started_count integer;
BEGIN
  -- Atualiza status para IN_PROGRESS de todos os jogos que já deveriam ter começado
  -- e define os placares iniciais como 0 caso estejam nulos.
  WITH updated AS (
    UPDATE matches
    SET 
        status = 'IN_PROGRESS',
        home_score = COALESCE(home_score, 0),
        away_score = COALESCE(away_score, 0)
    WHERE status = 'SCHEDULED'
    AND date <= NOW()
    RETURNING id
  )
  SELECT count(*) INTO started_count FROM updated;
  
  RETURN started_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO PRINCIPAL DE MANUTENÇÃO (CHAMADA PELO CRON)
CREATE OR REPLACE FUNCTION public.call_system_maintenance()
RETURNS void AS $$
DECLARE
  started_games integer;
  webhook_url text := 'https://bolaodacopa2026.app/api/push/reminder';
  webhook_secret text := 'bolao2026_secure_webhook_key';
BEGIN
  -- Passo 1: Inicia os jogos no Banco de Dados (Garante que o status mude e placar vire 0x0)
  SELECT public.auto_start_upcoming_matches() INTO started_games;

  -- Passo 2: Chama o servidor para enviar os Pushes (Lembretes e Avisos de Início)
  PERFORM
    extensions.http_post(
      webhook_url,
      jsonb_build_object(
        'secret', webhook_secret,
        'started_count', started_games
      )::text,
      'application/json'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. AGENDAMENTO (ROBÔ) - Roda a cada minuto para ser preciso
-- SELECT cron.unschedule('prediction_reminder_job');
-- SELECT cron.schedule(
--   'prediction_reminder_job',
--   '* * * * *', 
--   $$SELECT public.call_system_maintenance()$$
-- );
