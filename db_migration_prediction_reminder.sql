-- ==============================================================================
-- MIGRAÇÃO: LEMBRETE DE PALPITE VIA PG_CRON (SUPABASE)
-- ==============================================================================
-- Execute este SQL no Supabase SQL Editor para habilitar lembretes automáticos

-- 1. Habilitar pg_cron (se ainda não estiver habilitado)
-- No Supabase Dashboard: Settings > Database > Extensions > pg_cron (Enable)

-- 2. Habilitar a extensão http
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 3. Criar a função que chama o endpoint de lembrete
CREATE OR REPLACE FUNCTION public.call_prediction_reminder()
RETURNS void AS $$
DECLARE
  webhook_url text := 'https://bolaodacopa2026.app/api/push/reminder';
  webhook_secret text := 'bolao2026_secure_webhook_key';
BEGIN
  PERFORM
    extensions.http_post(
      webhook_url,
      jsonb_build_object(
        'secret', webhook_secret
      )::text,
      'application/json'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Configurar o pg_cron para rodar a cada 5 minutos
-- IMPORTANTE: Execute primeiro "CREATE EXTENSION IF NOT EXISTS pg_cron;" se necessário
-- No Supabase, pg_cron precisa ser habilitado pelo Dashboard

-- Remove job existente se houver
SELECT cron.unschedule('prediction_reminder_job') 
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'prediction_reminder_job'
);

-- Cria novo job: roda a cada 5 minutos
SELECT cron.schedule(
  'prediction_reminder_job',
  '*/5 * * * *',
  $$SELECT public.call_prediction_reminder()$$
);

-- Verificar se o job foi criado
-- SELECT * FROM cron.job WHERE jobname = 'prediction_reminder_job';
