// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY") || "";
const SECRET = Deno.env.get("CRON_SECRET") || "";

const LIGAS = [71, 73, 13, 11]; // Brasileirão, Copa do Brasil, Libertadores, Sul-Americana
const SEASON = "2026"; // Ano atual

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    let isAuthorized = false;

    // Check if it's the cron secret
    if (authHeader === `Bearer ${SECRET}`) {
      isAuthorized = true;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If not cron, check if it's a valid logged-in user calling from frontend
    if (!isAuthorized && authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (user && !error) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    console.log("Iniciando sincronização diária de calendário...");
    
    let specificLeagueId = null;
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body.league_id) {
          specificLeagueId = Number(body.league_id);
        }
      } catch (e) {
        // Body might be empty or invalid JSON, ignore
      }
    }

    let atualizados = 0;
    const ligasParaSincronizar = specificLeagueId ? [specificLeagueId] : LIGAS;

    for (const ligaId of ligasParaSincronizar) {
      console.log(`Buscando calendário da liga ${ligaId} temporada ${SEASON}...`);
      
      const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${ligaId}&season=${SEASON}`, {
        headers: {
          "x-apisports-key": API_FOOTBALL_KEY,
        },
      });

      if (!response.ok) {
        console.error(`Erro ao buscar liga ${ligaId}:`, response.status, await response.text());
        continue;
      }

      const dados = await response.json();
      const jogosAPI = dados.response || [];

      // A API devolve dezenas/centenas de jogos. Vamos atualizar no banco os dados básicos de agendamento
      for (const jogoAPI of jogosAPI) {
        // Atualiza os dados de agendamento
        // Importante: Só vamos atualizar jogos que não estejam finalizados ou vamos atualizar a data de todos?
        // É mais seguro atualizar a data, local e fase de todos, mas não mexer em placares aqui 
        // para não conflitar com a função de placar ao vivo (caso rolem juntas).
        
        const locationStr = jogoAPI.fixture.venue.name 
          ? `${jogoAPI.fixture.venue.name}${jogoAPI.fixture.venue.city ? ' - ' + jogoAPI.fixture.venue.city : ''}`
          : "A definir";

        await supabase
          .from("brasileirao_matches")
          .update({
            date: jogoAPI.fixture.date, // Formato ISO, atualiza o horário
            location: locationStr
          })
          .eq("id", jogoAPI.fixture.id);
          
        atualizados++;
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Calendário sincronizado. Total de jogos processados: ${atualizados}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro interno:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
