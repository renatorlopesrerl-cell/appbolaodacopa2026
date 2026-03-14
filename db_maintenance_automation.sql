
-- 1. FUNÇÃO PARA INICIAR JOGOS AUTOMATICAMENTE (RODA COM PERMISSÃO DE SISTEMA)
CREATE OR REPLACE FUNCTION public.auto_start_upcoming_matches()
RETURNS integer AS $$
DECLARE
  started_count integer;
BEGIN
  -- Atualiza status para IN_PROGRESS de todos os jogos que já deveriam ter começado
  -- e que ainda estão como SCHEDULED.
  WITH updated AS (
    UPDATE matches
    SET status = 'IN_PROGRESS'
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
  -- Passo 1: Inicia os jogos no Banco de Dados (Garante que o status mude independente da Web)
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

-- 3. AGENDAMENTO (ROBÔ) - Roda a cada 5 minutos
CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.unschedule('prediction_reminder_job');
SELECT cron.schedule(
  'prediction_reminder_job',
  '*/5 * * * *', 
  $$SELECT public.call_system_maintenance()$$
);
