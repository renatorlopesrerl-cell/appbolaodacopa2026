import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

const env = dotenv.parse(fs.readFileSync('.dev.vars', 'utf-8'));

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .dev.vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = `
CREATE OR REPLACE FUNCTION public.on_match_status_push()
RETURNS TRIGGER AS $$
BEGIN
  -- Envia push apenas se o status mudar para em andamento ou finalizado
  IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.status IN ('IN_PROGRESS', 'FINISHED')) THEN
    PERFORM public.send_push_webhook('match_update', jsonb_build_object(
      'match_id', NEW.id,
      'home_team_id', NEW.home_team_id,
      'away_team_id', NEW.away_team_id,
      'status', NEW.status,
      'home_score', NEW.home_score,
      'away_score', NEW.away_score,
      'old_status', OLD.status
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`;

  // Note: supabase-js v2 doesn't have a direct raw SQL execution method via API unless there is an RPC.
  // We can just query `on_match_status_push` if there is a way, but standard way is `supabase migration push` or `supabase db push`.
  console.log("We need to run 'npx supabase db push' or execute this manually.");
}

run();
