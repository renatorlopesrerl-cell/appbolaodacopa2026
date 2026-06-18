-- Remove possíveis duplicatas antes de criar a restrição única
DELETE FROM league_rankings a USING (
    SELECT MIN(id) as id, league_id, user_id
    FROM league_rankings 
    GROUP BY league_id, user_id HAVING COUNT(*) > 1
) b
WHERE a.league_id = b.league_id AND a.user_id = b.user_id AND a.id <> b.id;

DELETE FROM brazil_league_rankings a USING (
    SELECT MIN(id) as id, league_id, user_id
    FROM brazil_league_rankings 
    GROUP BY league_id, user_id HAVING COUNT(*) > 1
) b
WHERE a.league_id = b.league_id AND a.user_id = b.user_id AND a.id <> b.id;

-- Adiciona restrição única para as ligas padrões
ALTER TABLE league_rankings DROP CONSTRAINT IF EXISTS league_rankings_league_user_key;
ALTER TABLE league_rankings ADD CONSTRAINT league_rankings_league_user_key UNIQUE (league_id, user_id);

-- Adiciona restrição única para as ligas do brasil
ALTER TABLE brazil_league_rankings DROP CONSTRAINT IF EXISTS brazil_league_rankings_league_user_key;
ALTER TABLE brazil_league_rankings ADD CONSTRAINT brazil_league_rankings_league_user_key UNIQUE (league_id, user_id);
