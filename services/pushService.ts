import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from './api';

export const setupPushNotifications = async (userId: string) => {
    if (Capacitor.getPlatform() === 'web') {
        console.log('Push notifications not supported on web');
        return;
    }

    try {
        // 1. Request permissions for Push and Local
        let pushPerms = await PushNotifications.checkPermissions();
        console.log('Current Push permissions:', pushPerms.receive);

        if (pushPerms.receive === 'prompt') {
            pushPerms = await PushNotifications.requestPermissions();
        }

        let localPerms = await LocalNotifications.checkPermissions();
        console.log('Current Local permissions:', localPerms.display);

        if (localPerms.display === 'prompt') {
            localPerms = await LocalNotifications.requestPermissions();
        }

        if (pushPerms.receive !== 'granted') {
            console.warn('User denied push permissions');
        }

        // 2. Register for Push
        if (pushPerms.receive === 'granted') {
            // Remove existing listeners to avoid duplicates
            await PushNotifications.removeAllListeners();

            await PushNotifications.addListener('registration', async (token) => {
                console.log('Push token successfully generated:', token.value);
                try {
                    await api.profiles.update({ id: userId, fcm_token: token.value });
                    console.log('Push token saved to profile');
                } catch (e) {
                    console.error('Error saving FCM token:', e);
                }
            });

            await PushNotifications.addListener('registrationError', (error) => {
                console.error('Push registration error:', error.error);
            });

            await PushNotifications.addListener('pushNotificationReceived', (notification) => {
                console.log('Push notification received:', notification);
                // Show as local notification if app is in foreground
                LocalNotifications.schedule({
                    notifications: [{
                        title: notification.title || "Notificação",
                        body: notification.body || "",
                        id: Date.now(),
                        extra: notification.data,
                        channelId: 'meu_canal',
                        actionTypeId: 'OPEN_URL'
                    }]
                });
            });

            await PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
                console.log('Push action performed:', notification.actionId, notification.notification.data);
                const data = notification.notification.data;
                if (data?.url) window.location.href = data.url;
            });

            // Create channels for Android (Important for modern Android versions)
            if (Capacitor.getPlatform() === 'android') {
                await PushNotifications.createChannel({
                    id: 'meu_canal',
                    name: 'Palpiteiro da Copa',
                    description: 'Canal principal para notificações',
                    importance: 5, // High
                    visibility: 1,
                    vibration: true,
                });

                await LocalNotifications.createChannel({
                    id: 'meu_canal',
                    name: 'Palpiteiro da Copa',
                    description: 'Canal para lembretes locais',
                    importance: 5,
                    visibility: 1,
                    vibration: true,
                });
            }

            // Now register
            await PushNotifications.register();
        }

        // 3. Setup Local Notifications (Reminders)
        await LocalNotifications.removeAllListeners();
        await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
            console.log('Local notification action performed:', notification);
            const data = notification.notification.extra;
            if (data?.url) window.location.href = data.url;
        });

    } catch (error) {
        console.error('Error in setupPushNotifications:', error);
    }
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

    try {
        const matchDate = new Date(date);
        const reminderTime = new Date(matchDate.getTime() - 30 * 60 * 1000); // 30 min before
        const now = new Date();

        if (reminderTime <= now) {
            console.log(`Match ${matchName} is too close or already started, skipping local reminder.`);
            return;
        }

        const id = getNumericId(matchId);

        // Cancel first to ensure no duplicates/stale data
        await LocalNotifications.cancel({ notifications: [{ id }] });

        await LocalNotifications.schedule({
            notifications: [{
                title: "Lembrete de Jogo ⏳",
                body: `Faltam 30 minutos para ${matchName}! Faça seu palpite agora.`,
                id: id,
                schedule: { at: reminderTime },
                channelId: 'meu_canal',
                extra: { url: '/table' }
            }]
        });
        console.log(`Reminder scheduled for ${matchName} at ${reminderTime.toLocaleString()}`);
    } catch (error) {
        console.error('Error scheduling match reminder:', error);
    }
};

export const cancelMatchReminder = async (matchId: string) => {
    if (Capacitor.getPlatform() === 'web') return;
    const id = getNumericId(matchId);
    await LocalNotifications.cancel({
        notifications: [{ id }]
    });
};

/**
 * Test function to verify if local notifications are working immediately
 */
export const testLocalNotification = async () => {
    if (Capacitor.getPlatform() === 'web') return;

    await LocalNotifications.schedule({
        notifications: [{
            title: "Teste de Notificação 🚀",
            body: "Se você está vendo isso, as notificações locais estão funcionando!",
            id: 9999,
            schedule: { at: new Date(Date.now() + 5000) }, // 5 seconds from now
            channelId: 'meu_canal'
        }]
    });
    console.log('Test notification scheduled for 5 seconds from now');
};
