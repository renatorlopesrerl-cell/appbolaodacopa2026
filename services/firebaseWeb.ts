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

    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
    if (!vapidKey) {
        throw new Error('VAPID Key do Firebase não encontrada nas variáveis de ambiente (.env).');
    }

    console.log('--- DEBUG FCM ---');
    console.log('VAPID Key:', vapidKey);
    console.log('Sender ID:', firebaseConfig.messagingSenderId);
    console.log('App ID:', firebaseConfig.appId);
    
    // Para o Safari iOS, o registro do Service Worker DEVE ser o mais direto possível.
    // Qualquer 'await' em limpezas de workers antigos pode quebrar a cadeia de 'User Gesture'.
    let registration;
    if ('serviceWorker' in navigator) {
        // Já garantimos o registro no index.tsx, aqui apenas pegamos o que está pronto.
        registration = await navigator.serviceWorker.ready;
    } else {
        throw new Error("Service Worker não suportado neste navegador.");
    }

    console.log('FCM: Solicitando inscrição via Push API...');
    
    // Promise.race para forçar um tempo limite e não congelar o botão do usuário se o Firebase bugar na rede
    const token = await Promise.race([
      getToken(messaging, {
        vapidKey: vapidKey,
        serviceWorkerRegistration: registration
      }),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout (10s) atingido ao solicitar Token do Firebase. O Service Worker ou a rede podem estar travados.")), 10000)
      )
    ]);

    if (token) {
      console.log('Token gerado com sucesso!');
      return token;
    } else {
      throw new Error('O Firebase retornou um token vazio. Verifique se as chaves VAPID e SenderID correspondem ao projeto no Firebase Console.');
    }
  } catch (err: any) {
    console.error('Erro crítico no Firebase Web:', err);
    // Extraímos a mensagem original do Firebase se existir
    const msg = err.message || 'Erro desconhecido';
    throw new Error(`Firebase Error: ${msg}`);
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
