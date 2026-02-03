-- ==============================================================================
-- PROTEÇÃO CONTRA EDIÇÃO MANUAL (ADMIN DASHBOARD)
-- ==============================================================================

-- 1. Cria a função de proteção
-- Essa função impede INSERT/UPDATE/DELETE se não houver um usuário autenticado (auth.uid() IS NULL).
-- Isso bloqueia edições feitas diretamente pelo Painel do Supabase (tabela ou SQL editor)
-- mas PERMITE:
-- a) Edições via Aplicativo (onde auth.uid() existe)
-- b) Edições via Triggers internos (ex: cálculo de pontos), pois checamos pg_trigger_depth
CREATE OR REPLACE FUNCTION prevent_manual_admin_edits()
RETURNS TRIGGER AS $$
BEGIN
  -- Permite atualizações automáticas via outros triggers (ex: matches update -> updates predictions)
  -- Se o depth for > 1, significa que foi chamado por outro trigger
  IF (pg_trigger_depth() > 1) THEN
     RETURN NEW;
  END IF;

  -- Se for edição direta (depth 1) e NÃO tiver usuário logado (token), bloqueia.
  -- No dashboard do Supabase, auth.uid() retorna NULL.
  IF auth.uid() IS NULL THEN
     RAISE EXCEPTION 'SECURITY_VIOLATION: Edição manual não permitida nesta tabela. Use o aplicativo.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Aplica na tabela PREDICTIONS (Todas as colunas/ações)
DROP TRIGGER IF EXISTS block_admin_predictions ON predictions;
CREATE TRIGGER block_admin_predictions
BEFORE INSERT OR UPDATE OR DELETE ON predictions
FOR EACH ROW
EXECUTE FUNCTION prevent_manual_admin_edits();


-- 3. Aplica na tabela USER_SIMULATIONS
-- (Garante que a tabela existe, por segurança)
CREATE TABLE IF NOT EXISTS user_simulations (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    simulation_data jsonb,
    updated_at timestamptz DEFAULT NOW()
);
ALTER TABLE user_simulations ENABLE ROW LEVEL SECURITY;

-- Cria política RLS básica se não existir (para o app funcionar)
DROP POLICY IF EXISTS "Users can manage own simulation" ON user_simulations;
CREATE POLICY "Users can manage own simulation" ON user_simulations
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Aplica o trigger de bloqueio admin
DROP TRIGGER IF EXISTS block_admin_simulations ON user_simulations;
CREATE TRIGGER block_admin_simulations
BEFORE INSERT OR UPDATE OR DELETE ON user_simulations
FOR EACH ROW
EXECUTE FUNCTION prevent_manual_admin_edits();


-- 4. Proteção da coluna ID na tabela PROFILES
CREATE OR REPLACE FUNCTION prevent_profile_id_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o ID mudou, rejeita
  IF NEW.id IS DISTINCT FROM OLD.id THEN
     RAISE EXCEPTION 'INTEGRITY_VIOLATION: O ID do perfil não pode ser alterado.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS protect_profile_id ON profiles;
CREATE TRIGGER protect_profile_id
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_profile_id_change();

-- Conclusão
-- Execute este script no SQL Editor do Supabase.
