/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Recupera as chaves de forma dinâmica para evitar alertas de segurança no GitHub
var params = new URL(location).searchParams;
var firebaseConfig = {
  apiKey: params.get('apiKey'),
  authDomain: params.get('authDomain'),
  databaseURL: params.get('databaseURL'),
  projectId: params.get('projectId'),
  storageBucket: params.get('storageBucket'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId')
};

if (firebaseConfig.apiKey) {
  try {
    firebase.initializeApp(firebaseConfig);
    var messaging = firebase.messaging();

    messaging.onBackgroundMessage(function(payload) {
      console.log('[SW] Mensagem recebida:', payload);
      var title = (payload.notification && payload.notification.title) || (payload.data && payload.data.title) || 'Bolão da Copa 2026';
      var body = (payload.notification && payload.notification.body) || (payload.data && payload.data.body) || 'Confira as novidades no seu bolão!';
      
      var options = {
        body: body,
        icon: 'https://bolaodacopa2026.app/favicon.png',
        badge: 'https://bolaodacopa2026.app/favicon.png',
        data: payload.data,
        vibrate: [200, 100, 200],
        tag: 'bolao-notification-' + Date.now(),
        renotify: true
      };
      
      return self.registration.showNotification(title, options);
    });
  } catch (e) {
    console.error('SW Init Error:', e);
  }
}

// Minimal Cache
var CACHE_NAME = 'sw-v7';
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
