-- ==============================================================================
-- FIX: PERMITIR EXCLUSÃO DE CONTA (CASCADE E TRIGGERS)
-- ==============================================================================

-- 1. CONFIGURAR FOREIGN KEYS COM CASCADE
-- Isso garante que quando o usuário for deletado de auth.users, todos os dados sumam.

-- Tabela LEAGUES (Admin da liga) -> Se admin deleta conta, liga é deletada? 
-- Regra de negócio: Sim, ou transfere. Aqui vamos assumir CASCADE (apaga liga e participantes).
DO $$ BEGIN
    ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_admin_id_fkey;
    ALTER TABLE leagues ADD CONSTRAINT leagues_admin_id_fkey 
        FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Tabela PREDICTIONS (Palpites)
DO $$ BEGIN
    ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_fkey;
    ALTER TABLE predictions ADD CONSTRAINT predictions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Tabela PREDICTIONS (Referencias a ligas e matches também devem ser cascade se não forem)
DO $$ BEGIN
    ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_league_id_fkey;
    ALTER TABLE predictions ADD CONSTRAINT predictions_league_id_fkey 
        FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Tabela PROFILES (Perfil do usuário)
DO $$ BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Tabela USER_SIMULATIONS
DO $$ BEGIN
    ALTER TABLE user_simulations DROP CONSTRAINT IF EXISTS user_simulations_user_id_fkey;
    ALTER TABLE user_simulations ADD CONSTRAINT user_simulations_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;


-- 2. ATUALIZAR FUNÇÃO DE EXCLUSÃO (RPC)
-- Adiciona uma "flag" de sessão para avisar os triggers que é uma exclusão de conta legítima
CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Seta variavel de sessão para ignorar bloqueios de triggers (ex: 5 min match lock)
  PERFORM set_config('app.deleting_user', 'true', true);

  -- Deleta o usuário. O CASCADE fará o resto.
  DELETE FROM auth.users
  WHERE id = auth.uid();
END;
$$;
GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;


-- 3. ATUALIZAR TRIGGER DE PROTEÇÃO DE PALPITES
-- Modifica para checar a flag 'app.deleting_user'
CREATE OR REPLACE FUNCTION prevent_prediction_tampering()
RETURNS TRIGGER AS $$
DECLARE
    match_start timestamptz;
    deadline timestamptz;
    current_user_id uuid;
    is_account_deletion text;
BEGIN
    -- CHECK DE BYPASS PARA EXCLUSÃO DE CONTA
    is_account_deletion := current_setting('app.deleting_user', true);
    IF (is_account_deletion = 'true') THEN
        RETURN NEW; -- Permite excluir tudo sem verificar data do jogo
    END IF;

    current_user_id := auth.uid();

    -- REGRA 0: BLOQUEIO ABSOLUTO DE EDIÇÃO MANUAL DE PONTOS
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.points IS DISTINCT FROM OLD.points) THEN
            IF (pg_trigger_depth() <= 1) THEN
                RAISE EXCEPTION 'SYSTEM_ONLY: A pontuação não pode ser alterada manualmente.';
            END IF;
        END IF;
    END IF;

    -- Obtém data do jogo
    SELECT date INTO match_start FROM matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
    
    IF match_start IS NULL THEN
        RETURN NEW;
    END IF;

    deadline := match_start - interval '5 minutes';

    -- REGRA 1: BLOQUEIO DE ALTERAÇÃO DE PLACAR POR TERCEIROS
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
            IF (current_user_id IS DISTINCT FROM OLD.user_id) THEN
                RAISE EXCEPTION 'SECURITY_VIOLATION: Apenas o usuário que criou o palpite pode alterar o placar.';
            END IF;
        END IF;
    END IF;

    -- REGRA 2: BLOQUEIO POR TEMPO (5 min antes do jogo)
    IF (NOW() >= deadline) THEN
        IF (pg_trigger_depth() <= 1) THEN 
            IF (TG_OP = 'DELETE' OR TG_OP = 'INSERT') THEN
                RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados (5 min antes do jogo).';
            END IF;

            IF (TG_OP = 'UPDATE') THEN
                IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
                    RAISE EXCEPTION 'TIME_LOCKED: Palpites encerrados.';
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. ATUALIZAR TRIGGER DE PROTEÇÃO ADMIN (Admin Lockdown)
-- Também precisa respeitar a flag de account deletion, caso o trigger fire no DELETE cascata
CREATE OR REPLACE FUNCTION prevent_manual_admin_edits()
RETURNS TRIGGER AS $$
DECLARE
    is_account_deletion text;
BEGIN
    -- Permitir bypass se for exclusão de conta
    is_account_deletion := current_setting('app.deleting_user', true);
    IF (is_account_deletion = 'true') THEN
        RETURN NEW;
    END IF;

    -- Permite atualizações automáticas via outros triggers
    IF (pg_trigger_depth() > 1) THEN
        RETURN NEW;
    END IF;

    -- Se auth.uid() for NULL (admin panel), bloqueia.
    -- Se for exclusão real pelo app, auth.uid() existe.
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: Edição manual não permitida. Use o App.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
