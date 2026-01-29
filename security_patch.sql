-- ==============================================================================
-- ATUALIZAÇÃO DE SEGURANÇA - VISIBILIDADE DE PALPITES
-- ==============================================================================

-- 1. Remove a política antiga que permitia ver todos os palpites
DROP POLICY IF EXISTS "Public read predictions" ON predictions;

-- 2. Cria nova política:
-- - Usuário pode ver seus próprios palpites SEMPRE.
-- - Usuário pode ver palpites de OUTROS apenas se o jogo JÁ COMEÇOU.
CREATE POLICY "Secure read predictions" ON predictions 
FOR SELECT 
USING (
  -- O próprio dono pode ver
  auth.uid() = user_id 
  OR 
  -- Outros podem ver se o jogo já bloqueou os palpites (5 min antes)
  EXISTS (
    SELECT 1 FROM matches 
    WHERE matches.id = predictions.match_id 
    AND NOW() >= (matches.date - interval '5 minutes')
  )
);
