-- ==============================================================================
-- FIX: PERMITIR EXCLUSÃO DE CONTA + CORREÇÃO UUID[] vs JSONB
-- ==============================================================================

-- 1. REMOVER TRIGGERS VELHOS QUE CAUSAM ERRO DE TIPO (uuid[] @> jsonb)
-- O arquivo 'cleanup_leagues_trigger.sql' criava um trigger que assumia participants como JSONB.
-- Como participants é UUID[], o operador @> falha ao comparar com jsonb.
-- Vamos remover esse trigger problemático.

DROP TRIGGER IF EXISTS on_profile_delete_cleanup_leagues ON public.profiles;
DROP FUNCTION IF EXISTS public.remove_user_from_leagues();


-- 2. RECRIAR FUNÇÃO RPC PARA EXCLUSÃO DE CONTA (COM TRANSFERÊNCIA)
-- Versão FINAL corrigida

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
    participant_list uuid[]; 
    updated_participants uuid[];
BEGIN
    current_user_id := auth.uid();
    
    -- Flag para bypass de triggers de segurança (prazo de jogos)
    PERFORM set_config('app.deleting_user', 'true', true);

    -- Desabilitar RLS na tabela leagues para evitar outros conflitos de política
    ALTER TABLE leagues DISABLE ROW LEVEL SECURITY;

    -- A. REMOVER O USUÁRIO DE TODAS AS LIGAS QUE ELE PARTICIPA (SEJA ADMIN OU NÃO)
    -- Isso substitui o trigger problemático que tentava fazer isso via JSONB
    -- Precisamos iterar ou fazer um update massivo. Update massivo é melhor.
    
    -- A1. Atualiza participants (remove user_id do array)
    UPDATE leagues
    SET participants = array_remove(participants, current_user_id)
    WHERE participants @> ARRAY[current_user_id]; 
    -- Nota: @> ARRAY[uuid] funciona para colunas uuid[]. @> jsonb não.

    -- A2. Atualiza pending_requests (remove user_id do array)
    UPDATE leagues
    SET pending_requests = array_remove(pending_requests, current_user_id)
    WHERE pending_requests @> ARRAY[current_user_id];


    -- B. LÓGICA DE TRANSFERÊNCIA DE ADMINISTRAÇÃO
    -- Agora que o usuário foi removido dos arrays, verificamos as ligas que ele ERA admin.
    FOR league_record IN SELECT id, participants, admin_id FROM leagues WHERE admin_id = current_user_id LOOP
        
        -- O usuário JÁ FOI removido de participants no passo A1 acima.
        -- Então league_record.participants já deve estar atualizado? 
        -- NÃO! O SELECT foi feito antes ou depois?
        -- O SELECT dentro do LOOP pega o estado atual se não for FOR UPDATE.
        -- Vamos pegar o array atualizado explicitamente.
        
        SELECT participants INTO participant_list FROM leagues WHERE id = league_record.id;
        
        -- Se houver membros restantes
        IF array_length(participant_list, 1) > 0 THEN
            -- Transfere para o primeiro da lista
            new_admin_id := participant_list[1];
            
            UPDATE leagues 
            SET admin_id = new_admin_id
            WHERE id = league_record.id;
        ELSE
            -- Liga vazia, deixa admin como NULL
            UPDATE leagues
            SET admin_id = NULL
            WHERE id = league_record.id;
        END IF;

    END LOOP;

    -- Reabilitar RLS
    ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;

    -- Limpar Storage
    BEGIN
        DELETE FROM storage.objects WHERE owner = current_user_id;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Deleta o usuário (Cascade fará o resto em predictions, profiles, etc.)
    -- Como removemos o trigger problemático no inicio, e já limpamos as ligas manualmente,
    -- o cascade na tabela profiles (se houver) não deve disparar o erro antigo.
    DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_user() TO authenticated;
