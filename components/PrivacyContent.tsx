import React from 'react';
import { useNavigate } from 'react-router-dom';

export const PrivacyContent: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="text-sm text-gray-600 dark:text-gray-300 space-y-4 text-justify leading-relaxed">
            <p>Esta Política de Privacidade descreve como coletamos, usamos e protegemos as informações dos usuários do aplicativo Simulador e Gerenciador de Palpites da Copa do Mundo 2026. Ao utilizar o aplicativo, você concorda com as práticas descritas nesta política.</p>

            <div>
                <strong className="block text-gray-800 dark:text-white mb-1">1. Coleta de Informações</strong>
                <p>Podemos coletar as seguintes informações:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                    <li>Dados de cadastro (como nome, e-mail e imagem de perfil)</li>
                    <li>Informações necessárias para criação e participação em ligas</li>
                    <li>Palpites, simulações e preferências do usuário</li>
                    <li><strong>Tokens de Comunicação:</strong> Identificadores exclusivos do seu dispositivo (tokens FCM) para viabilizar o envio de notificações push</li>
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
                <strong className="block text-gray-800 dark:text-white mb-1">5. Notificações Push</strong>
                <p>O aplicativo utiliza o serviço Firebase Cloud Messaging (FCM) para enviar alertas sobre o início/fim de jogos e lembretes de palpites. Para isso, coletamos um token exclusivo que identifica seu dispositivo. Este token não está vinculado a dados que permitam sua identificação fora do contexto deste aplicativo e pode ser revogado a qualquer momento nas configurações do seu perfil ou sistema.</p>
            </div>

            <div>
                <strong className="block text-gray-800 dark:text-white mb-1">6. Responsabilidade sobre Ligas</strong>
                <p>O aplicativo fornece apenas ferramentas para criação e gerenciamento de ligas privadas ou públicas. Quaisquer acordos, premiações ou combinações realizadas entre usuários ocorrem fora da plataforma e são de responsabilidade exclusiva dos participantes.</p>
            </div>

            <div>
                <strong className="block text-gray-800 dark:text-white mb-1">7. Alterações nesta Política</strong>
                <p>Esta Política de Privacidade pode ser atualizada a qualquer momento. As alterações entrarão em vigor imediatamente após sua publicação nesta página.</p>
            </div>

            <div>
                <strong className="block text-gray-800 dark:text-white mb-1">8. Exclusão de Conta e Dados</strong>
                <p>Você pode solicitar a exclusão de sua conta e todos os dados associados a qualquer momento diretamente pelo aplicativo (em seu Perfil) ou via e-mail. Para detalhes completos sobre o processo de exclusão, quais dados são removidos e prazos, acesse:</p>
                <button 
                    onClick={() => navigate('/exclusao-conta')}
                    className="mt-2 text-brasil-blue dark:text-blue-400 font-bold hover:underline flex items-center gap-1"
                >
                    🔗 Informações sobre Exclusão de Conta
                </button>
            </div>

            <div>
                <strong className="block text-gray-800 dark:text-white mb-1">9. Contato</strong>
                <p>Em caso de dúvidas ou solicitações relacionadas a esta Política de Privacidade, entre em contato pelo e-mail:</p>
                <p className="font-bold text-brasil-blue dark:text-blue-400 mt-1">📧 palpiteirodacopa@gmail.com</p>
            </div>
        </div>
    );
};
