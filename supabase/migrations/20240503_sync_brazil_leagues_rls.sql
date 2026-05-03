-- ==============================================================================
-- SINCRONIZAÇÃO COMPLETA DE RLS: brazil_leagues <-> leagues (Espelhando 9 políticas)
-- ==============================================================================

-- 1. Habilita RLS
ALTER TABLE brazil_leagues ENABLE ROW LEVEL SECURITY;

-- 2. Limpa políticas existentes para evitar conflitos
DROP POLICY IF EXISTS "Brazil leagues viewable by everyone" ON brazil_leagues;
DROP POLICY IF EXISTS "Users can create brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admins can update their brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admins can delete their brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admin delete brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Admins can manage own brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Authenticated insert brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Authenticated update brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Authenticated users can create brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Brazil leagues restricted view" ON brazil_leagues;
DROP POLICY IF EXISTS "Public read brazil leagues" ON brazil_leagues;
DROP POLICY IF EXISTS "Users can join brazil leagues" ON brazil_leagues;

-- 3. CRIAÇÃO DAS 9 POLÍTICAS (Seguindo exatamente o print enviado)

-- [DELETE] Admin delete brazil leagues
CREATE POLICY "Admin delete brazil leagues" ON brazil_leagues 
FOR DELETE USING (auth.uid()::text = admin_id::text);

-- [ALL] Admins can manage own brazil leagues
CREATE POLICY "Admins can manage own brazil leagues" ON brazil_leagues 
FOR ALL USING (auth.uid()::text = admin_id::text);

-- [INSERT] Authenticated insert brazil leagues
CREATE POLICY "Authenticated insert brazil leagues" ON brazil_leagues 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- [UPDATE] Authenticated update brazil leagues
CREATE POLICY "Authenticated update brazil leagues" ON brazil_leagues 
FOR UPDATE USING (auth.role() = 'authenticated');

-- [INSERT] Authenticated users can create brazil leagues
CREATE POLICY "Authenticated users can create brazil leagues" ON brazil_leagues 
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- [SELECT] Brazil leagues restricted view
CREATE POLICY "Brazil leagues restricted view" ON brazil_leagues 
FOR SELECT USING (true);

-- [SELECT] Brazil leagues viewable by everyone
CREATE POLICY "Brazil leagues viewable by everyone" ON brazil_leagues 
FOR SELECT USING (true);

-- [SELECT] Public read brazil leagues
CREATE POLICY "Public read brazil leagues" ON brazil_leagues 
FOR SELECT USING (true);

-- [UPDATE] Users can join brazil leagues
CREATE POLICY "Users can join brazil leagues" ON brazil_leagues 
FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. Bloqueio Admin removido para permitir edições manuais via dashboard.
DROP TRIGGER IF EXISTS block_admin_brazil_leagues ON brazil_leagues;
