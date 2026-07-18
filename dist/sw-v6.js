/* eslint-disable no-undef */
// NOTA: Este arquivo (sw-v6.js) é um service worker legado mantido apenas para
// garantir compatibilidade com instalações antigas. O tratamento de notificações
// push é feito EXCLUSIVAMENTE pelo firebase-messaging-sw.js para evitar duplicatas.

// Minimal Cache
var CACHE_NAME = 'sw-v7';
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
