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

    // Get token - requires service worker to be ready with a safety timeout
    console.log('Aguardando Service Worker ficar pronto...');
    const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout: O Service Worker não respondeu em 10 segundos.')), 10000))
    ]) as ServiceWorkerRegistration;
    
    console.log('Service Worker pronto para receber Token');

    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
    if (!vapidKey) {
        throw new Error('VAPID Key do Firebase não configurada nas variáveis de ambiente.');
    }

    console.log('Obtendo token com VAPID Key:', vapidKey);
    const token = await getToken(messaging, {
      vapidKey: vapidKey,
      serviceWorkerRegistration: registration
    });

    if (token) {
      return token;
    } else {
      return null;
    }
  } catch (err: any) {
    console.error('Erro detalhado ao obter token web:', err);
    throw new Error(`Erro Firebase: ${err.message || 'Falha ao gerar token'}`);
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
