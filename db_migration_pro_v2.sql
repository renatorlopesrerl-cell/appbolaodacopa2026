-- Adiciona coluna is_pro se não existir (já criado antes, mas reforçando)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;

-- Adiciona coluna pro_expires_at para validade do plano
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_expires_at timestamptz;

-- Atualiza permissões
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
