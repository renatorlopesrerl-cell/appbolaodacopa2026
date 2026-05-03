-- Adiciona a coluna league_type à tabela league_invites
-- Define o padrão como 'standard' para os convites existentes
ALTER TABLE league_invites ADD COLUMN IF NOT EXISTS league_type text DEFAULT 'standard';

-- Permite que a coluna seja nula ou preenchida com 'brazil'
ALTER TABLE league_invites ALTER COLUMN league_type SET DEFAULT 'standard';

-- Atualiza convites antigos
UPDATE league_invites SET league_type = 'standard' WHERE league_type IS NULL;

-- Garante as permissões
GRANT ALL ON league_invites TO authenticated;
GRANT ALL ON league_invites TO anon;
GRANT ALL ON league_invites TO service_role;
