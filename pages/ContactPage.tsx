import React from 'react';
import { ArrowLeft, Mail, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

export const ContactPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] animate-in fade-in zoom-in-95 duration-500 pb-10 px-4">
            <div className="w-full max-w-3xl">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-sm font-bold text-brasil-blue hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mb-6 group"
                >
                    <div className="bg-blue-50 dark:bg-gray-800 p-1.5 rounded-full group-hover:bg-blue-100 dark:group-hover:bg-gray-700">
                        <ArrowLeft size={18} />
                    </div>
                    Voltar
                </button>

                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
                    <div className="bg-gradient-to-r from-brasil-blue to-blue-900 p-8 text-white">
                        <div className="bg-white/20 w-16 h-16 flex items-center justify-center rounded-2xl mb-4 backdrop-blur-sm">
                            <MessageSquare size={32} />
                        </div>
                        <h1 className="text-3xl font-black mb-2">Fale Conosco</h1>
                        <p className="text-blue-100">Tem dúvidas, sugestões ou problemas? Entre em contato com a equipe do Palpiteiro Mestre.</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-brasil-yellow/20 text-yellow-700 dark:text-yellow-400 p-3 rounded-xl mt-1">
                                <Mail size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 dark:text-white">E-mail de Suporte</h2>
                                <p className="text-gray-600 dark:text-gray-300 mb-2">Para qualquer tipo de suporte, envie um e-mail para:</p>
                                <a 
                                    href="mailto:palpiteirodacopa@gmail.com" 
                                    className="text-lg font-black text-brasil-blue hover:underline bg-blue-50 dark:bg-gray-700/50 px-4 py-2 rounded-lg inline-block"
                                >
                                    palpiteirodacopa@gmail.com
                                </a>
                                <p className="text-sm text-gray-500 mt-4">
                                    Nossa equipe responderá o mais rápido possível. O horário de atendimento é de segunda a sexta, em horário comercial.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {Capacitor.getPlatform() === 'web' && (
                    <div className="mt-8 text-center text-sm text-gray-500">
                        <p>O Palpiteiro Mestre é uma plataforma de entretenimento não afiliada a organizações oficiais de futebol.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
