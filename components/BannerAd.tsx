import React, { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

export default function BannerAd() {
  const adContainerRef = useRef<HTMLDivElement>(null);

  // Exibir apenas na versão Web (impede exibição no aplicativo nativo Android/iOS)
  if (Capacitor.isNativePlatform()) {
    return null;
  }

  useEffect(() => {
    if (adContainerRef.current && adContainerRef.current.childNodes.length === 0) {
      const confScript = document.createElement('script');
      confScript.type = 'text/javascript';
      confScript.innerHTML = `
        atOptions = {
          'key' : '43109220a930d7f14b451cac41e5dbbe',
          'format' : 'iframe',
          'height' : 50,
          'width' : 320,
          'params' : {}
        };
      `;
      adContainerRef.current.appendChild(confScript);

      const invokeScript = document.createElement('script');
      invokeScript.type = 'text/javascript';
      invokeScript.src = 'https://www.highperformanceformat.com/43109220a930d7f14b451cac41e5dbbe/invoke.js';
      invokeScript.async = true;
      adContainerRef.current.appendChild(invokeScript);
    }
  }, []);

  return (
    <div 
      ref={adContainerRef} 
      style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '50px', margin: '10px auto' }} 
    />
  );
}
