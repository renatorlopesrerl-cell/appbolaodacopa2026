import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, Users, PlayCircle, Calendar, ShieldCheck, ArrowLeft, BookOpen, X, ZoomIn, Bell, Globe, ExternalLink, Smartphone, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AdSenseBanner } from '../components/AdSenseBanner';

export const HowToPlayBrasileirao: React.FC = () => {
    const navigate = useNavigate();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCopyLink = () => {
        navigator.clipboard.writeText('https://bolaodacopa2026.app/');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10 relative">

            {/* Image Zoom Modal */}
            {selectedImage && createPortal(
                <div
                    className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors bg-white/10 p-2 rounded-full backdrop-blur-sm"
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Zoom"
                        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>, document.body
            )}

            {/* Header / Nav */}
            <div className="space-y-4">
                <button
                    onClick={() => navigate('/brasileirao')}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={18} />
                    </div>
                    Voltar
                </button>

                <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <BookOpen className="w-8 h-8 text-brasil-blue dark:text-blue-400" />
                    Como Funciona
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-10">

                {/* Intro */}
                <section className="text-center max-w-3xl mx-auto border-b border-gray-100 dark:border-gray-700 pb-10">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-4">
                        Crie sua liga e desafie seus amigos para ver quem é o melhor palpiteiro do Brasileirão, Copa do Brasil, Libertadores e Sul-Americana.
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
                            Para buscar uma liga por nome ou código vá até a página <strong>Ligas</strong>, faça a busca e assim que aparecer a liga que deseja participar, é só clicar em solicitar e aguardar o admin aceitar a solicitação. Caso queira criar uma liga clique no botão <strong>Criar Liga</strong>, vai abrir a janela de Criação de Liga. Nessa janela faça o upload de uma imagem e coloque o nome da liga que deseja (o nome da liga não poderá ser alterado no futuro). Na criação, você pode escolher <strong>quais competições</strong> farão parte da sua liga (podendo selecionar de 1 até as 4 disponíveis). Logo abaixo tem a opção de colocar uma descrição.
                        </p>
                        <p>
                            Neste modo, todas as ligas são <strong>Privadas</strong>, ou seja, para participar é necessário solicitar a entrada e aguardar a aprovação do administrador, ou receber um convite direto.
                        </p>
                        <p>
                            Por último, defina a pontuação, opção que poderá ser alterada até 24 horas antes do início do primeiro jogo. Já vem pré-configurado com:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>Placar Exato = 10 pontos</strong> (ex. palpite: 1x0, placar final: 1x0)</li>
                            <li><strong>Vencedor + Saldo = 5 pontos</strong> (ex. palpite: 1x0, placar final: 2x1)</li>
                            <li><strong>Vencedor + Gols do Vencedor = 5 pontos</strong> (ex. palpite: 2x1, placar final: 2x0)</li>
                            <li><strong>Empate Não Exato = 5 pontos</strong> (ex. palpite: 1x1, placar final: 2x2)</li>
                            <li><strong>Apenas Vencedor = 4 pontos</strong> (ex. palpite: 1x0, placar final: 2x0)</li>
                        </ul>
                        <p>
                            Caso queira utilizar apenas duas pontuações é indicado que coloque Placar Exato = 10 pontos e Todas as outras opções = 5 pontos. Mas as pontuações também podem ser definidas do jeito que quiser. Ao finalizar as configurações é só clicar em Criar que sua liga estará pronta para os palpites.
                        </p>

                        <p className="mt-2 text-sm text-blue-600 dark:text-blue-400 font-medium">
                            Se quiser deixar desativado: Vencedor + Gols do Vencedor, Vencedor + Saldo ou Empate (Não Exato) basta deixar a mesma pontuação de Apenas Vencedor.
                        </p>

                        {/* Imagens Cria Liga */}
                        <div className="grid grid-cols-2 md:flex md:justify-center gap-4 md:gap-8 mt-6">
                            <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage('/img/tutorial/cria-liga-01.jpg')}>
                                <img src="/img/tutorial/cria-liga-01.jpg" alt="Criar Liga Passo 1" className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 block w-full md:max-w-[220px] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="text-white drop-shadow-lg" size={24} />
                                </div>
                            </div>
                            <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage('/img/tutorial/cria-liga-02.jpg')}>
                                <img src="/img/tutorial/cria-liga-02.jpg" alt="Criar Liga Passo 2" className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 block w-full md:max-w-[220px] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="text-white drop-shadow-lg" size={24} />
                                </div>
                            </div>
                        </div>
                        <p>
                            Quando abrir a liga criada vai dar de cara com a opção de dar os palpites. É só palpitar quantos jogos quiser e clicar no botão <strong>Salvar Palpites</strong>. Após a confirmação, clique em <strong>Atualizar Palpites</strong> e verifique se onde estava 'Palpite Aberto' agora está 'Palpite Salvo'. Temos filtros para verificar palpites Pendentes ou Preenchidos, por Fases (Grupos ou Mata-Mata) ou por Rodada.
                        </p>
                        <p className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 mt-4 mb-4">
                            👑 <strong>Estatísticas Avançadas:</strong> Ao <strong>clicar em cima de uma partida</strong>, você terá acesso às Estatísticas do Jogo. Nela você poderá visualizar os últimos jogos de cada seleção (para analisar o momento das equipes) e também a tendência geral de vitórias, empates e derrotas baseada em dados reais. Essa funcionalidade é <strong>exclusiva para assinantes do Plano PRO</strong>.
                        </p>
                        <p>
                            O palpite de cada jogo será encerrado <strong>5 minutos antes do início da partida</strong>, ficando marcado como 'Palpite Encerrado'. É quando os participantes poderão visualizar os palpites dos adversários clicando em cima da partida. Quando iniciar a partida a pontuação poderá ser acompanhada em tempo real.
                        </p>

                        {/* Imagens Liga */}
                        <div className="grid grid-cols-2 md:flex md:justify-center gap-4 md:gap-8 mt-6">
                            <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage('/img/tutorial/liga-01.jpg')}>
                                <img src="/img/tutorial/liga-01.jpg" alt="Liga Passo 1" className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 block w-full md:max-w-[220px] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="text-white drop-shadow-lg" size={24} />
                                </div>
                            </div>
                            <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage('/img/tutorial/liga-02.jpg')}>
                                <img src="/img/tutorial/liga-02.jpg" alt="Liga Passo 2" className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 block w-full md:max-w-[220px] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="text-white drop-shadow-lg" size={24} />
                                </div>
                            </div>
                        </div>
                        <p>
                            Na aba <strong>Classificação</strong>, a pontuação geral pode ser acompanhada em tempo real. Você pode filtrar o ranking por <strong>Competição</strong>, <strong>Rodada</strong> ou <strong>Fase</strong>. Além disso, se a sua liga tiver mais de uma competição selecionada, você também terá a opção de ver a <strong>Classificação Mensal</strong>, que soma os pontos de todos os torneios mês a mês! Ao clicar em um participante, você vê todo o histórico de palpites dele (visível apenas 5 min antes do jogo).
                        </p>

                        {/* Imagens Classificação */}
                        <div className="grid grid-cols-2 md:flex md:justify-center gap-4 md:gap-8 mt-6">
                            <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage('/img/tutorial/classificacao-01.jpg')}>
                                <img src="/img/tutorial/classificacao-01.jpg" alt="Classificação Passo 1" className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 block w-full md:max-w-[220px] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="text-white drop-shadow-lg" size={24} />
                                </div>
                            </div>
                            <div className="relative group cursor-zoom-in" onClick={() => setSelectedImage('/img/tutorial/classificacao-02.jpg')}>
                                <img src="/img/tutorial/classificacao-02.jpg" alt="Classificação Passo 2" className="rounded-xl shadow-md border border-gray-200 dark:border-gray-700 block w-full md:max-w-[220px] transition-transform duration-300 group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <ZoomIn className="text-white drop-shadow-lg" size={24} />
                                </div>
                            </div>
                        </div>
                        <p>
                            Na aba <strong>Regras</strong> fica o Sistema de Pontuação e os critérios de desempate:
                            1º <strong>Maior Pontuação Total</strong>, 2º Maior número de <strong>Cravadas (Acerto Exato)</strong>, 3º Maior número de acertos em <strong>Vencedor + Saldo</strong>, 4º Maior número de acertos em <strong>Vencedor + Gols</strong> e 5º Maior número de acertos em <strong>Empates (Não Exatos)</strong>.
                            Outra regra importante: em caso de empate no tempo normal que leve à prorrogação, <strong>vale o placar final após 120 minutos</strong> (Tempo Normal + Prorrogação). Disputa de pênaltis não conta para o placar das ligas.
                        </p>
                        <p>
                            A aba <strong>Admin</strong> só aparece para o administrador da liga. É nela que ele aceita/envia convites e altera imagem/descrição. Também é onde pode fazer o Upgrade do plano da liga.
                        </p>


                    </div>
                </section>


                <hr className="border-gray-100 dark:border-gray-700" />

                {/* Tabela */}
                <section className="space-y-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                            <Calendar className="w-6 h-6 text-brasil-blue dark:text-blue-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Tabelas</h3>
                    </div>
                    <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
                        <p>
                            Temos as tabelas oficiais do Brasileirão, Copa do Brasil, Libertadores e Sul-Americana, que serão atualizadas em tempo real com datas, horários e resultados.
                        </p>
                    </div>
                </section>

                {Capacitor.getPlatform() === 'web' && (
                    <>
                        <hr className="border-gray-100 dark:border-gray-700" />
                        {/* Notificações */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-lg">
                                    <Bell className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Notificações</h3>
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify space-y-4">
                                <p>
                                    Para receber notificações na aplicação Web App do <strong>IOS no iPhone</strong>, abra o site no Safari, clique no botão de <strong>Compartilhar</strong> (quadrado com uma seta para cima) e selecione a opção <strong>Adicionar à Tela de Início</strong>.
                                </p>
                                <p>
                                    No Web App do <strong>Android</strong>, abra o site no Chrome, clique nos <strong>três pontinhos</strong> (menu) no canto superior direito e selecione <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.
                                </p>
                                <p>
                                    Após fazer o passo anterior, acesse <strong>Meu Perfil</strong> no Palpiteiro da Copa 2026, clique em <strong>Ativar Notificações</strong>, aguarde e clique em <strong>Permitir</strong>, logo após esse processo vai aparecer o botão <strong>Sincronizar este dispositivo</strong> é só clicar no botão e dar OK que a aplicação estará pronta para receber as notificações.
                                </p>
                            </div>

                            {/* Google Play Button for Web Users */}
                            <div className="flex flex-col items-center justify-center gap-3 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 mt-6">
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300 font-bold text-sm uppercase tracking-wider">
                                    <Smartphone className="w-5 h-5 text-brasil-green" />
                                    Baixe o App para Android
                                </div>
                                <a
                                    href="https://play.google.com/store/apps/details?id=app.palpiteiro"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:scale-105 transition-transform duration-300 active:scale-95"
                                >
                                    <img
                                        src="https://play.google.com/intl/en_us/badges/static/images/badges/pt-br_badge_web_generic.png"
                                        alt="Disponível no Google Play"
                                        className="h-14 w-auto drop-shadow-md"
                                    />
                                </a>
                            </div>
                        </section>
                    </>
                )}

                {Capacitor.getPlatform() === 'android' && (
                    <>
                        <hr className="border-gray-100 dark:border-gray-700" />
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                                    <Copy className="w-6 h-6 text-brasil-blue dark:text-blue-400" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Compartilhar Site</h3>
                            </div>
                            <div className="prose dark:prose-invert max-w-none text-gray-600 dark:text-gray-300 leading-relaxed text-justify">
                                <p>
                                    {copied ? 'Link copiado! Agora você pode colar no WhatsApp ou no navegador.' : 'Se você criou uma liga pelo App e quer convidar amigos que não usam Android, copie o link do nosso site oficial abaixo.'}
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-4 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800 mt-4">
                                <button
                                    onClick={handleCopyLink}
                                    className="w-full max-w-xs bg-white dark:bg-gray-800 border-2 border-brasil-blue dark:border-blue-500 text-brasil-blue dark:text-blue-400 font-bold py-3 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                                    <span className="text-sm">{copied ? 'LINK COPIADO!' : 'COPIAR BOLAODACOPA2026.APP'}</span>
                                </button>
                            </div>
                        </section>
                    </>
                )}

                {/* Banner AdSense (Web) */}
                <div className="w-full mt-6 mb-6 flex justify-center">
                    <AdSenseBanner className="w-full max-w-[728px] h-[90px]" />
                </div>

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
                            Este aplicativo tem finalidade exclusivamente recreativa e não possui vínculo com entidades organizadoras das competições (CBF, CONMEBOL, etc).
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
