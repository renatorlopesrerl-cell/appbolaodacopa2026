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
      var title = payload.notification.title || 'Bolão da Copa';
      var options = {
        body: payload.notification.body || 'Nova atualização disponível!',
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: payload.data
      };
      self.registration.showNotification(title, options);
    });
  } catch (e) {
    console.error('SW Init Error:', e);
  }
}

// Minimal Cache
var CACHE_NAME = 'sw-v6';
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
