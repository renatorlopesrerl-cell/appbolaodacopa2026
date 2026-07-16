// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY") || "";
const SECRET = Deno.env.get("CRON_SECRET") || "";

const COPA_LEAGUE_ID = 73;
const SEASON = "2026";

// Fases excluídas (primeiros turnos com centenas de times pequenos)
const EXCLUDED_ROUNDS = ['1/256-finals', '1/128-finals', 'Round of 128', 'Round of 64'];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mapStatus = (status: string): string => {
  if (['FT', 'AET', 'PEN'].includes(status)) return 'FINISHED';
  if (['NS', 'TBD', 'PST', 'CANC', 'ABD'].includes(status)) return 'SCHEDULED';
  return 'IN_PROGRESS';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;

    if (authHeader === `Bearer ${SECRET}`) {
      isAuthorized = true;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (!isAuthorized && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        // Verify user is admin
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (profile?.is_admin) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`Importando jogos da Copa do Brasil (Liga ${COPA_LEAGUE_ID}, Temporada ${SEASON})...`);

    // 1. Buscar e salvar times
    const teamsRes = await fetch(
      `https://v3.football.api-sports.io/teams?league=${COPA_LEAGUE_ID}&season=${SEASON}`,
      { headers: { 'x-apisports-key': API_FOOTBALL_KEY } }
    );
    const teamsData = await teamsRes.json();
    const teams = (teamsData.response || []).map((t: any) => ({
      id: String(t.team.id),
      name: t.team.name,
      short_name: t.team.code || t.team.name.substring(0, 3).toUpperCase(),
      logo: t.team.logo,
    }));

    if (teams.length > 0) {
      const { error: teamErr } = await supabase.from('brasileirao_teams').upsert(teams);
      if (teamErr) console.error("Erro ao salvar times:", teamErr.message);
      else console.log(`${teams.length} times salvos.`);
    }

    // 2. Buscar jogos
    const fixturesRes = await fetch(
      `https://v3.football.api-sports.io/fixtures?league=${COPA_LEAGUE_ID}&season=${SEASON}`,
      { headers: { 'x-apisports-key': API_FOOTBALL_KEY } }
    );
    const fixturesData = await fixturesRes.json();
    const allFixtures = fixturesData.response || [];

    const validFixtures = allFixtures.filter((f: any) => !EXCLUDED_ROUNDS.includes(f.league.round));

    const now = new Date().toISOString();
    const futureFixtures = validFixtures.filter((f: any) => f.fixture.date > now);

    if (futureFixtures.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Nenhum jogo futuro encontrado na API no momento.',
        total: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Buscar IDs que já existem no banco para não sobrescrever
    const apiIds = futureFixtures.map((f: any) => String(f.fixture.id));
    const { data: existingMatches } = await supabase
      .from('brasileirao_matches')
      .select('id')
      .in('id', apiIds);

    const existingIds = new Set((existingMatches || []).map((m: any) => String(m.id)));

    // Filtrar apenas jogos NOVOS (que não existem no banco)
    const newFixtures = futureFixtures.filter((f: any) => !existingIds.has(String(f.fixture.id)));

    if (newFixtures.length === 0) {
      const newRoundsAll = [...new Set(futureFixtures.map((f: any) => f.league.round))];
      return new Response(JSON.stringify({
        success: true,
        message: `Nenhum jogo novo encontrado. Todos os ${futureFixtures.length} jogos futuros já estão no banco. Fases: ${newRoundsAll.join(', ')}.`,
        total: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const matches = newFixtures.map((f: any) => ({
      id: String(f.fixture.id),
      home_team_id: String(f.teams.home.id),
      away_team_id: String(f.teams.away.id),
      date: f.fixture.date,
      location: f.fixture.venue?.name || 'A definir',
      status: 'SCHEDULED', // Novos jogos futuros sempre começam como Agendado
      home_score: null,
      away_score: null,
      phase: f.league.round,
      championship: 'copa_do_brasil',
    }));

    const newRounds = [...new Set(matches.map((m: any) => m.phase))];
    console.log(`Inserindo ${matches.length} novos jogos. Fases: ${newRounds.join(', ')}`);

    const { error: matchErr } = await supabase.from('brasileirao_matches').insert(matches);

    if (matchErr) {
      console.error("Erro ao salvar jogos:", matchErr.message);
      return new Response(JSON.stringify({ success: false, error: matchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Importação concluída! ${matches.length} jogos salvos em ${newRounds.length} fases: ${newRounds.join(', ')}.`,
      rounds: newRounds,
      total: matches.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Erro interno:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
