
-- Tabela para gerenciar múltiplos tokens por usuário (um por dispositivo/navegador)
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    device_type TEXT, -- 'web', 'android', 'ios'
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Habilitar RLS
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Usuários podem ver seus próprios tokens" 
    ON user_fcm_tokens FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios tokens" 
    ON user_fcm_tokens FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios tokens" 
    ON user_fcm_tokens FOR DELETE 
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios tokens" 
    ON user_fcm_tokens FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Índice para busca rápida
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user_id ON user_fcm_tokens(user_id);
