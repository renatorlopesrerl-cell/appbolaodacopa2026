import { initializeApp, getApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FCM_API_KEY,
  authDomain: import.meta.env.VITE_FCM_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FCM_DATABASE_URL,
  projectId: import.meta.env.VITE_FCM_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FCM_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FCM_APP_ID
};

// Initialize Firebase lazily to prevent crash if config is missing during startup
let messaging: Messaging | null = null;

try {
  if (firebaseConfig.apiKey) {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    messaging = getMessaging(app);
  } else {
    console.warn("Firebase config is missing. Web push notifications will be disabled.");
  }
} catch (error) {
  console.error("Error initializing Firebase:", error);
}

/**
 * Requests permission and returns the FCM token for Web PWA
 */
export const requestWebPushToken = async () => {
  if (!messaging) {
    console.log('FCM Messaging não inicializado.');
    return null;
  }
  
  try {
    // Check if notifications are supported
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        console.log('Este navegador não suporta notificações PWA');
        return null;
    }

    // Explicitly check current permission
    if (Notification.permission === 'denied') {
      console.log('Permissão de notificação já foi negada pelo usuário no navegador.');
      return null;
    }

    const permission = await Notification.requestPermission();
    console.log('Resultado do pedido de permissão:', permission);

    if (permission !== 'granted') {
      return null;
    }

    // Get token - requires service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker pronto para receber Token');

    console.log('Obtendo token com VAPID Key:', import.meta.env.VITE_FCM_VAPID_KEY);
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      return token;
    } else {
      return null;
    }
  } catch (err) {
    console.error('Erro ao obter token web:', err);
    return null;
  }
};

/**
 * Listen for foreground messages
 */
export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    console.log('Mensagem recebida em primeiro plano:', payload);
    callback(payload);
  });
};
