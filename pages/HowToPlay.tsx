import React from 'react';
import { Trophy, Users, PlayCircle, Calendar, ShieldCheck, ArrowLeft, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HowToPlay: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10">

            {/* Header / Nav */}
            <div className="space-y-4">
                <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={18} />
                    </div>
                    Voltar
                </button>

                <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-brasil-blue dark:text-blue-400" />
                    Como Jogar
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-10">

                {/* Intro */}
                <section className="text-center max-w-3xl mx-auto border-b border-gray-100 dark:border-gray-700 pb-10">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-4">
                        Crie sua liga e desafie seus amigos para ver quem é o melhor palpiteiro da Copa do Mundo Fifa 2026.
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Abaixo você encontra todas as regras e instruções para aproveitar ao máximo a plataforma.
                    </p>
                </section>

                {/* Ligas */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg">
                            <Users className="w-6 h-6 text-brasil-green dark:text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Ligas</h3>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify space-y-4">
                        <p>
                            Para buscar uma liga por nome ou código vá até a página <strong>Ligas</strong>, caso queira criar uma liga clique no botão <strong>Criar Liga</strong>, vai abrir a janela de Criação de Liga. Nessa janela faça o upload de uma imagem e coloque o nome da liga que deseja (o nome da liga não poderá ser alterado no futuro). Logo abaixo tem a opção de colocar uma descrição.
                        </p>
                        <p>
                            Existem dois tipos de liga: a <strong>Privada</strong> (que já vem marcada), em que o usuário tem que solicitar convite para entrar na liga ou ser convidado pelo administrador; e a <strong>Pública</strong> (se deixar desmarcado), onde qualquer usuário pode entrar sem precisar de solicitação.
                        </p>
                        <p>
                            Por último, defina a pontuação, opção que também não poderá ser alterada no futuro. Já vem pré-configurado com:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Placar Exato = 10 pontos</strong> (ex. palpite: 1x0, placar final: 1x0)</li>
                            <li><strong>Vencedor + SG (Saldo de Gols) = 7 pontos</strong> (ex. palpite: 1x0, placar final: 2x1)</li>
                            <li><strong>Empate Não Exato = 7 pontos</strong> (ex. palpite: 1x1, placar final: 2x2)</li>
                            <li><strong>Apenas Vencedor = 5 pontos</strong> (ex. palpite: 1x0, placar final: 2x0)</li>
                        </ul>
                        <p>
                            Caso queira utilizar apenas duas pontuações é indicado que coloque Placar Exato = 10 pontos e Todas as outras opções = 5 pontos. Mas as pontuações também podem ser definidas do jeito que quiser. Ao finalizar as configurações é só clicar em Criar que sua liga estará pronta para os palpites.
                        </p>
                        <p>
                            Quando abrir a liga criada vai dar de cara com a opção de dar os palpites. É só palpitar quantos jogos quiser e clicar no botão <strong>Salvar Palpites</strong>. Após a confirmação, clique em <strong>Atualizar Palpites</strong> e verifique se onde estava 'Palpite Aberto' agora está 'Palpite Salvo'. Temos filtros para verificar palpites Pendentes ou Preenchidos, por Fases (Grupos ou Mata-Mata) ou por Rodada.
                        </p>
                        <p>
                            O palpite de cada jogo será encerrado <strong>5 minutos antes do início da partida</strong>, ficando marcado como 'Palpite Encerrado'. É quando os participantes poderão visualizar os palpites dos adversários clicando em cima da partida. Quando iniciar a partida a pontuação poderá ser acompanhada em tempo real.
                        </p>
                        <p>
                            Na aba <strong>Classificação</strong>, a pontuação geral pode ser acompanhada em tempo real, com opção de visualizar Pontuação Total, por Rodada, Fase de Grupos completa ou Mata-Mata completo. Ao clicar em um participante, você vê todo o histórico de palpites dele (visível apenas 5 min antes do jogo).
                        </p>
                        <p>
                            Na aba <strong>Regras</strong> fica o Sistema de Pontuação e os critérios de desempate:
                            1º Maior Pontuação Total, 2º Maior número de Cravadas (Acerto Exato) e 3º Maior pontuação no Mata-Mata.
                            Outra regra importante: em caso de empate no tempo normal que leve à prorrogação, <strong>vale o placar final após 120 minutos</strong> (Tempo Normal + Prorrogação). Disputa de pênaltis não conta para o placar das ligas.
                        </p>
                        <p>
                            A aba <strong>Admin</strong> só aparece para o administrador da liga. É nela que ele aceita/envia convites, altera imagem/descrição e muda entre Privada/Pública. Também é onde pode fazer o Upgrade do plano da liga.
                        </p>
                    </div>
                </section>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Simulador */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                            <PlayCircle className="w-6 h-6 text-brasil-blue dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Simulador</h3>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify space-y-4">
                        <p>
                            O diferencial da aplicação é que temos um Simulador, onde os usuários podem preencher os placares das partidas e ver a classificação projetada, descobrindo qual seleção irá se classificar. Após preencher todos os jogos, também é possível simular o Mata-Mata até a Final.
                        </p>
                        <p>
                            A qualquer momento clique no botão <strong>Salvar</strong> para guardar a simulação no banco de dados. Você também pode importar palpites de uma liga para o simulador e exportar do simulador para uma liga.
                        </p>
                        <p>
                            Ao <strong>Exportar para ligas</strong>, selecione a liga destino e clique em enviar. Todos os palpites da simulação serão salvos na liga (substituindo os existentes, se houver). Você pode exportar tudo, ou filtrar por grupo/fase. Sempre verifique na liga se os palpites foram salvos corretamente.
                        </p>
                        <p>
                            O botão <strong>Limpar</strong> reseta a simulação. O botão <strong>Sincronizar Jogos Finalizados</strong> atualiza a simulação com os placares reais dos jogos que já terminaram, fazendo o simulador funcionar como uma "Tabela de Bolso".
                        </p>
                    </div>
                </section>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Tabela */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg">
                            <Calendar className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Tabela</h3>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
                        <p>
                            Caso não queira usar o Simulador, também temos a tabela oficial da Copa do Mundo Fifa 2026, que será atualizada em tempo real com datas, horários e resultados.
                        </p>
                    </div>
                </section>

                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Informativo Legal */}
                <section className="space-y-4 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-gray-200 dark:bg-gray-700 p-2 rounded-lg">
                            <ShieldCheck className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white">Informativo Legal</h3>
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 text-justify leading-relaxed">
                        <p>
                            Este aplicativo tem finalidade exclusivamente recreativa e não possui vínculo com entidades organizadoras da Copa do Mundo 2026.
                            Não promovemos apostas financeiras. A gestão de ligas e premiações (se houver) é de total responsabilidade dos criadores e participantes de cada liga.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 pt-2">
                            <a href="/termos" className="text-brasil-blue dark:text-blue-400 font-bold hover:underline">
                                Termos de Uso
                            </a>
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
};
