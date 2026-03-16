import React from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PrivacyContent } from '../components/PrivacyContent';

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
                <PrivacyContent />
            </div>
        </div>
    );
};
