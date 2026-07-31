import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, BarChart3, Target, ArrowRight, Star, CheckCircle2, HelpCircle, Zap, Globe, Shield, Clock } from 'lucide-react';

interface SEOLandingProps {
    variant: 'bolao' | 'simulador' | 'tabela' | 'brazil' | 'brasileirao' | 'copa-do-brasil' | 'libertadores' | 'sul-americana';
}

/* ─── Conteúdo único por variante ─── */
const content: Record<string, any> = {

    bolao: {
        title: 'Bolão da Copa do Mundo 2026 – Crie ligas com amigos',
        heroTitle: 'Bolão da Copa do Mundo 2026',
        heroSubtitle: 'Crie ligas, convide amigos e dispute quem acerta mais palpites da maior competição do futebol mundial!',
        color: 'from-brasil-green to-emerald-700',
        intro: `A Copa do Mundo de 2026 será um dos eventos esportivos mais aguardados da história. Pela primeira vez, o torneio contará com 48 seleções disputando o título, com jogos realizados nos Estados Unidos, Canadá e México. Com mais jogos, mais emoção e mais surpresas, nunca houve momento melhor para criar seu bolão com amigos e familiares.

O Palpiteiro Mestre é a plataforma ideal para organizar seu bolão da Copa 2026. Você cria uma liga, convida quem quiser pelo link ou e-mail, e cada participante faz seus palpites antes de cada partida. O sistema calcula a pontuação automaticamente e a classificação é atualizada em tempo real, para ninguém ficar de fora da disputa.`,
        sections: [
            {
                icon: Users,
                title: 'Como criar seu bolão da Copa do Mundo 2026',
                text: `Criar um bolão da Copa do Mundo nunca foi tão simples. No Palpiteiro Mestre, em menos de 2 minutos você tem uma liga pronta para receber seus amigos. Basta criar uma conta gratuita, acessar a seção de ligas e clicar em "Criar Liga". Você define o nome da liga, se ela será pública ou privada, e pode personalizar as pontuações conforme a preferência do grupo.

Após criar a liga, compartilhe o link pelo WhatsApp, Telegram ou e-mail. Seus amigos se cadastram e já podem começar a fazer palpites. Não é preciso instalar nada — a plataforma funciona direto no navegador do celular ou no aplicativo Android.`,
            },
            {
                icon: BarChart3,
                title: 'Sistema de pontuação justo e transparente',
                text: `O sistema de pontuação do Palpiteiro Mestre é completamente transparente e configurável. O administrador da liga pode definir quantos pontos vale cada tipo de acerto:

• **Placar exato** — o palpite mais difícil e mais valioso, padrão 10 pontos.
• **Vencedor + diferença de gols** — acertou quem ganhou e por quanto, padrão 7 pontos.
• **Vencedor + gols do vencedor** — acertou o time campeão da partida e os gols dele, padrão 6 pontos.
• **Empate correto** — previu o empate certo, padrão 7 pontos.
• **Vencedor simples** — apenas o time que ganhou ou o empate, padrão 5 pontos.

Essa flexibilidade permite que cada grupo personalize o jogo conforme seus gostos, deixando o bolão mais emocionante e competitivo.`,
            },
            {
                icon: Shield,
                title: 'Por que a Copa do Mundo 2026 será histórica?',
                text: `A Copa do Mundo de 2026 marca uma virada histórica no futebol mundial. Com a expansão para 48 seleções, o número de jogos saltou de 64 para 104 partidas, o que significa mais oportunidades de palpite e mais emoção para todos os participantes do bolão.

O Brasil chega à Copa 2026 com sede de redenção após as eliminações dolorosas de 2014 e 2022. A seleção canarinha será uma das principais favoritas, ao lado da Argentina campeã em 2022, da França, da Espanha e das tradicionais potências europeias. Com o formato de 48 seleções, há também mais espaço para surpresas — times da África, Ásia e Concacaf podem surpreender e fazer história.

Nesse cenário, fazer palpites se torna ainda mais desafiador e divertido. Quem vai passar da fase de grupos? Quem será eliminado nas oitavas? Quem levantará a taça? Tudo isso pode ser apostado no seu bolão com amigos.`,
            },
        ],
        faqs: [
            { q: 'O bolão da Copa do Mundo 2026 é gratuito?', a: 'Sim! Criar e participar de ligas é totalmente gratuito. O plano PRO oferece recursos extras como estatísticas avançadas e remoção de anúncios.' },
            { q: 'Quantas pessoas podem participar de uma liga?', a: 'O plano gratuito suporta até 15 participantes por liga. Com o plano VIP, você pode ter ligas ilimitadas sem limite de participantes.' },
            { q: 'Os palpites podem ser alterados?', a: 'Sim, você pode editar seu palpite até 5 minutos antes do início de cada partida. Após esse prazo, o palpite é bloqueado automaticamente.' },
            { q: 'Como funciona a atualização dos placar?', a: 'Os placares são atualizados automaticamente durante os jogos. A pontuação de cada participante é recalculada assim que o resultado é registrado.' },
        ],
    },

    simulador: {
        title: 'Simulador da Copa do Mundo 2026 – Simule todos os jogos',
        heroTitle: 'Simulador da Copa 2026',
        heroSubtitle: 'Simule os resultados de todos os jogos e descubra qual seleção pode ser campeã do mundo em 2026!',
        color: 'from-brasil-blue to-blue-800',
        intro: `Você já se perguntou o que acontece se o Brasil vencer todos os jogos da fase de grupos? E se a Argentina for eliminada nas oitavas de final? O Simulador da Copa 2026 do Palpiteiro Mestre permite que você teste todos esses cenários de forma interativa, simulando cada partida e acompanhando como a chave do torneio se desenvolve.

Com 104 jogos na Copa de 2026, as possibilidades são praticamente infinitas. Use nosso simulador para criar seu cenário favorito, compartilhar com amigos e debater quem tem a análise mais precisa sobre o torneio.`,
        sections: [
            {
                icon: Target,
                title: 'Como usar o Simulador da Copa do Mundo',
                text: `O simulador é intuitivo e fácil de usar. Acesse a seção "Simulador" no menu principal e você verá todos os jogos da Copa 2026 organizados por fase: grupos, oitavas, quartas, semifinais e final. Insira o placar que você prevê para cada partida da fase de grupos e o sistema automaticamente calculará quais seleções avançam de fase com base nas regras oficiais da FIFA.

Na fase eliminatória, os confrontos são definidos automaticamente com base nos resultados que você simulou nos grupos. Você pode testar diferentes cenários — o que acontece se o Brasil terminar em segundo lugar do grupo? E se a Alemanha surpreender e for eliminada? O simulador responde todas essas perguntas instantaneamente.`,
            },
            {
                icon: Globe,
                title: 'Copa do Mundo 2026: Os favoritos ao título',
                text: `Com 48 seleções disputando o título, a Copa do Mundo 2026 promete ser a mais disputada da história. Os especialistas apontam os seguintes países como principais favoritos:

**Brasil** — A seleção canarinho chega com uma geração talentosa e fome de redenção após as eliminações de 2014 (7 a 1 para a Alemanha) e 2022 (pênaltis para a Croácia). Com jogadores de alto nível em clubes europeus, o Brasil é sempre um dos favoritos.

**Argentina** — Campeã em 2022, a albiceleste defende o título com Lionel Messi em um dos seus últimos Copas. A experiência do grupo e o técnico Lionel Scaloni fazem da Argentina uma das maiores ameaças.

**França** — Com Mbappé e um elenco repleto de estrelas, a França continua sendo uma das mais completas seleções do mundo.

**Espanha** — A nova geração espanhola, com Pedri, Gavi e Yamal, já mostrou seu potencial na Eurocopa. O toque de bola característico permanece encantador.

Use o simulador para testar se seus favoritos chegam à final e quem levanta a taça!`,
            },
            {
                icon: Zap,
                title: 'Compartilhe sua simulação e debata com amigos',
                text: `Uma das funcionalidades mais divertidas do simulador é a possibilidade de comparar suas previsões com as dos seus amigos. Depois de simular toda a Copa, você pode discutir os resultados, fazer apostas saudáveis e ver quem chega mais próximo da realidade quando os jogos acontecerem de verdade.

O simulador também é uma excelente ferramenta de estudo para quem quer fazer palpites mais fundamentados no bolão. Ao analisar os grupos e possíveis confrontos, você entende melhor quais partidas são as mais equilibradas e onde estão as maiores surpresas em potencial.`,
            },
        ],
        faqs: [
            { q: 'O simulador usa dados reais?', a: 'Sim, o simulador utiliza os grupos e chaves oficiais da Copa do Mundo 2026, conforme definido pela FIFA.' },
            { q: 'Posso salvar minha simulação?', a: 'As simulações são interativas e podem ser ajustadas a qualquer momento dentro da sua sessão.' },
            { q: 'O simulador funciona no celular?', a: 'Sim, o simulador é totalmente responsivo e funciona bem em smartphones e tablets.' },
            { q: 'O simulador é diferente do bolão?', a: 'Sim. O simulador é uma ferramenta de previsão pessoal. O bolão é uma competição entre amigos com pontuação real baseada nos resultados oficiais.' },
        ],
    },

    tabela: {
        title: 'Tabela da Copa do Mundo 2026 – Jogos, Grupos e Resultados',
        heroTitle: 'Tabela da Copa do Mundo 2026',
        heroSubtitle: 'Acompanhe todos os jogos, grupos, resultados e classificações da Copa do Mundo 2026 em tempo real!',
        color: 'from-amber-500 to-orange-600',
        intro: `A Copa do Mundo 2026 é o maior evento esportivo do planeta e acompanhar todos os jogos pode ser um desafio sem uma boa tabela de classificação. O Palpiteiro Mestre oferece a tabela completa da Copa 2026, com todos os grupos, jogos, resultados e a classificação atualizada em tempo real durante o torneio.

Com 48 seleções divididas em 12 grupos de 4 times cada, seguidas pelas fases eliminatórias de 32 times até a grande final, a Copa de 2026 terá 104 jogos para você acompanhar. Nossa tabela organiza tudo de forma clara e intuitiva para que você nunca perca nenhuma informação importante.`,
        sections: [
            {
                icon: BarChart3,
                title: 'Como funciona a fase de grupos da Copa 2026',
                text: `Na Copa do Mundo 2026, as 48 seleções participantes foram divididas em 12 grupos de 4 times cada. Em cada grupo, todos os times jogam entre si (sistema de pontos corridos), e os dois melhores de cada grupo avançam para a fase eliminatória de 32 times. Além disso, os oito melhores terceiros colocados entre os 12 grupos também se classificam, totalizando 32 seleções na fase de oitavas.

O critério de classificação dentro de cada grupo segue as regras oficiais da FIFA: pontos, saldo de gols, gols marcados, confronto direto e, por último, sorteio. Nossa tabela exibe toda essa classificação de forma automática, atualizada assim que cada resultado é registrado.`,
            },
            {
                icon: Globe,
                title: 'Sedes e cidades-sede da Copa do Mundo 2026',
                text: `A Copa do Mundo de 2026 será a primeira a ser realizada em três países simultaneamente: Estados Unidos, Canadá e México. Os jogos acontecerão em 16 cidades ao total, sendo 11 nos EUA, 2 no Canadá e 3 no México.

**Cidades dos EUA:** Nova York, Los Angeles, Dallas, San Francisco, Miami, Seattle, Boston, Kansas City, Filadélfia, Atlanta e Houston.

**Cidades do Canadá:** Toronto e Vancouver.

**Cidades do México:** Cidade do México, Guadalajara e Monterrey.

A final será disputada no MetLife Stadium, em Nova York/Nova Jersey, o maior estádio entre as sedes. Com jogos espalhados por três países e fusos horários diferentes, acompanhar a tabela é essencial para não perder nenhum confronto importante.`,
            },
            {
                icon: Clock,
                title: 'Resultados ao vivo e notificações',
                text: `No Palpiteiro Mestre, você pode acompanhar os resultados da Copa do Mundo 2026 em tempo real. A tabela é atualizada automaticamente durante os jogos, e se você tiver feito palpites no bolão, verá sua pontuação sendo calculada conforme o jogo acontece.

Ative as notificações do aplicativo para receber alertas sobre o início dos jogos, gols marcados e resultados finais. Assim você não perde nenhum momento importante da Copa, mesmo que esteja ocupado no trabalho ou em outras atividades.`,
            },
        ],
        faqs: [
            { q: 'A tabela é atualizada automaticamente?', a: 'Sim, os resultados são atualizados em tempo real durante os jogos da Copa do Mundo 2026.' },
            { q: 'Posso ver os resultados de jogos anteriores?', a: 'Sim, a tabela mantém o histórico de todos os jogos já realizados no torneio.' },
            { q: 'A tabela mostra os artilheiros e estatísticas?', a: 'A tabela mostra grupos, resultados e classificação. Para estatísticas avançadas, acesse o recurso de estatísticas exclusivo para usuários PRO.' },
            { q: 'Funciona sem internet?', a: 'É necessária conexão com internet para acessar os resultados em tempo real. Dados em cache podem ser visualizados offline por alguns minutos.' },
        ],
    },

    brazil: {
        title: 'Bolão Apenas Jogos do Brasil – Copa do Mundo 2026',
        heroTitle: 'Bolão Jogos do Brasil',
        heroSubtitle: 'O bolão focado nos jogos da Seleção Brasileira com bônus especiais de artilheiro — para os fãs do Brasil!',
        color: 'from-brasil-green via-yellow-500 to-brasil-blue',
        intro: `Se você é daqueles que só assiste a Copa do Mundo quando o Brasil está em campo, o Bolão Jogos do Brasil é feito para você! Diferente do bolão tradicional que cobre todos os jogos do torneio, nessa modalidade você faz palpites exclusivamente nas partidas da Seleção Brasileira, do começo ao fim — ou até a eliminação, torçamos para que não aconteça.

Com a Copa do Mundo 2026 sendo disputada com 48 seleções, o Brasil pode jogar até 7 partidas se chegar à final. Isso significa 7 oportunidades de testar seu conhecimento sobre a seleção, acertar o placar e liderar o bolão do seu grupo de amigos!`,
        sections: [
            {
                icon: Trophy,
                title: 'Bônus de Artilheiro: uma aposta extra antes do torneio',
                text: `Um dos recursos mais exclusivos do Bolão Jogos do Brasil é o sistema de bônus de artilheiro. Antes do início do torneio, cada participante pode apostar qual jogador brasileiro será o artilheiro da Seleção na Copa. Essa aposta dá direito a pontos bônus ao final — uma vantagem estratégica que pode definir o campeão do bolão.

Se você acha que Vinicius Jr. vai artilhar para o Brasil, apostou nisso antes e ele realmente se tornar o maior marcador da seleção, você leva uma quantidade significativa de pontos extras que pode virar o jogo na classificação do bolão. Estratégia, conhecimento e um pouco de sorte definem o grande campeão.`,
            },
            {
                icon: Star,
                title: 'O Brasil na Copa do Mundo 2026: expectativas',
                text: `O Brasil chega à Copa do Mundo 2026 carregando o peso de ser o maior campeão da história com 5 títulos, mas também a amargura de não conquistar o hexacampeonato desde 2002, há mais de duas décadas. A geração atual da Seleção é considerada uma das mais talentosas dos últimos anos, com jogadores de altíssimo nível atuando nos melhores clubes do mundo.

Nomes como Vinicius Jr. (Real Madrid), Rodrygo (Real Madrid), Endrick (Real Madrid), Raphinha (Barcelona), Casemiro (Manchester United) e outros formam um elenco que desperta esperanças em toda a nação. A expectativa é alta, a torcida é apaixonada e o caminho para o hexacampeonato passa por 2026.

Com jogos em território norte-americano, o horário dos jogos favorece os fãs brasileiros, especialmente os da fase de grupos, que acontecem em horários mais acessíveis que edições europeias ou asiáticas do torneio.`,
            },
            {
                icon: Users,
                title: 'Junte os amigos e torça pelo Brasil junto',
                text: `Nada é mais gostoso do que torcer pelo Brasil com os amigos e ainda competir para ver quem sabe mais da seleção. O Bolão Jogos do Brasil é a desculpa perfeita para reunir o grupo, seja presencialmente ou pelo grupo do WhatsApp, e viver a Copa com ainda mais emoção.

Cada jogo da Seleção Brasileira vira uma disputa dupla: o Brasil contra o adversário, e você contra seus amigos no bolão. Dois motivos a mais para cada partida ser inesquecível. Crie seu bolão agora mesmo, é gratuito e leva menos de 2 minutos para começar.`,
            },
        ],
        faqs: [
            { q: 'O bolão dos jogos do Brasil cobre todos os jogos da seleção?', a: 'Sim, todos os jogos do Brasil na Copa do Mundo 2026, da fase de grupos até a final (caso a seleção chegue lá).' },
            { q: 'O que é o bônus de artilheiro?', a: 'Antes da Copa, você aposta qual jogador brasileiro será o artilheiro da seleção no torneio. Se acertar, ganha pontos bônus no final.' },
            { q: 'Se o Brasil for eliminado, o bolão acaba?', a: 'Sim, o bolão dos Jogos do Brasil cobre apenas as partidas da Seleção. Caso queira acompanhar o torneio completo, use o bolão da Copa.' },
            { q: 'Posso participar de mais de um bolão ao mesmo tempo?', a: 'Sim! Você pode participar de quantos bolões quiser simultaneamente na plataforma.' },
        ],
    },

    brasileirao: {
        title: 'Bolão do Brasileirão 2025 – Crie ligas e dispute com amigos',
        heroTitle: 'Bolão do Brasileirão',
        heroSubtitle: 'Faça seus palpites, crie ligas privadas e veja quem sabe mais sobre o Campeonato Brasileiro 2025!',
        color: 'from-green-600 to-green-900',
        intro: `O Campeonato Brasileiro é a competição de futebol mais importante do Brasil e uma das ligas mais disputadas e emocionantes do mundo. Com 20 clubes jogando 38 rodadas cada, são mais de 380 partidas de futebol de alto nível para fazer palpites ao longo de aproximadamente 8 meses de torneio.

O Bolão do Brasileirão do Palpiteiro Mestre permite que você faça palpites rodada a rodada, acompanhe a classificação da sua liga em tempo real e dispute com amigos, colegas de trabalho ou familiares quem melhor prevê os resultados do Brasileirão.`,
        sections: [
            {
                icon: Trophy,
                title: 'Como funciona o Bolão do Brasileirão',
                text: `No Bolão do Brasileirão, você faz palpites para todos os jogos de cada rodada antes do início das partidas. Os palpites são bloqueados automaticamente 5 minutos antes de cada jogo começar — então não deixe para a última hora! Após cada rodada, o sistema calcula automaticamente a pontuação de cada participante e atualiza a tabela de classificação da liga.

O administrador da liga pode personalizar a pontuação de acordo com o perfil do grupo: pontos maiores para quem acertar o placar exato, pontos menores para quem apenas acertar o vencedor. Essa flexibilidade permite adaptar o bolão ao nível de conhecimento e ao estilo de jogo do seu grupo.

Além dos palpites de placar, o bolão do Brasileirão permite filtrar a classificação por competição (caso sua liga também inclua Copa do Brasil, Libertadores e Sul-Americana) e por rodada, para identificar quem foi o melhor em cada semana.`,
            },
            {
                icon: Globe,
                title: 'O Brasileirão Série A: a competição mais equilibrada da América do Sul',
                text: `O Campeonato Brasileiro Série A é reconhecido internacionalmente como uma das ligas mais equilibradas e competitivas do futebol mundial. Ao contrário de outros campeonatos europeus dominados por um ou dois clubes, o Brasileirão tem um histórico de campeões variados — nos últimos 20 anos, mais de 10 clubes diferentes conquistaram o título.

Times como Flamengo, Palmeiras, Atlético-MG, Fluminense, Botafogo, Corinthians, São Paulo, Internacional, Cruzeiro e outros grandes clubes nacionais tornam cada rodada uma disputa de alto nível. A força do campeonato é tão reconhecida que os clubes brasileiros são frequentemente os mais bem-colocados nas competições sul-americanas, como a Libertadores e a Sul-Americana.

Em 2025, o Brasileirão promete mais um ano de muitas disputas pelo título, por vagas nas competições internacionais e pela luta desesperada contra o rebaixamento — três disputas simultâneas que mantêm o torneio emocionante do começo ao fim.`,
            },
            {
                icon: Zap,
                title: 'Recursos exclusivos do Bolão do Brasileirão',
                text: `O Palpiteiro Mestre oferece recursos específicos para o Bolão do Brasileirão que tornam a experiência ainda mais completa:

**Classificação por rodada:** Veja quem foi o melhor em cada rodada específica, não apenas no total acumulado. Isso cria disputas semanais emocionantes dentro do bolão.

**Filtro por competição:** Se sua liga cobre Brasileirão, Copa do Brasil, Libertadores e Sul-Americana, você pode ver a classificação separada por cada competição.

**Estatísticas de palpites:** Veja a distribuição de palpites entre os participantes antes dos jogos (para usuários PRO) — uma forma de entender o "consenso" do grupo e tomar decisões mais estratégicas.

**Ranking histórico:** Acompanhe a evolução da pontuação de cada participante ao longo do campeonato com gráficos de progresso.`,
            },
        ],
        faqs: [
            { q: 'O bolão cobre todas as 38 rodadas do Brasileirão?', a: 'Sim, você pode fazer palpites para todos os jogos do Brasileirão Série A 2025, da 1ª à 38ª rodada.' },
            { q: 'Posso criar um bolão que inclua também Copa do Brasil e Libertadores?', a: 'Sim! Ao criar a liga, você pode selecionar quais competições serão incluídas: Brasileirão, Copa do Brasil, Libertadores e/ou Sul-Americana.' },
            { q: 'Como funciona o rebaixamento no bolão?', a: 'O bolão não simula rebaixamento — você faz palpites nos resultados de cada jogo. O sistema calcula seus pontos com base nos acertos.' },
            { q: 'Existe um ranking entre todas as ligas da plataforma?', a: 'Atualmente, o ranking é interno a cada liga. Futuramente pretendemos adicionar um ranking global entre todos os usuários da plataforma.' },
        ],
    },

    'copa-do-brasil': {
        title: 'Bolão da Copa do Brasil 2025 – Mata-mata e emoção total',
        heroTitle: 'Bolão da Copa do Brasil',
        heroSubtitle: 'A emoção do mata-mata! Faça seus palpites jogo a jogo e veja quem prevê melhor o campeão da Copa do Brasil.',
        color: 'from-blue-600 to-blue-900',
        intro: `A Copa do Brasil é a competição mata-mata mais importante do futebol brasileiro e uma das mais emocionantes da América do Sul. Com mais de 90 clubes participando, desde pequenas equipes de cidades do interior até os maiores times do país, o torneio oferece surpresas inesquecíveis a cada fase.

O Bolão da Copa do Brasil do Palpiteiro Mestre permite que você faça palpites nas principais fases do torneio — oitavas, quartas, semifinais e final — disputando com seus amigos quem melhor prevê os resultados do mata-mata mais emocionante do futebol nacional.`,
        sections: [
            {
                icon: Trophy,
                title: 'A Copa do Brasil: história e tradição do mata-mata',
                text: `Criada em 1989, a Copa do Brasil surgiu como uma forma de valorizar o futebol regional brasileiro, dando oportunidade a clubes de todos os estados do país. O torneio é disputado no formato de mata-mata com jogos de ida e volta, onde o placar agregado define o classificado — exceto na final, que também é no mesmo formato.

Uma das características mais marcantes da Copa do Brasil é a lei do gol fora de casa: em caso de empate no agregado, o time que marcou mais gols como visitante avança. Essa regra torna cada jogo muito mais estratégico e imprevisível, já que um placar simples pode ser decisivo.

A Copa do Brasil tem sido palco de algumas das maiores viradas e surpresas do futebol brasileiro. Times da Série B, C e D já eliminaram grandes clubes da Série A, comprovando que no mata-mata qualquer resultado é possível. Essa imprevisibilidade é exatamente o que torna o bolão da Copa do Brasil tão divertido.`,
            },
            {
                icon: Shield,
                title: 'Como funciona o sistema de palpites no mata-mata',
                text: `No Bolão da Copa do Brasil, você faz palpites para cada jogo individualmente — tanto o jogo de ida quanto o de volta. O sistema calcula seus pontos com base no resultado de cada partida separadamente, independente do placar agregado.

Isso significa que mesmo que seu time preferido seja eliminado, você pode continuar pontuando nos outros jogos da fase. A classificação do bolão considera o desempenho de cada participante em todos os palpites realizados ao longo do torneio.

Para deixar o bolão ainda mais emocionante, você pode criar ligas que cubram apenas a Copa do Brasil ou combinar com outras competições como Brasileirão, Libertadores e Sul-Americana.`,
            },
            {
                icon: Star,
                title: 'Os maiores campeões da Copa do Brasil',
                text: `A Copa do Brasil tem um palmarès variado, com múltiplos campeões ao longo de sua história. Entre os clubes com mais títulos estão Grêmio, Cruzeiro, Palmeiras, Corinthians, Flamengo e outros gigantes do futebol nacional.

O que torna a competição especial é que qualquer clube pode chegar longe — desde que tenha qualidade e um pouco de sorte nos sorteios das fases. Em 2024, o Flamengo conquistou o título de forma dominante, mas anos anteriores viram campeões inesperados que surpreenderam todo o Brasil.

Em 2025, quem será o campeão? Faça seu bolão e veja quem do seu grupo de amigos tem a previsão mais certeira!`,
            },
        ],
        faqs: [
            { q: 'O bolão cobre todas as fases da Copa do Brasil?', a: 'O bolão cobre as fases principais configuradas no sistema: oitavas, quartas, semifinais e final da Copa do Brasil.' },
            { q: 'Como funciona o palpite no mata-mata?', a: 'Você faz palpite para cada jogo individual (ida e volta). Cada partida é um evento separado com sua própria pontuação.' },
            { q: 'A lei do gol fora influencia o bolão?', a: 'Não diretamente. O palpite é pelo resultado de cada jogo, não pelo classificado do confronto. Mas entender a lei do gol fora ajuda a fazer palpites mais estratégicos.' },
            { q: 'Posso combinar a Copa do Brasil com o Brasileirão no mesmo bolão?', a: 'Sim! Ao criar a liga, você seleciona quais competições quer incluir. É possível ter um bolão que cubra Brasileirão + Copa do Brasil + Libertadores + Sul-Americana.' },
        ],
    },

    libertadores: {
        title: 'Bolão da Libertadores 2025 – A Glória Eterna no seu bolão',
        heroTitle: 'Bolão da Libertadores',
        heroSubtitle: 'A maior competição de clubes da América do Sul! Faça seus palpites e conquiste a Glória Eterna no seu grupo de amigos.',
        color: 'from-yellow-500 to-amber-700',
        intro: `A Copa Libertadores da América é a competição de clubes mais importante e prestigiosa da América do Sul, equivalente à Champions League europeia. Conquistar a Libertadores é o maior sonho de qualquer clube sul-americano, e assistir a esses jogos — com a emoção, a intensidade e o torcedor apaixonado — é uma experiência única no futebol mundial.

O Bolão da Libertadores do Palpiteiro Mestre permite que você faça palpites nas fases eliminatórias do torneio — oitavas, quartas, semifinais e a grande final — disputando com amigos, colegas e familiares quem melhor prevê os resultados da competição mais apaixonante do continente.`,
        sections: [
            {
                icon: Trophy,
                title: 'A Libertadores: história, tradição e paixão sul-americana',
                text: `A Copa Libertadores foi criada em 1960 e ao longo de mais de seis décadas se tornou sinônimo de futebol apaixonado, jogos inesquecíveis e rivalidades históricas. O troféu, com sua icônica bola dourada no topo, é cobiçado por clubes de Argentina, Brasil, Uruguai, Colômbia, Chile, Paraguai, Peru, Bolívia, Equador e Venezuela.

Os clubes brasileiros têm sido protagonistas da competição nas últimas décadas. Flamengo, Palmeiras, Athletico-PR, Fluminense e Botafogo representaram o Brasil em finais recentes, com vitórias e derrotas que entraram para a história. A final de 2019, com o gol de Gabigol nos acréscimos que deu o título ao Flamengo sobre o River Plate, é considerada uma das maiores finais de clubes da história.

No formato atual, os 32 times das oitavas de final disputam eliminatórias ao longo de 4 fases até a grande final em campo neutro.`,
            },
            {
                icon: Globe,
                title: 'Os clubes favoritos da Libertadores 2025',
                text: `A Libertadores 2025 conta com representantes de todo o continente, mas alguns clubes chegam como favoritos ao título com base em elenco, histórico e investimento:

**Brasil:** Flamengo, Palmeiras, Atlético-MG, Botafogo e outros gigantes brasileiros são sempre candidatos ao título. O investimento dos clubes brasileiros nos últimos anos elevou o nível técnico da competição.

**Argentina:** River Plate e Boca Juniors são os maiores vencedores históricos da competição. Com elencos renovados e investimento pesado, continuam sendo ameaças constantes.

**Uruguai:** Peñarol e Nacional têm história na competição e sempre surpreendem quando chegam às fases eliminatórias.

Nos palpites do bolão, entender a força de cada clube e o fator casa (times sul-americanos jogam muito melhor em seus estádios) é fundamental para acertar mais.`,
            },
            {
                icon: Zap,
                title: 'Por que o bolão da Libertadores é tão emocionante?',
                text: `A Libertadores tem características únicas que tornam o bolão ainda mais empolgante do que em outras competições:

**Imprevisibilidade:** Jogos fora de casa em cidades como Buenos Aires, Bogotá ou La Paz (a 3.600m de altitude!) podem mudar completamente o resultado esperado.

**Rivalidades continentais:** Flamengo x River Plate, Boca x Palmeiras, Atlético-MG x Nacional — confrontos históricos que aquecem qualquer bolão.

**A magia dos pênaltis:** No mata-mata da Libertadores, muitas decisões vão para os pênaltis, tornando cada palpite um exercício de adivinhação e estratégia.

**A final em campo neutro:** A grande final da Libertadores em estádio neutro elimina a vantagem de jogar em casa, deixando tudo em aberto até o apito final.`,
            },
        ],
        faqs: [
            { q: 'O bolão cobre a fase de grupos da Libertadores?', a: 'O bolão cobre as fases eliminatórias: oitavas de final, quartas, semifinais e final. Jogos da fase de grupos e qualificatórios não estão incluídos.' },
            { q: 'Posso fazer palpites nos dois jogos de cada fase?', a: 'Sim, cada jogo (ida e volta) é um palpite separado com sua própria pontuação.' },
            { q: 'E se o jogo for decidido nos pênaltis?', a: 'O palpite é pelo resultado do jogo dentro dos 90 minutos (ou 120, se houver prorrogação). O resultado nos pênaltis não entra na pontuação do palpite.' },
            { q: 'O bolão da Libertadores pode ser combinado com o Brasileirão?', a: 'Sim! Você pode criar uma liga que cubra Brasileirão + Libertadores + Copa do Brasil + Sul-Americana ao mesmo tempo.' },
        ],
    },

    'sul-americana': {
        title: 'Bolão da Sul-Americana 2025 – A Grande Conquista sul-americana',
        heroTitle: 'Bolão da Sul-Americana',
        heroSubtitle: 'A Copa Sul-Americana é a segunda mais importante da América do Sul. Faça seus palpites e conquiste seu grupo de amigos!',
        color: 'from-pink-600 to-rose-900',
        intro: `A Copa Sul-Americana, também conhecida como "Sula", é a segunda competição de clubes mais importante da América do Sul e uma das mais disputadas do continente. Apesar de ser considerada o "segundo torneio" em relação à Libertadores, a Sul-Americana tem cada vez mais prestígio, com clubes investindo pesado para conquistar o troféu e garantir vaga na Copa do Mundo de Clubes da FIFA.

O Bolão da Sul-Americana do Palpiteiro Mestre permite que você faça palpites nas fases eliminatórias do torneio, disputando com amigos e familiares quem melhor prevê os resultados de uma das competições mais emocionantes do futebol sul-americano.`,
        sections: [
            {
                icon: Trophy,
                title: 'Sul-Americana: muito mais do que o "segundo torneio"',
                text: `A Copa Sul-Americana foi criada em 2002 e rapidamente ganhou importância no calendário do futebol continental. Inicialmente vista como uma competição de menor prestígio, o torneio cresceu em nível técnico, premiação financeira e cobertura midiática ao longo dos anos.

Um dos momentos históricos que elevou o status da competição foi a conquista do Athletico-PR em 2018 e 2021, provando que clubes com projeto sólido podem dominar o torneio. Outros campeões notáveis incluem San Lorenzo (Argentina), Independiente Santa Fe (Colômbia), Lanús (Argentina) e clubes de outros países que mostram a diversidade da competição.

O campeão da Sul-Americana garante vaga na Libertadores do ano seguinte e na Recopa Sul-Americana, que enfrenta o campeão da Libertadores. Isso significa que vencer a Sula é um trampolim para disputar o torneio mais importante do continente.`,
            },
            {
                icon: Globe,
                title: 'As diferenças entre Libertadores e Sul-Americana',
                text: `Muitos torcedores confundem as duas competições, mas existem diferenças importantes:

**Quem participa:** Na Libertadores, participam os campeões nacionais e os melhores colocados em seus campeonatos. Na Sul-Americana, participam os próximos da fila — geralmente terceiros, quartos e quintos colocados dos campeonatos nacionais, além de eliminados na fase de grupos da Libertadores.

**Formato:** Ambas têm formatos similares com fase de grupos seguida de fases eliminatórias (mata-mata). A Sul-Americana não tem fases de qualificação tão extensas quanto a Libertadores.

**Nível técnico:** A Libertadores reúne os melhores clubes do continente, enquanto a Sul-Americana tem um nível ligeiramente inferior mas ainda muito competitivo, com grandes surpresas e jogos de alta qualidade.

**Para o bolão:** A Sul-Americana muitas vezes oferece resultados mais imprevisíveis do que a Libertadores, já que os times não têm o mesmo nível de equilíbrio, tornando os palpites mais desafiadores e o bolão mais emocionante.`,
            },
            {
                icon: Star,
                title: 'Por que criar um bolão da Sul-Americana?',
                text: `O bolão da Sul-Americana tem algumas vantagens únicas em relação às outras competições:

**Mais surpresas:** Com clubes de menor tradição internacional participando, as probabilidades de um azarão avançar são maiores, tornando os palpites mais difíceis e os acertos mais valiosos.

**Jogos durante a semana:** Como a Sul-Americana acontece em paralelo com o Brasileirão e a Copa do Brasil, há muitos jogos durante a semana, o que significa mais palpites e mais emoção ao longo da temporada.

**Combinação perfeita:** Quando você cria uma liga que cobre Brasileirão + Sul-Americana + Copa do Brasil + Libertadores, cada semana tem múltiplos jogos para palpitar, mantendo o bolão sempre animado.

Crie agora seu bolão da Sul-Americana e veja quem do seu grupo de amigos tem o maior conhecimento do futebol sul-americano!`,
            },
        ],
        faqs: [
            { q: 'A Sul-Americana e a Libertadores são jogadas ao mesmo tempo?', a: 'Sim, ambas acontecem em paralelo durante a temporada sul-americana, geralmente de fevereiro a novembro.' },
            { q: 'Clubes brasileiros participam da Sul-Americana?', a: 'Sim, geralmente os times classificados em 5º a 8º lugar no Brasileirão do ano anterior participam da Sul-Americana.' },
            { q: 'O bolão inclui a fase de grupos da Sul-Americana?', a: 'O bolão cobre as fases eliminatórias: oitavas de final, quartas, semifinais e final da Sul-Americana.' },
            { q: 'Posso ter um único bolão para todas as competições?', a: 'Sim! O Palpiteiro Mestre permite criar ligas que cubram todas as competições simultaneamente: Brasileirão, Copa do Brasil, Libertadores e Sul-Americana.' },
        ],
    },
};

/* ─── Componente ─── */
export const SEOLanding: React.FC<SEOLandingProps> = ({ variant }) => {
    const page = content[variant];
    if (!page) return null;

    return (
        <div className="min-h-[80vh] pb-20">

            {/* Hero */}
            <div className={`bg-gradient-to-br ${page.color} rounded-2xl p-8 md:p-14 mb-12 text-white relative overflow-hidden shadow-2xl`}>
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-6 right-6 w-40 h-40 border-4 border-white rounded-full" />
                    <div className="absolute bottom-6 left-6 w-28 h-28 border-4 border-white rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-4 border-white rounded-full" />
                </div>
                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-2 mb-4">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={18} className="fill-yellow-300 text-yellow-300" />
                        ))}
                        <span className="text-yellow-200 text-sm font-bold ml-1">Palpiteiro Mestre</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
                        {page.heroTitle}
                    </h1>
                    <p className="text-lg md:text-xl opacity-90 mb-8 max-w-2xl leading-relaxed">
                        {page.heroSubtitle}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-bold px-7 py-3.5 rounded-xl hover:bg-gray-100 transition-all active:scale-95 shadow-lg text-base"
                        >
                            Criar Bolão Grátis <ArrowRight size={20} />
                        </Link>
                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center gap-2 bg-white/20 border border-white/40 text-white font-bold px-7 py-3.5 rounded-xl hover:bg-white/30 transition-all text-base"
                        >
                            Já tenho conta
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto space-y-12">

                {/* Intro */}
                <section>
                    <div className="prose prose-gray dark:prose-invert max-w-none">
                        {page.intro.split('\n\n').map((para: string, i: number) => (
                            <p key={i} className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg mb-4">
                                {para}
                            </p>
                        ))}
                    </div>
                </section>

                {/* Seções de conteúdo */}
                {page.sections.map((section: any, i: number) => {
                    const Icon = section.icon;
                    return (
                        <section key={i} className="bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="bg-brasil-blue/10 dark:bg-blue-900/40 p-2.5 rounded-xl">
                                    <Icon size={24} className="text-brasil-blue dark:text-blue-400" />
                                </div>
                                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white leading-tight">
                                    {section.title}
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {section.text.split('\n\n').map((para: string, j: number) => {
                                    if (para.startsWith('•') || para.includes('\n•')) {
                                        const items = para.split('\n').filter(l => l.trim());
                                        return (
                                            <ul key={j} className="space-y-2 mt-2">
                                                {items.map((item: string, k: number) => (
                                                    <li key={k} className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                                                        <CheckCircle2 size={16} className="text-brasil-green mt-1 shrink-0" />
                                                        <span>{item.replace(/^[•\-]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        );
                                    }
                                    return (
                                        <p key={j} className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {para.split(/\*\*(.*?)\*\*/g).map((part: string, pi: number) =>
                                                pi % 2 === 1 ? <strong key={pi} className="text-gray-800 dark:text-white">{part}</strong> : part
                                            )}
                                        </p>
                                    );
                                })}
                            </div>
                        </section>
                    );
                })}

                {/* Por que escolher o Palpiteiro Mestre */}
                <section className="bg-gradient-to-br from-brasil-blue to-blue-900 rounded-2xl p-6 md:p-8 text-white shadow-lg">
                    <h2 className="text-xl md:text-2xl font-bold mb-6">Por que usar o Palpiteiro Mestre?</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            { icon: Zap, title: 'Fácil de usar', desc: 'Crie sua liga em menos de 2 minutos, sem necessidade de planilhas ou cálculos manuais.' },
                            { icon: Shield, title: '100% gratuito', desc: 'Criar e participar de ligas é totalmente grátis. Sem taxas escondidas ou cobranças surpresa.' },
                            { icon: Clock, title: 'Atualização em tempo real', desc: 'Placar e pontuação atualizados automaticamente durante os jogos.' },
                            { icon: Users, title: 'Até 15 participantes grátis', desc: 'Reúna até 15 amigos em uma liga sem pagar nada. Plano VIP para grupos maiores.' },
                        ].map((feat, i) => {
                            const FIcon = feat.icon;
                            return (
                                <div key={i} className="flex items-start gap-3 bg-white/10 rounded-xl p-4">
                                    <FIcon size={20} className="text-brasil-yellow shrink-0 mt-0.5" />
                                    <div>
                                        <div className="font-bold text-sm">{feat.title}</div>
                                        <div className="text-blue-200 text-xs mt-0.5 leading-relaxed">{feat.desc}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* FAQ */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="bg-amber-100 dark:bg-amber-900/40 p-2.5 rounded-xl">
                            <HelpCircle size={24} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                            Perguntas Frequentes
                        </h2>
                    </div>
                    <div className="space-y-4">
                        {page.faqs.map((faq: any, i: number) => (
                            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                                <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-start gap-2">
                                    <span className="text-brasil-blue dark:text-blue-400 shrink-0 font-black">Q.</span>
                                    {faq.q}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed pl-5">
                                    {faq.a}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA final */}
                <div className="text-center pt-4 pb-8">
                    <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white mb-3">
                        Pronto para começar?
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Crie sua liga agora mesmo, convide seus amigos e que o melhor palpiteiro vença!
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-brasil-blue hover:bg-blue-900 text-white font-bold px-10 py-4 rounded-xl transition-all active:scale-95 shadow-xl shadow-blue-900/20 text-lg"
                    >
                        <Trophy size={22} />
                        Criar Meu Bolão Grátis
                        <ArrowRight size={20} />
                    </Link>
                    <p className="text-xs text-gray-400 mt-3">100% gratuito • Sem necessidade de cartão de crédito</p>
                </div>

            </div>
        </div>
    );
};
