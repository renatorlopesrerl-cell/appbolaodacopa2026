import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PrivacyPage: React.FC = () => {
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
                    <Lock className="w-8 h-8 text-brasil-blue dark:text-blue-400" />
                    Política de Privacidade
                </h1>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 md:p-10 space-y-6">
                <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 text-justify leading-relaxed">
                    <p>Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações dos usuários do aplicativo Simulador e Gerenciador de Palpites da Copa do Mundo 2026. Ao utilizar o aplicativo, você concorda com as práticas descritas nesta política.</p>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">1. Coleta de Informações</strong>
                        <p>Podemos coletar as seguintes informações:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Dados de cadastro (como nome, e-mail e imagem de perfil)</li>
                            <li>Informações necessárias para criação e participação em ligas</li>
                            <li>Palpites, simulações e preferências do usuário</li>
                            <li>Dados técnicos, como tipo de dispositivo, navegador e endereço IP (de forma anonimizada)</li>
                        </ul>
                        <p className="mt-1">Não coletamos dados sensíveis além do necessário para o funcionamento do aplicativo.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">2. Uso das Informações</strong>
                        <p>As informações coletadas são utilizadas para:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Permitir o funcionamento das ligas e simulador</li>
                            <li>Identificar usuários e autenticar acessos</li>
                            <li>Salvar palpites, simulações e classificações</li>
                            <li>Melhorar a experiência do usuário</li>
                            <li>Garantir segurança e prevenção de uso indevido</li>
                        </ul>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">3. Armazenamento e Segurança</strong>
                        <p>As informações são armazenadas em servidores seguros e protegidas por medidas técnicas e organizacionais adequadas para evitar acesso não autorizado, perda, alteração ou divulgação indevida.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">4. Compartilhamento de Informações</strong>
                        <p>Não vendemos, alugamos ou compartilhamos informações pessoais com terceiros, exceto:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-1">
                            <li>Quando exigido por obrigação legal</li>
                            <li>Para cumprir ordens judiciais</li>
                            <li>Para proteger nossos direitos, usuários ou a integridade da plataforma</li>
                        </ul>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">5. Responsabilidade sobre Ligas</strong>
                        <p>O aplicativo fornece apenas ferramentas para criação e gerenciamento de ligas privadas ou públicas. Quaisquer acordos, premiações ou combinações realizadas entre usuários ocorrem fora da plataforma e são de responsabilidade exclusiva dos participantes.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">6. Alterações nesta Política</strong>
                        <p>Esta Política de Privacidade pode ser atualizada a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação nesta página.</p>
                    </div>

                    <div>
                        <strong className="block text-gray-800 dark:text-white mb-1">7. Contato</strong>
                        <p>Em caso de dúvidas ou solicitações relacionadas a esta Política de Privacidade, entre em contato pelo e-mail:</p>
                        <p className="font-bold text-brasil-blue dark:text-blue-400 mt-1">📧 renatorlopes.rerl@gmail.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
