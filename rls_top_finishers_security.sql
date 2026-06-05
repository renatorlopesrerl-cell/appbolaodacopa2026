-- Ativação do RLS (Row Level Security) na tabela, caso não esteja ativada
ALTER TABLE top_finisher_predictions ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se existirem (para evitar duplicatas)
DROP POLICY IF EXISTS "Ver apenas seus próprios palpites ou todos se o campeonato começou" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios palpites" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios palpites" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios palpites" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Enable read access for all users" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON top_finisher_predictions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON top_finisher_predictions;

-- Cria a política para SELECT
-- O usuário pode visualizar o palpite se: FOR DELE MESMO - OU - SE O CAMPEONATO JÁ INICIOU (horário do primeiro jogo)
CREATE POLICY "Ver apenas seus próprios palpites ou todos se o campeonato começou" 
ON top_finisher_predictions
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  (SELECT MIN(date) FROM matches) <= now()
);

-- Políticas para INSERT, UPDATE e DELETE garantindo que o usuário só altere os próprios palpites
CREATE POLICY "Usuários podem inserir seus próprios palpites" 
ON top_finisher_predictions
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar seus próprios palpites" 
ON top_finisher_predictions
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar seus próprios palpites" 
ON top_finisher_predictions
FOR DELETE 
USING (user_id = auth.uid());
