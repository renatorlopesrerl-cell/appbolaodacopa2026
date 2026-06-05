import React, { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export const LiveCountdown: React.FC<{ date: string; isLocked: boolean; className?: string }> = ({ date, isLocked, className }) => {
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    if (isLocked) return;

    const calculateTimeLeft = () => {
      const matchTime = new Date(date).getTime();
      const lockTime = matchTime - 5 * 60 * 1000; // 5 minutos antes
      const now = Date.now();
      
      const diff = lockTime - now;
      if (diff <= 0) {
        setTimeLeft('');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        // Formata os minutos e segundos para sempre ter 2 dígitos
        const minsStr = minutes.toString().padStart(2, '0');
        const secsStr = seconds.toString().padStart(2, '0');
        setTimeLeft(`${minsStr}m ${secsStr}s`);
      }
    };

    calculateTimeLeft();
    // Atualiza a cada 1 segundo para dar a sensação de "ao vivo"
    const interval = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(interval);
  }, [date, isLocked]);

  if (isLocked || !timeLeft) return null;

  const defaultClasses = "flex items-center justify-end gap-1 text-yellow-800 dark:text-yellow-200 text-[10px] sm:text-xs font-bold bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-bl-lg shadow-sm border border-yellow-100 dark:border-yellow-800/50 absolute right-0 top-7 animate-fade-in";
  
  return (
    <div className={className || defaultClasses}>
      <Timer size={12} className="animate-pulse" />
      <span>{timeLeft}</span>
    </div>
  );
};
