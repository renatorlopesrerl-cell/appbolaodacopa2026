import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FCM_API_KEY,
  authDomain: import.meta.env.VITE_FCM_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FCM_DATABASE_URL,
  projectId: import.meta.env.VITE_FCM_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FCM_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FCM_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FCM_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

/**
 * Requests permission and returns the FCM token for Web PWA
 */
export const requestWebPushToken = async () => {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações desktop');
        return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Permissão de notificação negada');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FCM_VAPID_KEY
    });

    if (token) {
      console.log('FCM Web Token:', token);
      return token;
    } else {
      console.log('Nenhum token disponível. Verifique as configurações.');
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
  return onMessage(messaging, (payload) => {
    console.log('Mensagem recebida em primeiro plano:', payload);
    callback(payload);
  });
};
