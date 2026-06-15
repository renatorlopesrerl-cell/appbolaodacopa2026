import React, { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

interface AdSenseBannerProps {
  slotId?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const AdSenseBanner: React.FC<AdSenseBannerProps> = ({ slotId, className, style }) => {
  useEffect(() => {
    // Somente roda se for Web e não nativo
    if (Capacitor.isNativePlatform()) return;

    try {
      // @ts-ignore
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  if (Capacitor.isNativePlatform()) return null;

  return (
    <div 
      className={`relative w-full ${className || ''}`} 
      style={{ ...style, height: '60px', maxHeight: '60px', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}
    >
      <ins className="adsbygoogle"
           style={{ display: 'inline-block', width: '100%', height: '60px' }}
           data-ad-client="ca-pub-7684468298593275"
           data-ad-slot={slotId || ""}></ins>
      {!slotId && (
         <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-400 bg-gray-100 dark:bg-gray-800 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg whitespace-nowrap overflow-hidden">
             [Anúncio Web PENDENTE]
         </div>
      )}
    </div>
  );
};
