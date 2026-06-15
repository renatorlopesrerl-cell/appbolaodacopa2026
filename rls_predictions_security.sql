-- Ativação do RLS (Row Level Security) nas tabelas, caso não estejam ativadas
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brazil_predictions ENABLE ROW LEVEL SECURITY;

-- 1. Cria a função STABLE para otimizar a checagem de tempo
CREATE OR REPLACE FUNCTION is_match_locked(p_match_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM matches 
    WHERE id = p_match_id 
    AND date - interval '5 minutes' < now()
  );
$$;

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
  is_match_locked(match_id)
);

-- Cria a mesma política para a tabela MODO BRASIL
CREATE POLICY "Ver apenas seus próprios palpites ou todos se o jogo estiver trancado (BR)" 
ON brazil_predictions
FOR SELECT 
USING (
  user_id = auth.uid() 
  OR 
  is_match_locked(match_id)
);
