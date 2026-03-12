/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

var firebaseConfig = {
  apiKey: "AIzaSyBj2tpeNZZ7S2zhoKN1BhcsrEd4KJi23KQ",
  authDomain: "batepapobase.firebaseapp.com",
  databaseURL: "https://batepapobase.firebaseio.com",
  projectId: "batepapobase",
  storageBucket: "batepapobase.firebasestorage.app",
  messagingSenderId: "567474314433",
  appId: "1:567474314433:web:815e19e45a75fb23d68840"
};

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
  console.error('SW Error:', e);
}

// Minimal Cache
var CACHE_NAME = 'sw-v6';
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { e.waitUntil(self.clients.claim()); });
