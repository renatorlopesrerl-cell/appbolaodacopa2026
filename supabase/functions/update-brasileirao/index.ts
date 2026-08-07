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

/**
 * Envia push para participantes de ligas do campeonato.
 * 
 * notificationType: define qual chave de notification_settings checar.
 *   - 'matchEnd'            → filtrar quem tem matchEnd !== false
 *   - 'predictionReminder'  → filtrar quem tem predictionReminder !== false
 *   - undefined             → envia para todos (sem filtro de preferência)
 */
async function sendPushToMatchParticipants(
  supabase: any,
  championship: string,
  title: string,
  body: string,
  notificationType?: 'matchEnd' | 'predictionReminder'
) {
  try {
    const { data: leagues, error: leaguesError } = await supabase
      .from('brasileirao_leagues')
      .select('participants, settings');

    if (leaguesError) {
      console.error("Erro ao buscar ligas para notificação:", leaguesError);
      return;
    }

    if (!leagues || leagues.length === 0) return;

    // Filtrar ligas que incluem o campeonato
    const eligibleLeagues = leagues.filter((l: any) => {
      const comps = l.settings?.competitions;
      return !comps || comps.includes(championship);
    });

    const allUserIds = [...new Set(
      eligibleLeagues.flatMap((l: any) => l.participants ?? [])
    )];

    if (allUserIds.length === 0) {
      console.log(`Nenhum participante elegível para o campeonato: ${championship}`);
      return;
    }

    // Filtrar por notification_settings se for notificação com preferência
    let targetUserIds = allUserIds;
    if (notificationType) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, notification_settings')
        .in('id', allUserIds);

      if (profilesError || !profiles) {
        console.error(`Erro ao buscar profiles para filtro de notificação (${notificationType}):`, profilesError);
        return;
      }

      targetUserIds = profiles
        .filter((p: any) => p.notification_settings?.[notificationType] !== false)
        .map((p: any) => p.id);

      if (targetUserIds.length === 0) {
        console.log(`Nenhum usuário com notificação '${notificationType}' ativada.`);
        return;
      }
    }

    console.log(`[Push] Enviando '${notificationType || 'all'}' para ${targetUserIds.length} usuários (${championship})`);

    const { error } = await supabase.functions.invoke('push-notification', {
      body: { action: 'send', userIds: targetUserIds, title, body, data: { url: '/leagues-brasileirao' } }
    });

    if (error) {
      console.error(`Erro ao disparar push:`, error);
    }
  } catch (err) {
    console.error(`Exceção ao disparar push:`, err);
  }
}

/**
 * Envia push de GOL (exclusivo para usuários PRO com matchGoals ativo)
 */
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

    const allUserIds = [...new Set(eligibleLeagues.flatMap((l: any) => l.participants ?? []))];
    if (allUserIds.length === 0) return;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_pro, notification_settings')
      .in('id', allUserIds);

    if (profilesError || !profiles) return;

    const eligibleUserIds = profiles
      .filter((p: any) => p.is_pro === true && (p.notification_settings?.matchGoals !== false))
      .map((p: any) => p.id);

    if (eligibleUserIds.length === 0) return;

    console.log(`[Push] Enviando GOL para ${eligibleUserIds.length} usuários PRO (${championship})`);

    await supabase.functions.invoke('push-notification', {
      body: { action: 'send', userIds: eligibleUserIds, title, body, data: { url: '/leagues-brasileirao' } }
    });
  } catch (err) {
    console.error(`Exceção ao disparar push de gol:`, err);
  }
}

/**
 * Envia push de INÍCIO DE JOGO (exclusivo para usuários PRO com matchStart ativo)
 */
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

    const allUserIds = [...new Set(eligibleLeagues.flatMap((l: any) => l.participants ?? []))];
    if (allUserIds.length === 0) return;

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, is_pro, notification_settings')
      .in('id', allUserIds);

    if (profilesError || !profiles) return;

    const eligibleUserIds = profiles
      .filter((p: any) => p.is_pro === true && (p.notification_settings?.matchStart !== false))
      .map((p: any) => p.id);

    if (eligibleUserIds.length === 0) return;

    console.log(`[Push] Enviando INÍCIO DE JOGO para ${eligibleUserIds.length} usuários PRO (${championship})`);

    await supabase.functions.invoke('push-notification', {
      body: { action: 'send', userIds: eligibleUserIds, title, body, data: { url: '/leagues-brasileirao' } }
    });
  } catch (err) {
    console.error(`Exceção ao disparar push de inicio de jogo:`, err);
  }
}

async function processMatches(supabase: any) {
  const agora = new Date();

  // ─────────────────────────────────────────────────────────────
  // 1A. LEMBRETE DE PALPITE (janela 34~35 min antes do jogo)
  // ─────────────────────────────────────────────────────────────
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
    console.log(`Encontrados ${reminderMatches.length} jogos para lembrete de palpite (35 min).`);

    for (const m of reminderMatches) {
      const homeTeam = teamsData?.find((t: any) => t.id === Number(m.home_team_id));
      const awayTeam = teamsData?.find((t: any) => t.id === Number(m.away_team_id));
      const homeName = homeTeam?.name || homeTeam?.short_name || "Mandante";
      const awayName = awayTeam?.name || awayTeam?.short_name || "Visitante";
      const title = `Lembrete de Palpite! ⏰`;
      const body = `Falta pouco para o inicio do jogo entre ${homeName} x ${awayName}! Revise ou faça seu palpite! Confira também as escalações.`;
      const championship = m.championship || 'brasileirao';
      // ✅ FIX: filtra por predictionReminder nas notification_settings
      await sendPushToMatchParticipants(supabase, championship, title, body, 'predictionReminder');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 1B. BUSCA DE ESCALAÇÃO (40 min antes = provisória, 10 min = confirmada)
  // ─────────────────────────────────────────────────────────────
  const maxLineupTime = new Date(agora.getTime() + 40 * 60000).toISOString();
  const finalLineupTime = new Date(agora.getTime() + 10 * 60000).toISOString();

  const { data: earlyMatches } = await supabase
    .from("brasileirao_matches")
    .select("id")
    .lte("date", maxLineupTime)
    .eq("status", "SCHEDULED")
    .eq("lineup_fetched", false);

  const { data: lateMatches } = await supabase
    .from("brasileirao_matches")
    .select("id")
    .lte("date", finalLineupTime)
    .eq("status", "SCHEDULED")
    .eq("lineup_confirmed", false)
    .eq("lineup_fetched", true);

  const lineupMatchesToFetch = [...(earlyMatches || []), ...(lateMatches || [])];
  const uniqueLineupIds = Array.from(new Set(lineupMatchesToFetch.map(m => m.id)));

  if (uniqueLineupIds.length > 0) {
    console.log(`Buscando escalação para ${uniqueLineupIds.length} jogos (40m ou 10m antes).`);

    for (const matchId of uniqueLineupIds) {
      try {
        const lineupsRes = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${matchId}`, {
          headers: { "x-apisports-key": API_FOOTBALL_KEY },
        });
        if (lineupsRes.ok) {
          const lineupsData = await lineupsRes.json();
          const lineups = lineupsData.response;

          if (lineups && lineups.length > 0) {
            const isLate = lateMatches?.some(m => m.id === matchId);
            const updatePayload: any = { lineups, lineup_fetched: true };
            if (isLate) {
              updatePayload.lineup_confirmed = true;
            }
            await supabase.from("brasileirao_matches").update(updatePayload).eq("id", matchId);
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

  // ─────────────────────────────────────────────────────────────
  // 2. BUSCA DE PLACARES E EVENTOS DA API-FOOTBALL
  //
  //    QUERY A: Jogos ainda em andamento (status != FINISHED)
  //    QUERY B: Jogos finalizados há menos de 10 minutos (finished_at recente)
  //             → continua buscando events/scouts mas SEM enviar push
  // ─────────────────────────────────────────────────────────────
  const limiteSuperior = new Date(agora.getTime() + 2 * 60000).toISOString();   // até 2 min no futuro
  const limiteInferior = new Date(agora.getTime() - 4 * 60 * 60000).toISOString(); // tolerância de 4h
  const postGameCutoff = new Date(agora.getTime() - 10 * 60000).toISOString();  // 10 min atrás

  // Query A: jogos ativos (não finalizados)
  const { data: jogosAtivos, error: dbError1 } = await supabase
    .from("brasileirao_matches")
    .select("id, status, home_team_id, away_team_id, phase, championship, events, statistics, home_score, away_score, last_notified_score")
    .lte("date", limiteSuperior)
    .gte("date", limiteInferior)
    .neq("status", "FINISHED");

  if (dbError1) {
    console.error("Erro ao buscar jogos ativos:", dbError1);
    return;
  }

  // Query B: jogos finalizados nos últimos 10 minutos (para garantir lances e scouts finais)
  const { data: jogosPosFim, error: dbError2 } = await supabase
    .from("brasileirao_matches")
    .select("id, status, home_team_id, away_team_id, phase, championship, events, statistics, home_score, away_score, last_notified_score")
    .lte("date", limiteSuperior)
    .gte("date", limiteInferior)
    .eq("status", "FINISHED")
    .gte("finished_at", postGameCutoff);

  if (dbError2) {
    console.error("Erro ao buscar jogos pós-fim:", dbError2);
    // Não interrompe — continua com os jogos ativos
  }

  // Combina as duas listas sem duplicatas
  const seenIds = new Set<number>();
  const todosJogos: any[] = [];

  for (const jogo of [...(jogosAtivos || []), ...(jogosPosFim || [])]) {
    if (!seenIds.has(jogo.id)) {
      seenIds.add(jogo.id);
      // Flag que indica se o jogo já estava finalizado quando esta execução começou
      jogo._wasAlreadyFinished = jogo.status === "FINISHED";
      todosJogos.push(jogo);
    }
  }

  if (todosJogos.length === 0) {
    console.log("Nenhum jogo ativo ou finalizado recentemente.");
    return;
  }

  const activeIds = todosJogos.map(j => j.id).slice(0, 20); // API-Football: max 20 IDs por requisição
  const idsString = activeIds.join('-');

  const jogosAtivosCount = todosJogos.filter(j => !j._wasAlreadyFinished).length;
  const jogosPosFimCount = todosJogos.filter(j => j._wasAlreadyFinished).length;
  console.log(`${jogosAtivosCount} jogo(s) ativo(s) + ${jogosPosFimCount} jogo(s) pós-fim (≤10 min). IDs: ${idsString}`);

  // ─────────────────────────────────────────────────────────────
  // Loop de 4 iterações de 14s (~56s total por execução do cron)
  // ─────────────────────────────────────────────────────────────
  for (let iteracao = 1; iteracao <= 4; iteracao++) {
    console.log(`Iteração ${iteracao}/4 — buscando placares na API-Football...`);

    const response = await fetch(`https://v3.football.api-sports.io/fixtures?ids=${idsString}`, {
      headers: { "x-apisports-key": API_FOOTBALL_KEY },
    });

    if (!response.ok) {
      console.error("Erro na API-Football:", response.status, await response.text());
      if (iteracao < 4) await sleep(14000);
      continue;
    }

    const dados = await response.json();
    const jogosAPI = dados.response || [];

    for (const jogoAPI of jogosAPI) {
      const matchId = jogoAPI.fixture.id;
      const statusShort = jogoAPI.fixture.status.short;

      const matchDb = todosJogos.find(j => j.id === matchId);
      if (!matchDb) continue;

      // ── Status ──────────────────────────────────────────────
      let novoStatus = "IN_PROGRESS";
      if (["FT", "AET", "PEN", "CANC", "PSTP", "ABD", "AWD", "WO"].includes(statusShort)) {
        novoStatus = "FINISHED";
      } else if (["NS", "TBD"].includes(statusShort)) {
        novoStatus = "SCHEDULED";
      }

      // ── Tempo de jogo ────────────────────────────────────────
      let matchTimeStr: string | null = null;
      if (["1H", "2H", "ET"].includes(statusShort)) {
        const tempo = statusShort === "1H" ? "1º T" : statusShort === "2H" ? "2º T" : "Prorrog.";
        const elapsed = jogoAPI.fixture.status.elapsed;
        const extra = jogoAPI.fixture.status.extra;
        matchTimeStr = `${tempo} - ${extra ? `${elapsed}+${extra}` : elapsed}'`;
      } else if (statusShort === "HT") {
        matchTimeStr = "Intervalo";
      } else if (statusShort === "P") {
        matchTimeStr = "Pênaltis";
      } else if (statusShort === "LIVE") {
        const elapsed = jogoAPI.fixture.status.elapsed;
        const extra = jogoAPI.fixture.status.extra;
        matchTimeStr = extra ? `${elapsed}+${extra}'` : `${elapsed}'`;
      }

      const wasAlreadyFinished = matchDb._wasAlreadyFinished;

      // ── Notificação: INÍCIO DE JOGO ──────────────────────────
      // Apenas quando o status transiciona de SCHEDULED → IN_PROGRESS (nunca para pós-fim)
      if (!wasAlreadyFinished && matchDb.status === "SCHEDULED" && novoStatus === "IN_PROGRESS") {
        const excludedPhases = ["19ª Rodada", "Rodada 19", "16-avos de final", "16-avos de Final", "Round of 32"];
        if (!matchDb.phase || !excludedPhases.includes(matchDb.phase)) {
          const homeTeam = teamsData?.find((t: any) => t.id === Number(matchDb.home_team_id));
          const awayTeam = teamsData?.find((t: any) => t.id === Number(matchDb.away_team_id));
          const homeName = homeTeam?.name || homeTeam?.short_name || jogoAPI.teams.home.name;
          const awayName = awayTeam?.name || awayTeam?.short_name || jogoAPI.teams.away.name;
          const leagueId = jogoAPI.league?.id;
          const championship = matchDb.championship || LEAGUE_ID_TO_CHAMPIONSHIP[leagueId] || 'brasileirao';
          await sendStartPushToMatchParticipants(supabase, championship,
            `▶️ Bola rolando!`,
            `O jogo entre ${homeName} e ${awayName} acabou de começar. Acompanhe!`
          );
        }
        matchDb.status = "IN_PROGRESS"; // atualiza local para evitar re-disparo
      }

      // ── Notificação: FIM DE JOGO ─────────────────────────────
      // Apenas quando o status transiciona para FINISHED (nunca para pós-fim)
      if (!wasAlreadyFinished && matchDb.status !== "FINISHED" && novoStatus === "FINISHED") {
        const excludedPhases = ["19ª Rodada", "Rodada 19", "16-avos de final", "16-avos de Final", "Round of 32"];
        if (!matchDb.phase || !excludedPhases.includes(matchDb.phase)) {
          const homeTeam = teamsData?.find(t => t.id === Number(matchDb.home_team_id));
          const awayTeam = teamsData?.find(t => t.id === Number(matchDb.away_team_id));
          const homeName = homeTeam?.name || homeTeam?.short_name || jogoAPI.teams.home.name;
          const awayName = awayTeam?.name || awayTeam?.short_name || jogoAPI.teams.away.name;
          const homeScore = jogoAPI.goals.home ?? 0;
          const awayScore = jogoAPI.goals.away ?? 0;
          const leagueId = jogoAPI.league?.id;
          const championship = matchDb.championship || LEAGUE_ID_TO_CHAMPIONSHIP[leagueId] || 'brasileirao';
          // ✅ FIX: filtra por matchEnd nas notification_settings
          await sendPushToMatchParticipants(supabase, championship,
            `🏁 Fim de Jogo!`,
            `${homeName} (${homeScore}) x (${awayScore}) ${awayName}. Acesse a liga para conferir os pontos!`,
            'matchEnd'
          );
        }
        matchDb.status = "FINISHED"; // atualiza local para evitar re-disparo
      }

      // ── Placar ───────────────────────────────────────────────
      const oldHomeScore = matchDb.home_score ?? 0;
      const oldAwayScore = matchDb.away_score ?? 0;
      const newHomeScore = jogoAPI.goals.home ?? 0;
      const newAwayScore = jogoAPI.goals.away ?? 0;
      const scoreChanged = (newHomeScore !== oldHomeScore) || (newAwayScore !== oldAwayScore);

      // ── Deduplicação de push de GOL ──────────────────────────
      // currentScoreKey é o placar atual da API.
      // lastNotifiedScore é o último placar para o qual JÁ enviamos push.
      // Só envia se o placar mudou E ainda não foi notificado para esse placar
      // E o jogo não estava já finalizado (evita re-push no período pós-fim).
      const currentScoreKey = `${newHomeScore}-${newAwayScore}`;
      const lastNotifiedScore = matchDb.last_notified_score ?? `${oldHomeScore}-${oldAwayScore}`;
      const shouldSendGoalPush = !wasAlreadyFinished && scoreChanged && (currentScoreKey !== lastNotifiedScore);

      if (shouldSendGoalPush) {
        console.log(`[match: ${matchId}] GOL detectado (${oldHomeScore}x${oldAwayScore} → ${newHomeScore}x${newAwayScore}). Enviando push.`);
      }

      // ── Busca de Eventos e Estatísticas ──────────────────────
      // Para jogos ATIVOS: na iteração 1 ou se o placar mudou
      // Para jogos PÓS-FIM: sempre na iteração 1 (garante lances e scouts completos)
      const shouldFetchEvents = iteracao === 1 || (scoreChanged && !wasAlreadyFinished);
      const shouldFetchStats = (iteracao === 1 && new Date().getMinutes() % 2 === 0) || (iteracao === 1 && wasAlreadyFinished);

      let currentEvents = matchDb.events;
      let currentStats = matchDb.statistics;

      if (shouldFetchEvents) {
        try {
          const eventsRes = await fetch(
            `https://v3.football.api-sports.io/fixtures/events?fixture=${matchId}`,
            { headers: { "x-apisports-key": API_FOOTBALL_KEY } }
          );
          if (eventsRes.ok) {
            const eventsData = await eventsRes.json();
            currentEvents = eventsData.response;
            matchDb.events = currentEvents;
            if (wasAlreadyFinished) {
              console.log(`[match: ${matchId}] Lances pós-fim atualizados (${currentEvents?.length ?? 0} eventos).`);
            }
          }
        } catch (e) {
          console.error(`Erro ao buscar eventos para ${matchId}:`, e);
        }
      }

      if (shouldFetchStats) {
        try {
          const statsRes = await fetch(
            `https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`,
            { headers: { "x-apisports-key": API_FOOTBALL_KEY } }
          );
          if (statsRes.ok) {
            const statsData = await statsRes.json();
            currentStats = statsData.response;
            matchDb.statistics = currentStats;
            if (wasAlreadyFinished) {
              console.log(`[match: ${matchId}] Scouts pós-fim atualizados.`);
            }
          }
        } catch (e) {
          console.error(`Erro ao buscar estatísticas para ${matchId}:`, e);
        }
      }

      // ── Notificação de GOL (após buscar eventos para ter o nome do jogador) ──
      if (shouldSendGoalPush) {
        matchDb.home_score = newHomeScore;
        matchDb.away_score = newAwayScore;
        matchDb.last_notified_score = currentScoreKey;

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
      } else if (scoreChanged && !wasAlreadyFinished) {
        // Placar mudou mas push já foi enviado por outro cron simultâneo — só atualiza local
        matchDb.home_score = newHomeScore;
        matchDb.away_score = newAwayScore;
      }

      // ── Gravar no banco ──────────────────────────────────────
      const updatePayload: any = {
        home_score: newHomeScore,
        away_score: newAwayScore,
        events: currentEvents,
        statistics: currentStats,
      };

      // Só atualiza status e match_time para jogos que ainda não estavam finalizados
      if (!wasAlreadyFinished) {
        updatePayload.status = novoStatus;
        updatePayload.match_time = matchTimeStr;

        // Registra o timestamp exato de quando o jogo foi finalizado
        // Usado para a query pós-fim (10 min de janela)
        if (novoStatus === "FINISHED" && matchDb.status !== "FINISHED") {
          updatePayload.finished_at = new Date().toISOString();
        }
      }

      // ✅ FIX: Grava o último placar notificado para evitar push duplicado em crons simultâneos
      if (shouldSendGoalPush) {
        updatePayload.last_notified_score = currentScoreKey;
      }

      await supabase
        .from("brasileirao_matches")
        .update(updatePayload)
        .eq("id", matchId);
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
