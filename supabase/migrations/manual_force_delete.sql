-- ==============================================================================
-- FORÇAR EXCLUSÃO DE CONTA (PRESERVANDO LIGAS)
-- ==============================================================================
-- Este script:
-- 1. Permite que o 'admin_id' da liga seja NULO (para não deletar a liga).
-- 2. Define o 'admin_id' como NULL ao deletar o usuário.
-- 3. Deleta apenas os dados pessoais do usuário, mantendo as ligas e palpites de outros.

-- Passo 1: Garantir que admin_id pode ser NULO e configurar SET NULL
DO $$ BEGIN
    -- Tenta remover a restrição NOT NULL se existir
    ALTER TABLE leagues ALTER COLUMN admin_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN NULL;
END $$;

DO $$ BEGIN
    -- Recria a FK para SET NULL
    ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_admin_id_fkey;
    ALTER TABLE leagues ADD CONSTRAINT leagues_admin_id_fkey 
        FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;


-- Passo 2: Função de exclusão ajustada
CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  -- Bypass de triggers de segurança
  PERFORM set_config('app.deleting_user', 'true', true);

  -- 1. Deletar Palpites DO USUÁRIO (apenas os dele)
  DELETE FROM public.predictions WHERE user_id = current_user_id;

  -- 2. Deletar Simulações DO USUÁRIO
  DELETE FROM public.user_simulations WHERE user_id = current_user_id;

  -- 3. LIGAS (ADMIN): NÃO DELETAR LIGA. Apenas desvincular Admin.
  -- O comando ON DELETE SET NULL na FK já faria isso, mas forçamos aqui para garantir
  -- que o admin_id fique NULL antes do usuário sumir.
  UPDATE public.leagues 
  SET admin_id = NULL 
  WHERE admin_id = current_user_id;

  -- 4. Remover usuário de PARTICIPANTES de todas as ligas
  UPDATE public.leagues
  SET participants = participants - current_user_id::text
  WHERE participants @> to_jsonb(current_user_id::text);

  UPDATE public.leagues
  SET pending_requests = pending_requests - current_user_id::text
  WHERE pending_requests @> to_jsonb(current_user_id::text);

  -- 5. Deletar Perfil
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- 6. Finalmente, deletar usuário da autenticação
  DELETE FROM auth.users WHERE id = current_user_id;
  
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;
