-- ==============================================================================
-- 3. FUNÇÃO PARA REFRESH INICIAL (Opcional, para preencher a primeira vez)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.refresh_all_leagues_rankings()
RETURNS void AS $$
DECLARE
    l RECORD;
BEGIN
    FOR l IN SELECT id FROM leagues LOOP
        PERFORM public.refresh_league_rankings(l.id);
    END LOOP;
    
    FOR l IN SELECT id FROM brazil_leagues LOOP
        PERFORM public.refresh_brazil_league_rankings(l.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
