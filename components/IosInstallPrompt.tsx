import React, { useState, useEffect } from 'react';
import { X, Share } from 'lucide-react';

export const IosInstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if the user is on an iOS device (iPhone, iPad, iPod)
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Check if the user is using Safari
    const isSafari = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return userAgent.includes('safari') && !userAgent.includes('crios') && !userAgent.includes('fxios');
    };

    // Check if the app is already running in standalone mode (installed)
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator as any).standalone;

    // Show prompt if iOS, Safari, and not installed
    if (isIos() && isSafari() && !isInStandaloneMode()) {
       const hasSeenPrompt = localStorage.getItem('iosInstallPromptDismissed');
       if (!hasSeenPrompt) {
         setShowPrompt(true);
       }
    }
  }, []);

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem('iosInstallPromptDismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-gray-800 shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-50 animate-in fade-in slide-in-from-bottom-5 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start gap-4 max-w-lg mx-auto">
        <div className="mt-1">
            <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-xl text-brasil-blue dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                <Share size={24} />
            </div>
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 dark:text-white">
            Instalar App no iOS
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-snug">
            Para notificações push, instale o Web App. Toque em <Share size={14} className="inline text-brasil-blue dark:text-blue-400 mb-0.5" /> <strong>Compartilhar</strong> na barra do Safari e depois em <strong>Adicionar à Tela de Início</strong>.
          </p>
        </div>
        <button onClick={dismissPrompt} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
