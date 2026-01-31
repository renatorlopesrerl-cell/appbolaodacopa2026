import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';
import { useStore } from '../App';

export const PaymentSuccess: React.FC = () => {
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(10);
    const { fetchUserData } = useStore();

    useEffect(() => {
        // Refresh user data to check if PRO was activated
        fetchUserData();

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/');
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate, fetchUserData]);

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full border border-green-100 dark:border-green-900/30">
                <CheckCircle size={80} className="text-green-500 mx-auto mb-6" />
                <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Pagamento Aprovado!</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Parabéns! Agora você é um membro <strong>PRO</strong>.
                    Todos os recursos exclusivos foram desbloqueados.
                </p>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl mb-6">
                    <p className="text-sm font-bold text-green-700 dark:text-green-400">
                        Redirecionando em {countdown} segundos...
                    </p>
                </div>
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-brasil-green hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    Ir para o Início <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};

export const PaymentFailure: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full border border-red-100 dark:border-red-900/30">
                <XCircle size={80} className="text-red-500 mx-auto mb-6" />
                <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Pagamento Recusado</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Houve um problema ao processar seu pagamento. Nenhuma cobrança foi realizada.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                    Voltar e Tentar Novamente
                </button>
            </div>
        </div>
    );
};

export const PaymentPending: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl max-w-md w-full border border-yellow-100 dark:border-yellow-900/30">
                <Clock size={80} className="text-yellow-500 mx-auto mb-6" />
                <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Pagamento Pendente</h1>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Estamos aguardando a confirmação do seu pagamento.
                    Assim que aprovado, seu plano PRO será ativado automaticamente.
                </p>
                <button
                    onClick={() => navigate('/')}
                    className="w-full bg-brasil-blue hover:bg-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all"
                >
                    Voltar para o Início
                </button>
            </div>
        </div>
    );
};
