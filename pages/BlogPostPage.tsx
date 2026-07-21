import React from 'react';
import { ArrowLeft, Calendar, User } from 'lucide-react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { BLOG_POSTS } from './BlogPage';

export const BlogPostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const post = BLOG_POSTS.find(p => p.id === id);

    if (!post) {
        return <Navigate to="/blog" />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] animate-in fade-in zoom-in-95 duration-500 pb-16 px-4">
            <div className="w-full max-w-3xl">
                <button
                    onClick={() => navigate('/blog')}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-6 group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={18} />
                    </div>
                    Voltar para Notícias
                </button>

                <article className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="h-64 md:h-96 w-full relative">
                        <img 
                            src={post.imageUrl} 
                            alt={post.title} 
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-6 left-6 right-6">
                            <span className="bg-brasil-blue text-white text-xs font-bold px-3 py-1 rounded-full shadow-md mb-3 inline-block">
                                {post.category}
                            </span>
                            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
                                {post.title}
                            </h1>
                        </div>
                    </div>

                    <div className="p-6 md:p-10">
                        <div className="flex items-center gap-6 border-b border-gray-100 dark:border-gray-700 pb-6 mb-8 text-sm font-bold text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                                <Calendar size={16} /> {post.date}
                            </div>
                            <div className="flex items-center gap-2">
                                <User size={16} /> Equipe Palpiteiro Mestre
                            </div>
                        </div>

                        <div className="prose prose-lg dark:prose-invert max-w-none text-gray-700 dark:text-gray-300">
                            {post.id === 'resumo-primeiro-turno-brasileirao-2026' && (
                                <>
                                    <p className="lead text-xl text-gray-600 dark:text-gray-400 font-medium mb-8">
                                        {post.description}
                                    </p>
                                    
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">A Disputa Acirrada pelo Título</h2>
                                    <p className="mb-6">
                                        Chegamos ao momento decisivo da primeira metade da competição. O Campeonato Brasileiro de 2026, com o primeiro turno finalizando exatamente nesta semana, provou mais uma vez ser um dos campeonatos mais equilibrados e imprevisíveis do mundo. Equipes que iniciaram a temporada com grande favoritismo enfrentaram tropeços surpreendentes, enquanto "azarões" conquistaram vitórias fundamentais em casa.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Quem se destacou?</h2>
                                    <p className="mb-6">
                                        A consistência defensiva e o aproveitamento nas finalizações foram a chave do sucesso para as equipes no topo da tabela. A estratégia de pontuar fora de casa e não desperdiçar chances diante dos seus torcedores separou os postulantes ao título dos que lutam no meio da tabela. O nível tático e físico da competição atingiu o seu pico.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">A Importância dos Palpites no 2º Turno</h2>
                                    <p className="mb-6">
                                        Com o returno se aproximando, a pressão aumenta e o cenário muda. Times focarão em se recuperar, o mercado de transferências trará novos nomes e a tensão da zona de rebaixamento fará os clubes jogarem a vida em cada partida. Para você, que participa das Ligas do <strong>Palpiteiro Mestre</strong>, a dica de ouro é: observe o desgaste do elenco. Clubes divididos com as copas internacionais tendem a poupar jogadores no Brasileirão. Use isso a seu favor nas suas apostas!
                                    </p>
                                    
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Estatísticas Chave do 1º Turno:</h3>
                                    <ul className="list-disc pl-6 space-y-2 mb-8">
                                        <li>Média de gols mantida alta devido à ofensividade dos sistemas táticos atuais.</li>
                                        <li>Alto número de vitórias dos times mandantes, reforçando o peso das torcidas.</li>
                                        <li>Equipes poupando jogadores nas rodadas de meio de semana.</li>
                                    </ul>
                                </>
                            )}

                            {post.id === 'resumo-final-copa-do-mundo-2026' && (
                                <>
                                    <p className="lead text-xl text-gray-600 dark:text-gray-400 font-medium mb-8">
                                        {post.description}
                                    </p>
                                    
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Um Novo Formato, Uma Nova Era</h2>
                                    <p className="mb-6">
                                        A Copa do Mundo de 2026 já começou marcando uma mudança histórica no futebol mundial. Pela primeira vez, o torneio reuniu <strong>48 seleções</strong>, substituindo o modelo anterior de 32 equipes e ampliando o alcance da competição. A edição também inaugurou um formato inédito, sendo disputada simultaneamente nos Estados Unidos, no México e no Canadá. Foram 104 partidas disputadas, onde vimos grandes favoritos confirmando a força e muitas zebras impressionando o mundo.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">A Grande Final: Espanha Bicampeã</h2>
                                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Espanha 1 x 0 Argentina</h3>
                                    <p className="mb-6">
                                        A Espanha derrotou a Argentina por 1 a 0 na prorrogação, no MetLife Stadium, em Nova Jersey, e conquistou pela segunda vez a Copa do Mundo. Superior durante praticamente toda a decisão, a equipe espanhola controlou a posse de bola e criou as principais oportunidades. A Argentina ainda perdeu Enzo Fernández, expulso no segundo tempo. O gol do título saiu no início da segunda etapa da prorrogação, com Ferran Torres completando para as redes e garantindo a taça.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Disputa do 3º Lugar: Chuva de Gols</h2>
                                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Inglaterra 6 x 4 França</h3>
                                    <p className="mb-6">
                                        A Inglaterra venceu a França por 6 a 4 no Hard Rock Stadium, em Miami, e encerrou a Copa na terceira colocação. Os ingleses dominaram o primeiro tempo, abrindo 4 a 0 com gols de Rice, Konsa e Saka (duas vezes). Na etapa final, a França reagiu com dois gols de Mbappé — que chegou a dez gols e assumiu a liderança da artilharia do torneio. Nos minutos finais, Saka completou seu hat-trick e Bellingham fechou o placar.
                                    </p>
                                    
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">O Caminho até a Final (Semifinais)</h2>
                                    <ul className="list-disc pl-6 space-y-4 mb-8">
                                        <li>
                                            <strong>Argentina 2 x 1 Inglaterra:</strong> Os ingleses abriram o placar com Gordon, mas a Argentina aumentou a pressão, empatou com um chutaço de Enzo Fernández e buscou a virada nos minutos finais, com Lautaro Martínez após um cruzamento perfeito de Lionel Messi.
                                        </li>
                                        <li>
                                            <strong>Espanha 2 x 0 França:</strong> A Fúria dominou desde os minutos iniciais. Oyarzabal converteu um pênalti e Pedro Porro ampliou, consolidando a superioridade da equipe e neutralizando a seleção francesa, que esbarrou na sólida marcação espanhola.
                                        </li>
                                    </ul>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Destaques do Mata-Mata</h2>
                                    <p className="mb-6">
                                        Esta edição nos trouxe partidas memoráveis desde as oitavas. O Brasil acabou caindo precocemente para a Noruega (2x1) com uma atuação decisiva de Erling Haaland. O Marrocos, zebra em 2022, mostrou força novamente e chegou às quartas após golear o Canadá. Portugal e Alemanha sofreram eliminações dolorosas, mostrando o incrível equilíbrio da competição. A Copa encerrou com uma chuva de emoções, e quem jogou no simulador do <strong>Palpiteiro Mestre</strong> sentiu na pele cada surpresa!
                                    </p>
                                </>
                            )}
                            {post.id === 'resumo-fase-de-grupos-libertadores-2026' && (
                                <>
                                    <p className="lead text-xl text-gray-600 dark:text-gray-400 font-medium mb-8">
                                        {post.description}
                                    </p>
                                    
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">O Fim da Fase de Grupos</h2>
                                    <p className="mb-6">
                                        A fase de grupos da Libertadores 2026 terminou em maio, definindo os 16 clubes classificados para o mata-mata. O destaque absoluto ficou para o domínio de <strong>Flamengo</strong> e <strong>Independiente Rivadavia</strong> com impressionantes 16 pontos cada, além da classificação de seis equipes brasileiras para as oitavas de final.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Resumo por Chave</h2>
                                    <p className="mb-6">
                                        O chaveamento para a próxima etapa, que será disputada em agosto após a pausa para a Copa do Mundo, já foi definido pela Conmebol. Confira como ficou cada grupo:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-4 mb-8">
                                        <li><strong>Grupo A:</strong> O Flamengo sobrou com 16 pontos, seguido pelo Estudiantes (9 pontos). O Deportivo Independiente Medellín e o Cusco foram eliminados.</li>
                                        <li><strong>Grupo B:</strong> Equilibrado, teve o Coquimbo Unido na ponta (10 pontos), seguido por Tolima, Nacional e Universitario.</li>
                                        <li><strong>Grupo C:</strong> O Independiente Rivadavia fez uma campanha perfeita com 16 pontos, avançando com o Fluminense (8 pontos).</li>
                                        <li><strong>Grupo D:</strong> A Universidad Católica (13 pontos) e o Cruzeiro (11 pontos) avançaram. Boca Juniors e Barcelona de Guayaquil ficaram de fora.</li>
                                        <li><strong>Grupo E:</strong> O Corinthians avançou em primeiro com 11 pontos, junto ao Platense (10 pontos). Santa Fé e Peñarol deram adeus.</li>
                                        <li><strong>Grupo F:</strong> O Cerro Porteño liderou (13 pontos) e o Palmeiras passou em segundo (11 pontos).</li>
                                        <li><strong>Grupo G:</strong> A LDU (12 pontos) e o Mirassol (12 pontos) garantiram a classificação, deixando o Lanús e o Always Ready pelo caminho.</li>
                                        <li><strong>Grupo H:</strong> Um grupo disputado que terminou com o Independiente del Valle e o Rosario Central empatados em pontos (13 cada).</li>
                                    </ul>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Confrontos das Oitavas de Final</h2>
                                    <p className="mb-6">
                                        A competição está pausada devido à Copa do Mundo, mas a ansiedade já toma conta. Os confrontos eliminatórios agendados para o mês de agosto prometem fortes emoções, veja os embates:
                                    </p>
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8">
                                        <ul className="space-y-3 font-bold text-gray-700 dark:text-gray-300">
                                            <li className="flex items-center gap-2">⚔️ Cruzeiro x Flamengo</li>
                                            <li className="flex items-center gap-2">⚔️ Corinthians x Rosario Central</li>
                                            <li className="flex items-center gap-2">⚔️ Palmeiras x Cerro Porteño</li>
                                            <li className="flex items-center gap-2">⚔️ Fluminense x Independiente Rivadavia</li>
                                            <li className="flex items-center gap-2">⚔️ Mirassol x LDU</li>
                                            <li className="flex items-center gap-2">⚔️ Estudiantes x Universidad Católica</li>
                                            <li className="flex items-center gap-2">⚔️ Tolima x Independiente del Valle</li>
                                            <li className="flex items-center gap-2">⚔️ Platense x Coquimbo Unido</li>
                                        </ul>
                                    </div>
                                    <p className="mb-6 text-sm text-gray-500 italic">
                                        Não se esqueça de acessar a aba da Libertadores no <strong>Palpiteiro Mestre</strong> e já deixar seus pitacos para esses jogões de agosto!
                                    </p>
                                </>
                            )}

                            {post.id === 'resumo-fase-de-grupos-sulamericana-2026' && (
                                <>
                                    <p className="lead text-xl text-gray-600 dark:text-gray-400 font-medium mb-8">
                                        {post.description}
                                    </p>
                                    
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">A Fase de Grupos da Copa Sul-Americana</h2>
                                    <p className="mb-6">
                                        A fase de grupos da Copa Sul-Americana 2026 ocorreu de abril a maio. Os 16 vencedores da etapa anterior se juntaram aos times do Brasil e da Argentina e aos eliminados da Libertadores, formando os oito grupos (A a H). Os clubes jogaram em sistema de turno e returno.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Resumo das Chaves</h2>
                                    <p className="mb-6">
                                        As equipes brasileiras tiveram uma excelente participação no geral, conquistando grandes resultados. Apenas os líderes de cada grupo avançaram diretamente para as oitavas de final (pote 1). Confira como terminaram:
                                    </p>
                                    <ul className="list-disc pl-6 space-y-4 mb-8 text-gray-700 dark:text-gray-300">
                                        <li><strong>Grupo A:</strong> O Macará (EQU) avançou em 1º (10 pontos), seguido pelo Tigre (ARG) em 2º.</li>
                                        <li><strong>Grupo B:</strong> O Atlético-MG (BRA) liderou a chave com 10 pontos, enquanto o Cienciano (PER) avançou em 2º.</li>
                                        <li><strong>Grupo C:</strong> O São Paulo (BRA) terminou invicto em 1º (12 pontos) e o O'Higgins (CHI) ficou em 2º.</li>
                                        <li><strong>Grupo D:</strong> O Recoleta (PAR) surpreendeu e garantiu o 1º lugar, com o Santos (BRA) ficando em 2º.</li>
                                        <li><strong>Grupo E:</strong> O Botafogo (BRA) fez a melhor campanha geral com 16 pontos e 100% de aproveitamento, seguido pelo Caracas (VEN).</li>
                                        <li><strong>Grupo F:</strong> O Montevideo City Torque (URU) ficou com a ponta (13 pontos), e o Grêmio (BRA) avançou em 2º (11 pontos).</li>
                                        <li><strong>Grupo G:</strong> O Olimpia (PAR) liderou (13 pontos) e o Vasco da Gama (BRA) passou em 2º.</li>
                                        <li><strong>Grupo H:</strong> O River Plate (URU) terminou em 1º, acompanhado pelo Red Bull Bragantino (BRA) na 2ª colocação.</li>
                                    </ul>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">O que vem a seguir: Playoffs (Repescagem)</h2>
                                    <p className="mb-6">
                                        Os vice-líderes avançaram para os Playoffs, onde disputam o mata-mata contra os terceiros colocados que foram eliminados da Libertadores. Os playoffs agitam a tabela com grandes confrontos, especialmente envolvendo times brasileiros que buscam a vaga nas oitavas:
                                    </p>
                                    
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 mb-8">
                                        <ul className="space-y-3 font-bold text-gray-700 dark:text-gray-300">
                                            <li className="flex items-center gap-2">⚽ Grêmio x Bolívar (BOL)</li>
                                            <li className="flex items-center gap-2">⚽ Red Bull Bragantino x Sporting Cristal (PER)</li>
                                            <li className="flex items-center gap-2">⚽ Vasco da Gama x Independiente Medellín (COL)</li>
                                            <li className="flex items-center gap-2">⚽ Santos x Universidad Central (VEN)</li>
                                            <li className="flex items-center gap-2">⚽ Tigre (ARG) x Nacional (URU)</li>
                                            <li className="flex items-center gap-2">⚽ Caracas (VEN) x Independiente Santa Fe (COL)</li>
                                        </ul>
                                    </div>

                                    <p className="mb-6 text-sm text-gray-500 italic">
                                        Dentre as equipes tradicionais, o Independiente (ARG) teve um desempenho decepcionante, terminando na lanterna de sua chave sem somar pontos. Acompanhe a Sul-Americana no <strong>Palpiteiro Mestre</strong> e teste seus conhecimentos nos playoffs!
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </article>
            </div>
        </div>
    );
};
