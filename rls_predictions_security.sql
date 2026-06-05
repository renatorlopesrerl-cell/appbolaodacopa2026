-- Ativação do RLS (Row Level Security) nas tabelas, caso não estejam ativadas
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brazil_predictions ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas de SELECT se existirem (para não dar conflito)
DROP POLICY IF EXISTS "Ver apenas seus próprios palpites ou todos se o jogo estiver trancado" ON predictions;
DROP POLICY IF EXISTS "Ver apenas seus próprios palpites ou todos se o jogo estiver trancado (BR)" ON brazil_predictions;

-- Cria a política para a tabela NORMAL
-- O usuário pode baixar o palpite se: FOR DELE MESMO - OU - SE O JOGO JÁ PASSOU DOS 5 MINUTOS DE TRAVA
CREATE POLICY "Ver apenas seus próprios palpites ou todos se o jogo estiver trancado" 
ON predictions
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM matches 
    WHERE matches.id = predictions.match_id 
    AND matches.date - interval '5 minutes' < now()
  )
);

-- Cria a mesma política para a tabela MODO BRASIL
CREATE POLICY "Ver apenas seus próprios palpites ou todos se o jogo estiver trancado (BR)" 
ON brazil_predictions
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM matches 
    WHERE matches.id = brazil_predictions.match_id 
    AND matches.date - interval '5 minutes' < now()
  )
);
