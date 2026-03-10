import React from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, BarChart3, Target, ArrowRight, Star } from 'lucide-react';

interface SEOLandingProps {
    variant: 'bolao' | 'simulador' | 'tabela';
}

const content = {
    bolao: {
        title: 'Bolão da Copa do Mundo 2026 – Crie ligas com amigos',
        heroTitle: 'Bolão da Copa do Mundo 2026',
        heroSubtitle: 'Crie ligas, convide amigos e dispute quem acerta mais palpites da Copa!',
        icon: Trophy,
        color: 'from-brasil-green to-emerald-600',
    },
    simulador: {
        title: 'Simulador da Copa do Mundo 2026 – Simule todos os jogos',
        heroTitle: 'Simulador da Copa 2026',
        heroSubtitle: 'Simule os resultados de todos os jogos e descubra quem pode ser campeão!',
        icon: BarChart3,
        color: 'from-brasil-blue to-blue-700',
    },
    tabela: {
        title: 'Tabela da Copa do Mundo 2026 – Jogos, Grupos e Resultados',
        heroTitle: 'Tabela da Copa 2026',
        heroSubtitle: 'Acompanhe todos os jogos, grupos e resultados em tempo real!',
        icon: Target,
        color: 'from-brasil-yellow to-amber-500',
    },
};

export const SEOLanding: React.FC<SEOLandingProps> = ({ variant }) => {
    const page = content[variant];
    const Icon = page.icon;

    return (
        <div className="min-h-[80vh] pb-16">
            {/* Hero */}
            <div className={`bg-gradient-to-br ${page.color} rounded-2xl p-8 md:p-12 mb-10 text-white relative overflow-hidden shadow-xl`}>
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-32 h-32 border-4 border-white rounded-full" />
                    <div className="absolute bottom-4 left-4 w-24 h-24 border-4 border-white rounded-full" />
                    <div className="absolute top-1/2 left-1/2 w-16 h-16 border-4 border-white rounded-full" />
                </div>
                <div className="relative z-10 max-w-3xl">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                            <Icon size={32} />
                        </div>
                        <div className="flex gap-1">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={16} className="fill-yellow-300 text-yellow-300" />
                            ))}
                        </div>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold mb-3 leading-tight">
                        {page.heroTitle}
                    </h1>
                    <p className="text-lg md:text-xl opacity-90 mb-6">
                        {page.heroSubtitle}
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-6 py-3 rounded-xl hover:bg-gray-100 transition-all active:scale-95 shadow-lg"
                    >
                        Começar Agora <ArrowRight size={20} />
                    </Link>
                </div>
            </div>

            {/* Content Sections */}
            <div className="max-w-3xl mx-auto space-y-10">
                <section>
                    <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 dark:text-white mb-4">
                        Bolão da Copa do Mundo 2026
                    </h1>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                        O Bolão da Copa 2026 permite criar ligas entre amigos para fazer palpites dos jogos da Copa do Mundo.
                        Os participantes podem prever os resultados das partidas e acompanhar a classificação em tempo real.
                    </p>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg">
                            <Users size={24} className="text-brasil-blue dark:text-blue-400" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                            Como funciona o bolão
                        </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Cada participante faz palpites antes das partidas. Palpites encerram-se 5 minutos antes de cada jogo. A pontuação é calculada automaticamente atualizando a classificação da liga em tempo real.
                    </p>
                    <ul className="mt-4 space-y-2">
                        {[
                            'Crie ligas privadas ou públicas.',
                            'Convide amigos pelo WhatsApp.',
                            'Pontuações definidas pelo administrador da liga.',
                            'Ranking em tempo real.',
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                <div className="w-1.5 h-1.5 rounded-full bg-brasil-green flex-shrink-0" />
                                {item}
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl p-6 md:p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded-lg">
                            <BarChart3 size={24} className="text-brasil-green dark:text-green-400" />
                        </div>
                        <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
                            Simulador da Copa 2026
                        </h2>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Utilize nosso simulador para prever os resultados da Copa do Mundo e descobrir quais seleções podem
                        chegar até a final.
                    </p>
                </section>

                {/* CTA */}
                <div className="text-center pt-4">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-brasil-blue hover:bg-blue-900 text-white font-bold px-8 py-4 rounded-xl transition-all active:scale-95 shadow-lg shadow-blue-900/20 text-lg"
                    >
                        <Trophy size={22} />
                        Criar Meu Bolão Grátis
                        <ArrowRight size={20} />
                    </Link>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                        100% gratuito • Sem necessidade de cartão
                    </p>
                </div>
            </div>
        </div>
    );
};
