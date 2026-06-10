-- ==============================================================================
-- BLINDAGEM E ATUALIZAÇÃO DE RLS DAS TABELAS DE LIGAS (Padrão e Brasil)
-- Permite que o Criador (admin_id) ou Administradores Gerais (is_admin = true) atualizem/deletem.
-- ==============================================================================

-- 1. Garante que RLS está ativo na tabela leagues
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

-- 2. Remove as políticas antigas de UPDATE e DELETE da tabela leagues
DROP POLICY IF EXISTS "Authenticated update leagues" ON leagues;
DROP POLICY IF EXISTS "Users can join leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can update their leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can manage own leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can update own leagues" ON leagues;
DROP POLICY IF EXISTS "Admin delete leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can delete their leagues" ON leagues;
DROP POLICY IF EXISTS "Admins can delete own leagues" ON leagues;

-- 3. Cria a nova política restritiva para UPDATE em leagues (Criador ou Admin Geral)
CREATE POLICY "Admins can update own leagues" ON leagues 
FOR UPDATE USING (
  (auth.uid()::text = admin_id::text) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
);

-- 4. Cria a nova política restritiva para DELETE em leagues (Criador ou Admin Geral)
CREATE POLICY "Admins can delete own leagues" ON leagues
FOR DELETE USING (
  (auth.uid()::text = admin_id::text) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
);


-- 5. Garante que RLS está ativo na tabela brazil_leagues
ALTER TABLE brazil_leagues ENABLE ROW LEVEL SECURITY;

-- 6. Remove as políticas antigas de UPDATE e DELETE da tabela brazil_leagues
DROP POLICY IF EXISTS "Admins can update their brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admins can delete their brazil leagues" ON brazil_leagues;

-- 7. Cria a nova política restritiva para UPDATE em brazil_leagues (Criador ou Admin Geral)
CREATE POLICY "Admins can update their brazil leagues" ON brazil_leagues 
FOR UPDATE USING (
  (auth.uid()::text = admin_id::text) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
);

-- 8. Cria a nova política restritiva para DELETE em brazil_leagues (Criador ou Admin Geral)
CREATE POLICY "Admins can delete their brazil leagues" ON brazil_leagues 
FOR DELETE USING (
  (auth.uid()::text = admin_id::text) OR 
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))
);
