-- ==============================================================================
-- FIX: PERMITIR EXCLUSÃO DE CONTA + TRANSFERÊNCIA DE LIGAS
-- ==============================================================================

-- 1. CONFIGURAR FOREIGN KEYS
-- Ligas: SET NULL (Para não apagar a liga se o admin sair)
-- Outros: CASCADE (Para apagar dados pessoais)

DO $$ BEGIN
    -- Tabela LEAGUES: Permitir admin_id NULL e SET NULL no delete
    BEGIN
        ALTER TABLE leagues ALTER COLUMN admin_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_admin_id_fkey;
    ALTER TABLE leagues ADD CONSTRAINT leagues_admin_id_fkey 
        FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE SET NULL;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Configurar CASCADE para tabelas dependentes (dados do usuário)
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


-- 2. RECRIAR FUNÇÃO RPC PARA EXCLUSÃO DE CONTA COM TRANSFERÊNCIA DE ADMINISTRAÇÃO
-- Tenta passar a administração da liga para o próximo membro mais antigo.

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
    participant_list text[];
    updated_participants text[];
BEGIN
    current_user_id := auth.uid();
    
    -- Configura flag para bypass de triggers de segurança
    PERFORM set_config('app.deleting_user', 'true', true);

    -- LÓGICA DE TRANSFERÊNCIA DE LIGAS
    -- Itera sobre todas as ligas onde o usuário é admin
    FOR league_record IN SELECT id, participants FROM leagues WHERE admin_id = current_user_id LOOP
        
        -- Garante que participants é um array, mesmo que null
        participant_list := COALESCE(league_record.participants, ARRAY[]::text[]);

        -- Remove o usuário atual do array de participantes
        updated_participants := array_remove(participant_list, current_user_id::text);

        IF array_length(updated_participants, 1) > 0 THEN
            -- EXISTEM OUTROS MEMBROS: Transfere a administração
            -- Pega o primeiro membro restante (assumindo ordem de entrada)
            BEGIN
                new_admin_id := updated_participants[1]::uuid;
                
                -- Atualiza a liga com novo admin e remove o antigo dos participantes
                UPDATE leagues 
                SET admin_id = new_admin_id,
                    participants = updated_participants
                WHERE id = league_record.id;
            EXCEPTION WHEN OTHERS THEN
                -- Se falhar conversão de UUID ou outro erro, apenas define admin como NULL
                UPDATE leagues 
                SET admin_id = NULL,
                    participants = updated_participants
                WHERE id = league_record.id;
            END;
        ELSE
            -- LIGA VAZIA: Não há para quem transferir
            -- A liga ficará sem admin (admin_id = NULL) e sem participantes
            UPDATE leagues
            SET admin_id = NULL,
                participants = updated_participants -- Array vazio
            WHERE id = league_record.id;
        END IF;

    END LOOP;

    -- Tentar limpar arquivos do Storage (Avatars)
    BEGIN
        DELETE FROM storage.objects WHERE owner = current_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Deleta o usuário da autenticação
    -- O CASCADE apagará profiles, predictions, etc.
    -- O SET NULL (configurado acima) protegerá as ligas que não foram tratadas no loop (embora o loop deva tratar todas).
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;


-- 3. ATUALIZAR TRIGGERS E FUNÇÕES DE SEGURANÇA (MANTÉM IGUAL)

CREATE OR REPLACE FUNCTION prevent_prediction_tampering()
RETURNS TRIGGER AS $$
DECLARE
    match_start timestamptz;
    deadline timestamptz;
    current_user_id uuid;
    is_account_deletion text;
BEGIN
    -- Permitir bypass se for exclusão de conta
    BEGIN
        is_account_deletion := current_setting('app.deleting_user', true);
    EXCEPTION WHEN OTHERS THEN
        is_account_deletion := 'false';
    END;

    IF (is_account_deletion = 'true') THEN
        IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    current_user_id := auth.uid();

    -- ... Validações normais ...
    
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

-- Trigger Admin
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
