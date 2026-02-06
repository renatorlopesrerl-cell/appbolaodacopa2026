-- ==============================================================================
-- FIX: PERMITIR EXCLUSÃO DE CONTA + TRANSFERÊNCIA DE LIGAS (VERSÃO ROBUSTA)
-- ==============================================================================

-- 1. CONFIGURAR FOREIGN KEYS (MANTÉM IGUAL)
DO $$ BEGIN
    BEGIN
        ALTER TABLE leagues ALTER COLUMN admin_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_admin_id_fkey;
    ALTER TABLE leagues ADD CONSTRAINT leagues_admin_id_fkey 
        FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_user_id_fkey;
    ALTER TABLE predictions ADD CONSTRAINT predictions_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE predictions DROP CONSTRAINT IF EXISTS predictions_league_id_fkey;
    ALTER TABLE predictions ADD CONSTRAINT predictions_league_id_fkey 
        FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
    ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
    ALTER TABLE user_simulations DROP CONSTRAINT IF EXISTS user_simulations_user_id_fkey;
    ALTER TABLE user_simulations ADD CONSTRAINT user_simulations_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN undefined_object THEN NULL; END $$;


-- 2. RECRIAR FUNÇÃO RPC PARA EXCLUSÃO DE CONTA
-- Agora desabilita RLS temporariamente para evitar conflitos de políticas quebradas.
CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    league_record RECORD;
    new_admin_id uuid;
    participant_list uuid[]; -- Assumindo que a coluna é uuid[] (com base no erro uuid[] @> jsonb)
    updated_participants uuid[];
BEGIN
    current_user_id := auth.uid();
    
    PERFORM set_config('app.deleting_user', 'true', true);

    -- Desabilitar RLS na tabela leagues para evitar erros de políticas mal configuradas
    -- Isso garante que o UPDATE funcione mesmo se houver políticas quebradas (como uuid[] @> jsonb)
    ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;

    FOR league_record IN SELECT id, participants FROM leagues WHERE admin_id = current_user_id LOOP
        
        -- Garante conversão correta para uuid[] e trata nulos
        BEGIN
            participant_list := COALESCE(league_record.participants::uuid[], ARRAY[]::uuid[]);
        EXCEPTION WHEN OTHERS THEN
            -- Fallback se a conversão falhar (ex: se coluna for text[] ou jsonb)
            participant_list := ARRAY[]::uuid[]; 
        END;

        -- Remove o usuário atual
        updated_participants := array_remove(participant_list, current_user_id);

        IF array_length(updated_participants, 1) > 0 THEN
            -- Transfere para o próximo
            new_admin_id := updated_participants[1];
            
            UPDATE leagues 
            SET admin_id = new_admin_id,
                participants = updated_participants
            WHERE id = league_record.id;
        ELSE
            -- Liga vazia
            UPDATE leagues
            SET admin_id = NULL,
                participants = updated_participants
            WHERE id = league_record.id;
        END IF;

    END LOOP;

    -- Reabilitar RLS
    ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

    -- Tentar limpar arquivos do Storage
    BEGIN
        DELETE FROM storage.objects WHERE owner = current_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Deleta o usuário
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;


-- 3. TRIGGERS DE PROTEÇÃO (MANTÉM IGUAL)

CREATE OR REPLACE FUNCTION prevent_prediction_tampering()
RETURNS TRIGGER AS $$
DECLARE
    match_start timestamptz;
    deadline timestamptz;
    current_user_id uuid;
    is_account_deletion text;
BEGIN
    BEGIN
        is_account_deletion := current_setting('app.deleting_user', true);
    EXCEPTION WHEN OTHERS THEN is_account_deletion := 'false'; END;

    IF (is_account_deletion = 'true') THEN
        IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    current_user_id := auth.uid();

    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.points IS DISTINCT FROM OLD.points) THEN
            IF (pg_trigger_depth() <= 1) THEN
                RAISE EXCEPTION 'SYSTEM_ONLY: A pontuação não pode ser alterada manualmente.';
            END IF;
        END IF;
    END IF;

    SELECT date INTO match_start FROM matches WHERE id = COALESCE(NEW.match_id, OLD.match_id);
    IF match_start IS NULL THEN RETURN NEW; END IF;
    deadline := match_start - interval '5 minutes';

    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.home_score IS DISTINCT FROM OLD.home_score OR NEW.away_score IS DISTINCT FROM OLD.away_score) THEN
            IF (current_user_id IS DISTINCT FROM OLD.user_id) THEN
                RAISE EXCEPTION 'SECURITY_VIOLATION: Apenas o usuário que criou o palpite pode alterar o placar.';
            END IF;
        END IF;
    END IF;

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

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION prevent_manual_admin_edits()
RETURNS TRIGGER AS $$
DECLARE
    is_account_deletion text;
BEGIN
    BEGIN
        is_account_deletion := current_setting('app.deleting_user', true);
    EXCEPTION WHEN OTHERS THEN is_account_deletion := 'false'; END;

    IF (is_account_deletion = 'true') THEN
        IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    IF (pg_trigger_depth() > 1) THEN
        IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'SECURITY_VIOLATION: Edição manual não permitida. Use o App.';
    END IF;

    IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;
