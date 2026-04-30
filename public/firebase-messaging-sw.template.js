/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

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
const CACHE_NAME = 'palpiteiro-v6';
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
  // Bloqueia requisições HTTP inseguras ou esquemas não-HTTP (ex: chrome-extension)
  // para evitar que o Service Worker quebre em domínios .app que exigem HTTPS.
  if (event.request.url.startsWith('http:') || !event.request.url.startsWith('http')) {
    return;
  }

  // REGRA DE OURO: Se for um arquivo de assets ou do Cloudflare, ignore e deixe a rede tratar
  if (event.request.url.includes('/assets/') ||
    event.request.url.includes('/cdn-cgi/') ||
    event.request.url.includes('supabase')) {
    return;
  }

  // Tratamento padrão para o restante
  event.respondWith(
    fetch(event.request).catch(() => {
      // Retorna uma resposta vazia segura em caso de erro, evitando o crash
      return new Response(null, { status: 404 });
    })
  );
});
