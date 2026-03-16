-- ==============================================================================
-- TABELA DE SIMULAÇÕES DO USUÁRIO
-- ==============================================================================
CREATE TABLE IF NOT EXISTS user_simulations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    simulation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_user_simulation UNIQUE (user_id) -- Por enquanto, 1 simulação por usuário
);

ALTER TABLE user_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own simulation" ON user_simulations;

CREATE POLICY "Users can manage their own simulation" ON user_simulations
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
