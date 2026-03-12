-- Adiciona política de UPDATE para permitir o upsert na tabela user_fcm_tokens
CREATE POLICY "Usuários podem atualizar seus próprios tokens" 
    ON user_fcm_tokens FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
