/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Configuração injetada via build script (process.env)
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  databaseURL: "FIREBASE_DATABASE_URL",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID"
};

// Inicialização blindada
let messaging = null;

try {
  firebase.initializeApp(firebaseConfig);
  messaging = firebase.messaging();
} catch (e) {
  console.log("Firebase já inicializado ou conflito no SW:", e);
}

// Lógica de cache para o PWA funcionar offline
const CACHE_NAME = 'palpiteiro-v8';
const ASSETS_TO_CACHE = ['/', '/index.html', '/manifest.json', '/favicon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // 1. Ignorar esquemas que não sejam HTTP/HTTPS (essencial para Chrome Extensions e Android)
  if (!event.request.url.startsWith('http')) return;

  // 2. REGRA DE OURO AMPLIADA: Se for asset, script, estilo ou banco, NÃO INTERCEPTAR.
  // Ao não chamar event.respondWith(), o navegador assume o controle total da rede.
  if (
    event.request.url.includes('/assets/') ||
    event.request.url.includes('/cdn-cgi/') ||
    event.request.url.includes('supabase') ||
    event.request.url.endsWith('.js') ||
    event.request.url.endsWith('.css')
  ) {
    return; // O navegador cuida disso sozinho.
  }

  // 3. Estratégia "Network-First" com fallback seguro apenas para o restante
  event.respondWith(
    fetch(event.request).catch(() => {
      // Se a rede falhar e for uma navegação de página, tenta o cache
      if (event.request.mode === 'navigate') {
        return caches.match('/index.html');
      }
      // Se não for navegação, retorna uma resposta nula que o navegador sabe tratar
      return new Response(null, { status: 404, statusText: 'Not Found' });
    })
  );
});

// Manipulador de mensagens em segundo plano (essencial para alguns navegadores)
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('Mensagem em segundo plano recebida:', payload);
    
    const notificationTitle = payload.notification?.title || "Bolão Copa 2026";
    const notificationOptions = {
      body: payload.notification?.body,
      icon: '/favicon.png',
      badge: '/favicon.png',
      data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Lógica de clique na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});