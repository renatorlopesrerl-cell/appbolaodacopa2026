import React from 'react';
import { ArrowLeft, BookOpen, Calendar, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export const BLOG_POSTS = [
    {
        id: 'resumo-primeiro-turno-brasileirao-2026',
        title: 'Análise Completa: O que marcou o 1º Turno do Brasileirão?',
        description: 'Chegamos ao fim da primeira metade do Campeonato Brasileiro. Confira os destaques, decepções e favoritos para o título.',
        date: '21 de Julho de 2026',
        category: 'Brasileirão',
        imageUrl: '/img/blog/brasileirao_cover.jpg'
    },
    {
        id: 'resumo-final-copa-do-mundo-2026',
        title: 'Tudo o que aconteceu na Grande Final da Copa do Mundo 2026',
        description: 'A Copa do Mundo chegou ao fim neste domingo com uma final histórica. Reveja os melhores momentos, artilharia e o legado do torneio.',
        date: '20 de Julho de 2026',
        category: 'Copa do Mundo',
        imageUrl: '/img/blog/worldcup_cover.jpg'
    },
    {
        id: 'resumo-fase-de-grupos-libertadores-2026',
        title: 'Libertadores 2026: Resumo da Fase de Grupos e Oitavas de Final',
        description: 'A fase de grupos terminou definindo os 16 clubes classificados para o mata-mata de agosto. Confira todos os confrontos.',
        date: '21 de Julho de 2026',
        category: 'Libertadores',
        imageUrl: '/img/blog/libertadores_cover.png'
    },
    {
        id: 'resumo-fase-de-grupos-sulamericana-2026',
        title: 'Sul-Americana 2026: Destaques da Fase de Grupos e Classificados',
        description: 'Com grande participação brasileira, conheça os líderes e os classificados para a próxima fase da Sul-Americana.',
        date: '21 de Julho de 2026',
        category: 'Sul-Americana',
        imageUrl: '/img/blog/sulamericana_cover.png'
    }
];

export const BlogPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] animate-in fade-in zoom-in-95 duration-500 pb-10 px-4">
            <div className="w-full max-w-4xl">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-6 group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={18} />
                    </div>
                    Voltar
                </button>

                <div className="mb-8">
                    <h1 className="text-4xl font-black text-gray-800 dark:text-white flex items-center gap-3">
                        <BookOpen className="text-brasil-blue" size={36} />
                        Blog & Notícias
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 mt-2 text-lg">
                        Acompanhe as últimas análises, dicas de palpites e resumos dos campeonatos.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {BLOG_POSTS.map(post => (
                        <Link 
                            key={post.id} 
                            to={`/blog/${post.id}`}
                            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl hover:border-brasil-blue transition-all group flex flex-col"
                        >
                            <div className="h-48 overflow-hidden relative">
                                <img 
                                    src={post.imageUrl} 
                                    alt={post.title} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-4 left-4 bg-brasil-blue text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                    {post.category}
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex items-center text-xs font-bold text-gray-400 mb-3 gap-1">
                                    <Calendar size={14} /> {post.date}
                                </div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2 line-clamp-2">
                                    {post.title}
                                </h2>
                                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3">
                                    {post.description}
                                </p>
                                <div className="mt-auto flex items-center text-brasil-blue font-bold text-sm group-hover:text-blue-700 transition-colors">
                                    Ler artigo completo <ChevronRight size={16} className="ml-1" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
