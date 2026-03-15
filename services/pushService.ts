import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { api } from './api';

import { requestWebPushToken } from './firebaseWeb';

export const setupPushNotifications = async (userId: string, force: boolean = false) => {
    if (Capacitor.getPlatform() === 'web') {
        console.log(`Iniciando configuração de Push para Web PWA (force=${force})...`);
        try {
            const token = await requestWebPushToken(force);
            if (token) {
                localStorage.setItem('active_fcm_token', token);
                await api.profiles.saveFcmToken(userId, token, 'web');
                console.log('Web Push Token salvo com sucesso na tabela de dispositivos.');
                return true;
            } else {
                // If not forced and token is null, it might be waiting for user gesture (iOS)
                if (!force) return false;
                throw new Error('Não foi possível gerar um token de notificação para este navegador.');
            }
        } catch (e: any) {
            console.error('Erro ao configurar Web Push:', e);
            throw e;
        }
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
                    localStorage.setItem('active_fcm_token', token.value);
                    const deviceType = Capacitor.getPlatform() === 'ios' ? 'ios' : 'android';
                    await api.profiles.saveFcmToken(userId, token.value, deviceType);
                    console.log(`Push token (${deviceType}) saved to device tokens table`);
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
    // DESATIVADO: Agora usamos o sistema de notificações centralizado via servidor (push_reminder.ts).
    // Isso evita notificações duplicadas no APK e garante que todos recebam o mesmo lembrete.
    return;
};

export const cancelMatchReminder = async (matchId: string) => {
    // DESATIVADO: O servidor controla os lembretes agora.
    return;
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
