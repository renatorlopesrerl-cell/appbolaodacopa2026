import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from './api';

export const setupPushNotifications = async (userId: string) => {
    if (Capacitor.getPlatform() === 'web') return;

    // 1. Request permissions for Push and Local
    let pushPerms = await PushNotifications.checkPermissions();
    if (pushPerms.receive === 'prompt') pushPerms = await PushNotifications.requestPermissions();

    let localPerms = await LocalNotifications.checkPermissions();
    if (localPerms.display === 'prompt') localPerms = await LocalNotifications.requestPermissions();

    if (pushPerms.receive !== 'granted') {
        console.warn('User denied push permissions');
    }

    // 2. Register for Push
    if (pushPerms.receive === 'granted') {
        await PushNotifications.register();

        await PushNotifications.addListener('registration', async (token) => {
            console.log('Push token:', token.value);
            try {
                await api.profiles.update({ id: userId, fcm_token: token.value });
            } catch (e) {
                console.error('Error saving FCM token:', e);
            }
        });

        await PushNotifications.addListener('pushNotificationReceived', (notification) => {
            // Show as local notification if app is in foreground
            LocalNotifications.schedule({
                notifications: [{
                    title: notification.title || "Notificação",
                    body: notification.body || "",
                    id: Date.now(),
                    extra: notification.data
                }]
            });
        });

        await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            const data = notification.notification.data;
            if (data?.url) window.location.href = data.url;
        });
    }

    // 3. Setup Local Notifications (Reminders)
    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        const data = notification.notification.extra;
        if (data?.url) window.location.href = data.url;
    });
};

// Helper to generate numeric ID from string
const getNumericId = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
};

export const scheduleMatchReminder = async (matchId: string, matchName: string, date: string) => {
    if (Capacitor.getPlatform() === 'web') return;

    const matchDate = new Date(date);
    const reminderTime = new Date(matchDate.getTime() - 30 * 60 * 1000); // 30 min before

    if (reminderTime <= new Date()) return;

    await LocalNotifications.schedule({
        notifications: [{
            title: "Lembrete de Jogo ⏳",
            body: `Faltam 30 minutos para ${matchName}! Faça seu palpite agora.`,
            id: getNumericId(matchId),
            schedule: { at: reminderTime },
            extra: { url: '/table' }
        }]
    });
};
