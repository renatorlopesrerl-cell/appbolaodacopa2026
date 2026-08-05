// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const API_FOOTBALL_KEY = Deno.env.get("API_FOOTBALL_KEY") || "";
const SECRET = Deno.env.get("CRON_SECRET") || "";

// 71 = Brasileirão, 73 = Copa do Brasil, 13 = Libertadores, 11 = Sul-Americana
const LIGAS = "71-73-13-11"; 

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const LEAGUE_ID_TO_CHAMPIONSHIP: Record<number, string> = {
  71: 'brasileirao',
  73: 'copa_do_brasil',
  13: 'libertadores',
  11: 'sul_americana'
};

async function sendPushToMatchParticipants(
  supabase: any,
  championship: string,
  title: string,
  body: string
) {
  try {
    // 1. Buscar ligas que participam desse campeonato
    const { data: leagues, error: leaguesError } = await supabase
      .from('brasileirao_leagues')
      .select('participants, settings');

    if (leaguesError) {
      console.error("Erro ao buscar ligas para notificação:", leaguesError);
      return;
    }

    if (!leagues || leagues.length === 0) return;

    // 2. Filtrar ligas sem restrição OU ligas que têm o campeonato
    const eligibleLeagues = leagues.filter((l: any) => {
      const comps = l.settings?.competitions;
      return !comps || comps.includes(championship);
    });

    // 3. Coletar user_ids únicos dos participants
    const userIds = [...new Set(
      eligibleLeagues.flatMap((l: any) => l.participants ?? [])
    )];

    if (userIds.length === 0) {
      console.log(`Nenhum participante elegível para o campeonato: ${championship}`);
      return;
    }

    console.log(`Enviando push para ${userIds.length} usuários (Campeonato: ${championship})`);

    // 4. Enviar push por userId (a push-notification já resolve tokens localmente e legacy)
    const { error } = await supabase.functions.invoke('push-notification', {
      body: { action: 'send', userIds, title, body, data: { url: '/leagues-brasileirao' } }
    });

    if (error) {
      console.error(`Erro ao disparar push para participantes:`, error);
    }
  } catch (err) {
    console.error(`Exceção ao disparar push:`, err);
  }
}

async function sendGoalPushToMatchParticipants(
  supabase: any,
  championship: string,
  title: string,
  body: string
) {
  try {
    const { data: leagues, error: leaguesError } = await supabase
      .from('brasileirao_leagues')
      .select('participants, settings');

    if (leaguesError || !leagues || leagues.length === 0) return;

    const eligibleLeagues = leagues.filter((l: any) => {
      const comps = l.settings?.competitions;
      return !comps || comps.includes(championship);
    });

    const userIds = [...new Set(eligibleLeagues.flatMap((l: any) => l.participants ?? []))];
    if (userIds.length === 0) return;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_pro, notification_settings')
      .in('id', userIds);

    if (profilesError || !profiles) return;

    const eligibleUserIds = profiles
      .filter((p: any) => p.is_pro === true && (p.notification_settings?.matchGoals !== false))
      .map((p: any) => p.id);

    if (eligibleUserIds.length === 0) return;

    console.log(`Enviando push de GOL para ${eligibleUserIds.length} usuários PRO (Campeonato: ${championship})`);

    await supabase.functions.invoke('push-notification', {
      body: { action: 'send', userIds: eligibleUserIds, title, body, data: { url: '/leagues-brasileirao' } }
    });
  } catch (err) {
    console.error(`Exceção ao disparar push de gol:`, err);
  }
}

async function sendStartPushToMatchParticipants(
  supabase: any,
  championship: string,
  title: string,
  body: string
) {
  try {
    const { data: leagues, error: leaguesError } = await supabase
      .from('brasileirao_leagues')
      .select('participants, settings');

    if (leaguesError || !leagues || leagues.length === 0) return;

    const eligibleLeagues = leagues.filter((l: any) => {
      const comps = l.settings?.competitions;
      return !comps || comps.includes(championship);
    });

    const userIds = [...new Set(eligibleLeagues.flatMap((l: any) => l.participants ?? []))];
    if (userIds.length === 0) return;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_pro, notification_settings')
      .in('id', userIds);

    if (profilesError || !profiles) return;

    const eligibleUserIds = profiles
      .filter((p: any) => p.is_pro === true && (p.notification_settings?.matchStart !== false))
      .map((p: any) => p.id);

    if (eligibleUserIds.length === 0) return;

    console.log(`Enviando push de INICIO DE JOGO para ${eligibleUserIds.length} usuários PRO (Campeonato: ${championship})`);

    await supabase.functions.invoke('push-notification', {
      body: { action: 'send', userIds: eligibleUserIds, title, body, data: { url: '/leagues-brasileirao' } }
    });
  } catch (err) {
    console.error(`Exceção ao disparar push de inicio de jogo:`, err);
  }
}

async function processMatches(supabase: any) {
  const agora = new Date();
  
  // 1A. LEMBRETE PUSH (Stateless time-window 34~35 min)
  const minReminderTime = new Date(agora.getTime() + 34 * 60000).toISOString();
  const maxReminderTime = new Date(agora.getTime() + 35 * 60000).toISOString();

  const { data: teamsData } = await supabase.from('brasileirao_teams').select('id, name, short_name');

  const { data: reminderMatches } = await supabase
    .from("brasileirao_matches")
    .select("id, home_team_id, away_team_id, status, championship")
    .gt("date", minReminderTime)
    .lte("date", maxReminderTime)
    .eq("status", "SCHEDULED")
    .not("phase", "in", '("19ª Rodada","Rodada 19","16-avos de final","16-avos de Final","Round of 32")');

  if (reminderMatches && reminderMatches.length > 0) {
    console.log(`Encontrados ${reminderMatches.length} jogos para lembrete de push (35 min).`);
    
    for (const m of reminderMatches) {
      const homeTeam = teamsData?.find((t: any) => t.id === Number(m.home_team_id));
      const awayTeam = teamsData?.find((t: any) => t.id === Number(m.away_team_id));
      const homeName = homeTeam?.name || homeTeam?.short_name || "Mandante";
      const awayName = awayTeam?.name || awayTeam?.short_name || "Visitante";
      const title = `Lembrete de Palpite! ⏰`;
      const body = `Falta pouco para o inicio do jogo entre ${homeName} x ${awayName}! Revise ou faça seu palpite! Confira também as escalações.`;
      const championship = m.championship || 'brasileirao';
      await sendPushToMatchParticipants(supabase, championship, title, body);
    }
  }

  // 1B. BUSCA DE ESCALAÇÃO (Provisória aos 40 min, Confirmada aos 10 min)
  const maxLineupTime = new Date(agora.getTime() + 40 * 60000).toISOString();
  const finalLineupTime = new Date(agora.getTime() + 10 * 60000).toISOString();
  
  // Buscar jogos para a primeira tentativa (40 min)
  const { data: earlyMatches } = await supabase
    .from("brasileirao_matches")
    .select("id")
    .lte("date", maxLineupTime)
    .eq("status", "SCHEDULED")
    .eq("lineup_fetched", false);

  // Buscar jogos para a confirmação final (10 min) - pegar machucados no aquecimento
  const { data: lateMatches } = await supabase
    .from("brasileirao_matches")
    .select("id")
    .lte("date", finalLineupTime)
    .eq("status", "SCHEDULED")
    .eq("lineup_confirmed", false)
    .eq("lineup_fetched", true);

  const lineupMatchesToFetch = [...(earlyMatches || []), ...(lateMatches || [])];
  
  // Remover duplicatas caso aconteça
  const uniqueLineupIds = Array.from(new Set(lineupMatchesToFetch.map(m => m.id)));

  if (uniqueLineupIds.length > 0) {
    console.log(`Buscando escalação para ${uniqueLineupIds.length} jogos (40m ou 10m).`);
    
    for (const matchId of uniqueLineupIds) {
      try {
        const lineupsRes = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${matchId}`, {
          headers: { "x-apisports-key": API_FOOTBALL_KEY },
        });
        if (lineupsRes.ok) {
           const lineupsData = await lineupsRes.json();
           const lineups = lineupsData.response;
           
           if (lineups && lineups.length > 0) {
               // Verifica se este jogo já estava no "lateMatches" (precisa confirmar)
               const isLate = lateMatches?.some(m => m.id === matchId);
               
               const updatePayload: any = { lineups, lineup_fetched: true };
               if (isLate) {
                 updatePayload.lineup_confirmed = true;
               }

               await supabase
                 .from("brasileirao_matches")
                 .update(updatePayload)
                 .eq("id", matchId);
               console.log(`Escalação ${isLate ? 'CONFIRMADA' : 'salva'} para o jogo ${matchId}`);
           } else {
               console.log(`Escalação indisponível para o jogo ${matchId}, tentará novamente.`);
           }
        }
      } catch (e) {
        console.error(`Erro ao buscar lineup para ${matchId}:`, e);
      }
    }
  }


  // 2. BUSCA DA API-FOOTBALL (Jogos Ativos)
  const limiteSuperior = new Date(agora.getTime() + 2 * 60000).toISOString(); // 2 minutos antes
  const limiteInferior = new Date(agora.getTime() - 4 * 60 * 60000).toISOString(); // 4 horas de tolerância
  
  const { data: jogosAtivos, error: dbError } = await supabase
    .from("brasileirao_matches")
    .select("id, status, home_team_id, away_team_id, phase, championship, events, statistics, home_score, away_score")
    .lte("date", limiteSuperior)
    .gte("date", limiteInferior)
    .neq("status", "FINISHED");

  if (dbError) {
    console.error("Erro ao buscar jogos no banco:", dbError);
    return;
  }

  if (!jogosAtivos || jogosAtivos.length === 0) {
    console.log("Nenhum jogo ativo no momento.");
    return;
  }

  const activeIds = jogosAtivos.map(j => j.id).slice(0, 20); // API-Football aceita no máximo 20 IDs juntos por req
  const idsString = activeIds.join('-');

  console.log(`Encontrados ${jogosAtivos.length} jogos que devem estar rolando. Iniciando busca de 15 em 15s para os IDs: ${idsString}`);
  
  for (let iteracao = 1; iteracao <= 4; iteracao++) {
    console.log(`Buscando placares da API (iteração ${iteracao}/4)...`);
    
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?ids=${idsString}`, {
      headers: {
        "x-apisports-key": API_FOOTBALL_KEY,
      },
    });

    if (response.ok) {
      const dados = await response.json();
      const jogosAPI = dados.response || [];

      for (const jogoAPI of jogosAPI) {
        const matchId = jogoAPI.fixture.id;
        const statusShort = jogoAPI.fixture.status.short; 
        
        let novoStatus = "IN_PROGRESS";
        if (["FT", "AET", "PEN", "CANC", "PSTP", "ABD", "AWD", "WO"].includes(statusShort)) {
          novoStatus = "FINISHED";
        } else if (["NS", "TBD"].includes(statusShort)) {
          novoStatus = "SCHEDULED";
        }

        let matchTimeStr = null;
        if (["1H", "2H", "ET"].includes(statusShort)) {
          const tempo = statusShort === "1H" ? "1º T" : statusShort === "2H" ? "2º T" : "Prorrog.";
          matchTimeStr = `${tempo} - ${jogoAPI.fixture.status.elapsed}'`;
        } else if (statusShort === "HT") {
          matchTimeStr = "Intervalo";
        } else if (statusShort === "P") {
          matchTimeStr = "Pênaltis";
        } else if (statusShort === "LIVE") {
          matchTimeStr = `${jogoAPI.fixture.status.elapsed}'`;
        }

        const matchDb = jogosAtivos.find(j => j.id === matchId);
        
        // Se a partida acabou AGORA, disparamos a notificação de fim de jogo.
        if (matchDb && matchDb.status !== "FINISHED" && novoStatus === "FINISHED") {
           const excludedPhases = ["19ª Rodada", "Rodada 19", "16-avos de final", "16-avos de Final", "Round of 32"];
           const isExcluded = matchDb.phase && excludedPhases.includes(matchDb.phase);
           
           if (!isExcluded) {
             const homeTeam = teamsData?.find(t => t.id === Number(matchDb.home_team_id));
             const awayTeam = teamsData?.find(t => t.id === Number(matchDb.away_team_id));
             const homeName = homeTeam?.name || homeTeam?.short_name || jogoAPI.teams.home.name;
             const awayName = awayTeam?.name || awayTeam?.short_name || jogoAPI.teams.away.name;
             const homeScore = jogoAPI.goals.home ?? 0;
             const awayScore = jogoAPI.goals.away ?? 0;
             
             const title = `🏁 Fim de Jogo!`;
             const body = `${homeName} (${homeScore}) x (${awayScore}) ${awayName}. Acesse a liga para conferir os pontos!`;
             
             const leagueId = jogoAPI.league?.id;
             const championship = matchDb.championship || LEAGUE_ID_TO_CHAMPIONSHIP[leagueId] || 'brasileirao';
             await sendPushToMatchParticipants(supabase, championship, title, body);
           }
           
        // Atualizamos localmente para evitar duplo push no loop
           matchDb.status = "FINISHED";
        }

        // Se a partida começou AGORA, disparamos a notificação de INICIO DE JOGO (Exclusivo PRO)
        if (matchDb && matchDb.status === "SCHEDULED" && novoStatus === "IN_PROGRESS") {
           const excludedPhases = ["19ª Rodada", "Rodada 19", "16-avos de final", "16-avos de Final", "Round of 32"];
           const isExcluded = matchDb.phase && excludedPhases.includes(matchDb.phase);
           
           if (!isExcluded) {
             const homeTeam = teamsData?.find((t: any) => t.id === Number(matchDb.home_team_id));
             const awayTeam = teamsData?.find((t: any) => t.id === Number(matchDb.away_team_id));
             const homeName = homeTeam?.name || homeTeam?.short_name || jogoAPI.teams.home.name;
             const awayName = awayTeam?.name || awayTeam?.short_name || jogoAPI.teams.away.name;
             
             const title = `▶️ Bola rolando!`;
             const body = `O jogo entre ${homeName} e ${awayName} acabou de começar. Acompanhe!`;
             
             const leagueId = jogoAPI.league?.id;
             const championship = matchDb.championship || LEAGUE_ID_TO_CHAMPIONSHIP[leagueId] || 'brasileirao';
             await sendStartPushToMatchParticipants(supabase, championship, title, body);
           }
           
           matchDb.status = "IN_PROGRESS";
        }

        let currentEvents = matchDb.events;
        let currentStats = matchDb.statistics;

        const oldHomeScore = matchDb.home_score ?? 0;
        const oldAwayScore = matchDb.away_score ?? 0;
        const newHomeScore = jogoAPI.goals.home ?? 0;
        const newAwayScore = jogoAPI.goals.away ?? 0;
        const scoreChanged = (newHomeScore !== oldHomeScore) || (newAwayScore !== oldAwayScore);

        if (scoreChanged) {
            console.log(`[match: ${matchId}] Placar mudou (${oldHomeScore}x${oldAwayScore} -> ${newHomeScore}x${newAwayScore}). Enviando push imediatamente.`);
        }

        if (iteracao === 1 || scoreChanged) {
          try {
            // Busca eventos a cada 1 minuto (ou imediatamente após delay se houver gol)
            const eventsRes = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${matchId}`, {
              headers: { "x-apisports-key": API_FOOTBALL_KEY }
            });
            if (eventsRes.ok) {
               const eventsData = await eventsRes.json();
               currentEvents = eventsData.response;
               matchDb.events = currentEvents;
            }

            // Busca estatísticas a cada 2 minutos (minuto par) apenas se iteracao 1
            if (iteracao === 1 && new Date().getMinutes() % 2 === 0) {
              const statsRes = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`, {
                headers: { "x-apisports-key": API_FOOTBALL_KEY }
              });
              if (statsRes.ok) {
                 const statsData = await statsRes.json();
                 currentStats = statsData.response;
                 matchDb.statistics = currentStats;
              }
            }
          } catch (e) {
            console.error(`Erro ao buscar stats/events para ${matchId}:`, e);
          }
        }

        if (scoreChanged) {
           matchDb.home_score = newHomeScore;
           matchDb.away_score = newAwayScore;

           const homeTeamName = teamsData?.find((t: any) => t.id === Number(matchDb.home_team_id))?.name || jogoAPI.teams.home.name;
           const awayTeamName = teamsData?.find((t: any) => t.id === Number(matchDb.away_team_id))?.name || jogoAPI.teams.away.name;
           const scoreText = `${String(homeTeamName).toUpperCase()} ${newHomeScore} x ${newAwayScore} ${String(awayTeamName).toUpperCase()}`;

           let eventTitle = "⚽ GOL NA PARTIDA!";
           let eventBody = `${scoreText}\nAbra o app e confira as pontuações!`;
           
           if (newHomeScore < oldHomeScore || newAwayScore < oldAwayScore) {
               eventTitle = `❌ GOL ANULADO!`;
           } else if (newHomeScore > oldHomeScore) {
               eventTitle = `⚽ GOL DO ${String(homeTeamName).toUpperCase()}!`;
           } else if (newAwayScore > oldAwayScore) {
               eventTitle = `⚽ GOL DO ${String(awayTeamName).toUpperCase()}!`;
           }
           
           const leagueId = jogoAPI.league?.id;
           const championship = matchDb.championship || LEAGUE_ID_TO_CHAMPIONSHIP[leagueId] || 'brasileirao';
           await sendGoalPushToMatchParticipants(supabase, championship, eventTitle, eventBody);
        }

        await supabase
          .from("brasileirao_matches")
          .update({
            home_score: newHomeScore,
            away_score: newAwayScore,
            status: novoStatus,
            match_time: matchTimeStr,
            events: currentEvents,
            statistics: currentStats
          })
          .eq("id", matchId);
      }
    } else {
      console.error("Erro na API-Football:", response.status, await response.text());
    }

    if (iteracao < 4) {
      await sleep(14000); 
    }
  }
}

serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization");
    if (authHeader !== `Bearer ${SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Run processing in background to avoid cron job timeout
    const bgPromise = processMatches(supabase).catch(err => {
      console.error("Background processing error:", err);
    });

    if (typeof EdgeRuntime !== 'undefined' && typeof EdgeRuntime.waitUntil === 'function') {
      EdgeRuntime.waitUntil(bgPromise);
    }

    return new Response(JSON.stringify({ success: true, message: "Job started in background." }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Erro interno:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
