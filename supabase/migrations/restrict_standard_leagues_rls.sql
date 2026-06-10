-- ==============================================================================
-- BLINDAGEM DE RLS DA TABELA LEAGUES (Ligas Padrões)
-- ==============================================================================

-- 1. Garante que RLS está ativo
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- 2. Remove as políticas antigas de UPDATE que eram permissivas demais
DROP POLICY IF EXISTS "Authenticated update leagues" ON leagues;
DROP POLICY IF EXISTS "Users can join leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can update their leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can manage own leagues" ON leagues;

-- 3. Cria a nova política restritiva para UPDATE: apenas o dono (admin_id) pode atualizar
CREATE POLICY "Admins can update own leagues" ON leagues 
FOR UPDATE USING (auth.uid()::text = admin_id::text);

-- 4. Cria a nova política restritiva para DELETE: apenas o dono (admin_id) pode deletar
DROP POLICY IF EXISTS "Admin delete leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can delete their leagues" ON leagues;

CREATE POLICY "Admins can delete own leagues" ON leagues
FOR DELETE USING (auth.uid()::text = admin_id::text);
