-- Adiciona coluna is_pro na tabela profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false;

-- Atualiza permissões (embora já deva herdar, por segurança)
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
