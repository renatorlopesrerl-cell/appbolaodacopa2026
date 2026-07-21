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
                                    
                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Uma Despedida em Grande Estilo</h2>
                                    <p className="mb-6">
                                        A Copa do Mundo de 2026 (realizada na América do Norte: EUA, Canadá e México) encerrou neste domingo, consagrando não apenas os vencedores em campo, mas também o sucesso do novo formato expandido com 48 seleções. Durante todo o torneio, testemunhamos zebras incríveis, gols antológicos e despedidas emocionantes de lendas do futebol que provavelmente pisaram no palco mundial pela última vez.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">O Caminho até a Final</h2>
                                    <p className="mb-6">
                                        O domingo foi coroado com um embate tático digno de entrar para os livros de história. Ambas as seleções finalistas mostraram resiliência ao longo de um mês exaustivo de competições. A partida de domingo foi tensa, com defesas sólidas e contra-ataques fulminantes. Quem acertou o placar no simulador do Palpiteiro da Copa 2026, com certeza, disparou nos pontos.
                                    </p>

                                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Destaques e Premiações</h2>
                                    <p className="mb-6">
                                        Além da taça, os prêmios individuais refletiram o que aconteceu no torneio. A artilharia foi disputada gol a gol, com o prêmio de chuteira de ouro sendo decidido quase nos acréscimos das partidas decisivas. O torneio também nos apresentou revelações fantásticas de países que tradicionalmente não chegavam tão longe na competição.
                                    </p>
                                    
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-8 mb-4">Legado para 2030</h3>
                                    <p className="mb-6">
                                        Com o apito final no domingo, as atenções já começam a se virar lentamente para a Copa do Mundo de 2030, que celebrará o centenário do torneio. Até lá, continuaremos simulando e palpitando nos campeonatos locais. Parabéns a todos os campeões das ligas privadas aqui no Palpiteiro Mestre!
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
