import React from 'react';
import { ArrowLeft, UserX, ShieldAlert, Trash2, Info, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccountDeletionPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-10 max-w-4xl mx-auto p-6 text-gray-800 dark:text-gray-200">
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
                    <Trash2 className="w-8 h-8 text-red-500" />
                    Exclusão de Conta e Dados
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-8">
                {/* Intro */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 text-brasil-blue dark:text-blue-400">
                        <Info size={20} />
                        <h2 className="text-xl font-bold uppercase tracking-wide">Informações Gerais</h2>
                    </div>
                    <p className="leading-relaxed text-justify">
                        No <strong>Palpiteiro da Copa 2026</strong>, valorizamos a sua privacidade e o controle sobre seus dados. 
                        Esta página detalha como você pode solicitar a exclusão de sua conta e o que acontece com suas informações após esse processo.
                    </p>
                </section>

                {/* Steps */}
                <section className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-8">
                    <div className="flex items-center gap-2 text-brasil-blue dark:text-blue-400">
                        <UserX size={20} />
                        <h2 className="text-xl font-bold uppercase tracking-wide">Como solicitar a exclusão</h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2 italic">Opção 1: Via Aplicativo (Imediato)</h3>
                            <ol className="list-decimal pl-5 space-y-2 text-sm">
                                <li>Acesse o seu <strong>Perfil</strong> no menu inferior ou lateral.</li>
                                <li>Role até o final da página até encontrar a seção <strong>"Excluir Conta"</strong>.</li>
                                <li>Clique no botão <strong>"Quero excluir minha conta"</strong>.</li>
                                <li>Confirme a ação clicando em <strong>"Sim, excluir tudo"</strong>.</li>
                            </ol>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <h3 className="font-bold text-gray-900 dark:text-white mb-2 italic">Opção 2: Via E-mail</h3>
                            <p className="text-sm leading-relaxed mb-4">
                                Caso não tenha acesso ao aplicativo ou prefira solicitar via suporte:
                            </p>
                            <div className="flex items-center gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                                <Mail className="text-brasil-blue" size={18} />
                                <span className="font-bold text-sm select-all">palpiteirodacopa@gmail.com</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                * O prazo para processamento de solicitações via e-mail é de até <strong>7 dias úteis</strong>.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Data Details */}
                <section className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-8">
                    <div className="flex items-center gap-2 text-brasil-blue dark:text-blue-400">
                        <ShieldAlert size={20} />
                        <h2 className="text-xl font-bold uppercase tracking-wide">Tratamento de Dados</h2>
                    </div>
                    
                    <div className="space-y-6">
                        <div>
                            <h3 className="font-bold text-red-600 dark:text-red-400 mb-2">O que é EXCLUÍDO permanentemente:</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                <li><strong>Dados de Perfil:</strong> Nome, e-mail, foto e link do WhatsApp.</li>
                                <li><strong>Atividade no Jogo:</strong> Todos os seus palpites, simulações e histórico de pontuação.</li>
                                <li><strong>Participações:</strong> Sua presença em ligas (privadas ou públicas) é removida.</li>
                                <li><strong>Tokens de Comunicação:</strong> Tokens de notificação push vinculados ao seu dispositivo.</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-blue-600 dark:text-blue-400 mb-2">O que é MANTIDO (Anonimizado):</h3>
                            <ul className="list-disc pl-5 space-y-1 text-sm">
                                <li><strong>Estatísticas Globais:</strong> Dados de uso de recursos do app (sem qualquer vínculo com sua identidade) para melhoria da plataforma.</li>
                                <li><strong>Registros Legais:</strong> Podemos reter informações se exigido por lei ou ordem judicial por períodos determinados pela legislação vigente.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Footer Note */}
                <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                    <p className="text-sm text-amber-800 dark:text-amber-200 text-center font-medium">
                        <strong>Atenção:</strong> A exclusão da conta é um processo irreversível. 
                        Uma vez concluída, não será possível recuperar seus palpites ou posições em ligas de amigos.
                    </p>
                </div>
            </div>
        </div>
    );
};
