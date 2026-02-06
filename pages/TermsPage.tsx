import React from 'react';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TermsPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10 max-w-4xl mx-auto p-6">
            <div className="space-y-4">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={18} />
                    </div>
                    Voltar
                </button>
                <h1 className="text-2xl md:text-3xl font-black text-gray-800 dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <ShieldCheck className="w-8 h-8 text-brasil-blue dark:text-blue-400" />
                    Termos de Uso
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-6">
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 text-justify leading-relaxed">
                    <p>Ao acessar ou utilizar o aplicativo, você concorda com os termos abaixo.</p>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">1. Finalidade do Aplicativo</strong>
                        <p>O aplicativo tem finalidade exclusivamente recreativa e informativa, oferecendo:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Criação e gerenciamento de ligas</li>
                            <li>Registro de palpites esportivos</li>
                            <li>Simulação de resultados e classificações</li>
                            <li>Visualização de tabelas e estatísticas</li>
                        </ul>
                        <p className="mt-1">O aplicativo não realiza, intermedia ou incentiva apostas financeiras.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">2. Cadastro e Conta</strong>
                        <p>O usuário é responsável por:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Fornecer informações verdadeiras</li>
                            <li>Manter a confidencialidade de sua conta</li>
                            <li>Todas as atividades realizadas em sua conta</li>
                        </ul>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">3. Ligas e Conteúdo Gerado por Usuários</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>As ligas podem ser públicas ou privadas</li>
                            <li>O administrador da liga define regras e pontuação no momento da criação</li>
                            <li>O aplicativo não interfere nas decisões internas das ligas</li>
                        </ul>
                        <p className="mt-1">Qualquer premiação, acordo ou combinação entre participantes ocorre fora da plataforma e é de responsabilidade exclusiva dos envolvidos.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">4. Palpites e Prazos</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Os palpites podem ser realizados até 5 minutos antes do início da partida</li>
                            <li>Após esse prazo, os palpites são automaticamente encerrados</li>
                            <li>Os palpites dos participantes tornam-se visíveis a partir do encerramento dos palpites.</li>
                        </ul>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">5. Simulador</strong>
                        <p>O simulador permite ao usuário prever resultados e classificações de forma hipotética. Os resultados simulados não representam resultados oficiais.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">6. Plano Gratuito e Plano VIP</strong>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>O aplicativo pode oferecer funcionalidades gratuitas e recursos adicionais pagos</li>
                            <li>O plano VIP concede acesso a recursos extras, como aumento de participantes por liga e funcionalidades avançadas</li>
                            <li>A liberação do plano VIP refere-se exclusivamente ao acesso a funcionalidades do aplicativo</li>
                        </ul>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">7. Propriedade Intelectual</strong>
                        <p>Todo o conteúdo, design, funcionalidades e código do aplicativo são protegidos por direitos autorais. É proibida a reprodução ou uso indevido sem autorização.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">8. Limitação de Responsabilidade</strong>
                        <p>O aplicativo não se responsabiliza por:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Resultados esportivos reais</li>
                            <li>Decisões tomadas com base em simulações</li>
                            <li>Conflitos entre usuários</li>
                            <li>Acordos realizados fora da plataforma</li>
                        </ul>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">9. Alterações nos Termos</strong>
                        <p>Os Termos de Uso podem ser alterados a qualquer momento. O uso contínuo do aplicativo após alterações implica aceitação dos novos termos.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">10. Contato</strong>
                        <p>Para dúvidas, sugestões ou solicitações:</p>
                        <p className="font-bold text-brasil-blue dark:text-blue-400 mt-1">📧 renatorlopes.rerl@gmail.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
