-- ==============================================================================
-- FIX: EXCLUSÃO DE CONTA COM SUPORTE AO MODO BRASIL
-- Corrige dois problemas:
-- 1. brazil_leagues.participants é text[], não uuid[] — array_remove precisa do cast correto
-- 2. DELETE FROM storage.objects é bloqueado pelo Supabase; removido do fluxo
-- ==============================================================================

CREATE OR REPLACE FUNCTION delete_own_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    current_user_id_text text;
    league_record RECORD;
    new_admin_id uuid;
    participant_list uuid[];
BEGIN
    current_user_id := auth.uid();
    current_user_id_text := auth.uid()::text;

    -- Flag para bypass de triggers de segurança (prazo de jogos)
    PERFORM set_config('app.deleting_user', 'true', true);

    -- =========================================================================
    -- A. LIGAS PADRÃO (tabela: leagues)
    -- participants é uuid[], então array_remove funciona diretamente
    -- =========================================================================
    ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;

    -- Remover usuário dos arrays de participants e pending_requests
    UPDATE leagues
    SET participants = array_remove(participants, current_user_id)
    WHERE participants @> ARRAY[current_user_id];

    UPDATE leagues
    SET pending_requests = array_remove(pending_requests, current_user_id)
    WHERE pending_requests @> ARRAY[current_user_id];

    -- Transferir administração das ligas padrão que o usuário é admin
    FOR league_record IN
        SELECT id FROM leagues WHERE admin_id = current_user_id
    LOOP
        SELECT participants INTO participant_list FROM leagues WHERE id = league_record.id;

        IF array_length(participant_list, 1) > 0 THEN
            UPDATE leagues SET admin_id = participant_list[1] WHERE id = league_record.id;
        ELSE
            UPDATE leagues SET admin_id = NULL WHERE id = league_record.id;
        END IF;
    END LOOP;

    ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

    -- =========================================================================
    -- B. LIGAS BRASIL (tabela: brazil_leagues)
    -- participants é text[], então precisamos comparar com text
    -- =========================================================================
    ALTER TABLE brazil_leagues DISABLE ROW LEVEL SECURITY;

    -- Remover usuário dos arrays de participants e pending_requests (text[])
    UPDATE brazil_leagues
    SET participants = array_remove(participants, current_user_id_text)
    WHERE participants @> ARRAY[current_user_id_text];

    UPDATE brazil_leagues
    SET pending_requests = array_remove(pending_requests, current_user_id_text)
    WHERE pending_requests @> ARRAY[current_user_id_text];

    -- Transferir administração das ligas Brasil que o usuário é admin
    FOR league_record IN
        SELECT id FROM brazil_leagues WHERE admin_id = current_user_id
    LOOP
        DECLARE
            participant_text_list text[];
            new_admin_text text;
        BEGIN
            SELECT participants INTO participant_text_list FROM brazil_leagues WHERE id = league_record.id;

            IF array_length(participant_text_list, 1) > 0 THEN
                new_admin_text := participant_text_list[1];
                UPDATE brazil_leagues SET admin_id = new_admin_text::uuid WHERE id = league_record.id;
            ELSE
                UPDATE brazil_leagues SET admin_id = NULL WHERE id = league_record.id;
            END IF;
        END;
    END LOOP;

    ALTER TABLE brazil_leagues ENABLE ROW LEVEL SECURITY;

    -- =========================================================================
    -- C. EXCLUIR O USUÁRIO
    -- ON DELETE CASCADE cuida de:
    --   profiles, predictions, brazil_predictions, user_fcm_tokens, etc.
    -- NÃO tentamos deletar storage.objects via SQL — o Supabase bloqueia isso.
    -- Os avatars do storage ficam como orphans mas não causam erro.
    -- =========================================================================
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;
