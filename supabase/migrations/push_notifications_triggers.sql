-- ==============================================================================
-- MIGRAÇÃO: SISTEMA DE NOTIFICAÇÕES PUSH VIA SQL (SUPABASE WEBHOOKS)
-- ==============================================================================

-- 1. Habilitar a extensão "http" se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- 2. Função genérica para chamar o Webhook da Cloudflare
CREATE OR REPLACE FUNCTION public.send_push_webhook(type text, payload jsonb)
RETURNS void AS $$
DECLARE
  webhook_url text := 'https://bolaodacopa2026.app/api/push/webhook';
  webhook_secret text := 'bolao2026_secure_webhook_key';
BEGIN
  PERFORM
    extensions.http_post(
      webhook_url,
      jsonb_build_object(
        'type', type,
        'payload', payload,
        'secret', webhook_secret
      )::text,
      'application/json'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger para NOVOS CONVITES (league_invites)
CREATE OR REPLACE FUNCTION public.on_league_invite_insert()
RETURNS TRIGGER AS $$
DECLARE
  l_name text;
BEGIN
  IF NEW.league_type = 'brazil' THEN
    SELECT name INTO l_name FROM brazil_leagues WHERE id = NEW.league_id;
  ELSE
    SELECT name INTO l_name FROM leagues WHERE id = NEW.league_id;
  END IF;
  
  PERFORM public.send_push_webhook('league_invite', jsonb_build_object(
    'league_id', NEW.league_id,
    'email', NEW.email,
    'league_name', COALESCE(l_name, 'Nova Liga'),
    'league_type', NEW.league_type
  ));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_league_invite_push ON league_invites;
CREATE TRIGGER trigger_league_invite_push
AFTER INSERT ON league_invites
FOR EACH ROW EXECUTE FUNCTION public.on_league_invite_insert();

-- 4. Trigger para SOLICITAÇÕES DE ENTRADA (leagues.pending_requests)
CREATE OR REPLACE FUNCTION public.on_league_request_update()
RETURNS TRIGGER AS $$
DECLARE
  u_id uuid;
  u_name text;
BEGIN
  -- Verifica se um novo ID foi adicionado ao array pending_requests
  IF (array_length(NEW.pending_requests, 1) > array_length(OLD.pending_requests, 1) OR OLD.pending_requests IS NULL) THEN
    -- Pega o último ID adicionado
    u_id := NEW.pending_requests[array_upper(NEW.pending_requests, 1)];
    SELECT name INTO u_name FROM profiles WHERE id = u_id;
    
    PERFORM public.send_push_webhook('league_request', jsonb_build_object(
      'league_id', NEW.id,
      'league_name', NEW.name,
      'user_name', COALESCE(u_name, 'Novo Usuário'),
      'admin_id', NEW.admin_id
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_league_request_push ON leagues;
CREATE TRIGGER trigger_league_request_push
AFTER UPDATE OF pending_requests ON leagues
FOR EACH ROW EXECUTE FUNCTION public.on_league_request_update();

-- 5. Trigger para APROVAÇÃO DE MEMBROS (leagues.participants)
CREATE OR REPLACE FUNCTION public.on_league_approval_update()
RETURNS TRIGGER AS $$
DECLARE
  u_id uuid;
BEGIN
  -- Verifica se um novo ID foi adicionado ao array participants
  IF (array_length(NEW.participants, 1) > array_length(OLD.participants, 1)) THEN
    -- Pega o último ID adicionado
    u_id := NEW.participants[array_upper(NEW.participants, 1)];
    
    PERFORM public.send_push_webhook('league_approval', jsonb_build_object(
      'league_id', NEW.id,
      'league_name', NEW.name,
      'user_id', u_id
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_league_approval_push ON leagues;
CREATE TRIGGER trigger_league_approval_push
AFTER UPDATE OF participants ON leagues
FOR EACH ROW EXECUTE FUNCTION public.on_league_approval_update();

-- 7. SOLICITAÇÕES NO MODO BRASIL
CREATE OR REPLACE FUNCTION public.on_brazil_league_request_update()
RETURNS TRIGGER AS $$
DECLARE
  u_id uuid;
  u_name text;
BEGIN
  IF (array_length(NEW.pending_requests, 1) > array_length(OLD.pending_requests, 1) OR OLD.pending_requests IS NULL) THEN
    u_id := NEW.pending_requests[array_upper(NEW.pending_requests, 1)];
    SELECT name INTO u_name FROM profiles WHERE id = u_id;
    
    PERFORM public.send_push_webhook('league_request', jsonb_build_object(
      'league_id', NEW.id,
      'league_name', NEW.name,
      'user_name', COALESCE(u_name, 'Novo Usuário'),
      'admin_id', NEW.admin_id,
      'league_type', 'brazil'
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_brazil_league_request_push ON brazil_leagues;
CREATE TRIGGER trigger_brazil_league_request_push
AFTER UPDATE OF pending_requests ON brazil_leagues
FOR EACH ROW EXECUTE FUNCTION public.on_brazil_league_request_update();

-- 8. APROVAÇÃO NO MODO BRASIL
CREATE OR REPLACE FUNCTION public.on_brazil_league_approval_update()
RETURNS TRIGGER AS $$
DECLARE
  u_id uuid;
BEGIN
  IF (array_length(NEW.participants, 1) > array_length(OLD.participants, 1)) THEN
    u_id := NEW.participants[array_upper(NEW.participants, 1)];
    
    PERFORM public.send_push_webhook('league_approval', jsonb_build_object(
      'league_id', NEW.id,
      'league_name', NEW.name,
      'user_id', u_id,
      'league_type', 'brazil'
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_brazil_league_approval_push ON brazil_leagues;
CREATE TRIGGER trigger_brazil_league_approval_push
AFTER UPDATE OF participants ON brazil_leagues
FOR EACH ROW EXECUTE FUNCTION public.on_brazil_league_approval_update();

-- 6. Trigger para GOLS E FIM DE JOGO (matches)
CREATE OR REPLACE FUNCTION public.on_match_status_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Envia push apenas se o status mudar para em andamento ou finalizado
  IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.status IN ('FINISHED')) THEN
    PERFORM public.send_push_webhook('match_update', jsonb_build_object(
      'match_id', NEW.id,
      'home', NEW.home_team_id,
      'away', NEW.away_team_id,
      'status', NEW.status,
      'home_score', NEW.home_score,
      'away_score', NEW.away_score
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_match_status_push ON matches;
CREATE TRIGGER trigger_match_status_push
AFTER UPDATE OF status ON matches
FOR EACH ROW EXECUTE FUNCTION public.on_match_status_push();
