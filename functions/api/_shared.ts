
import { createClient } from '@supabase/supabase-js';

// ---- Response Helpers ----

export function jsonResponse(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export function errorResponse(error: any, statusOverride?: number) {
    const status = statusOverride || (error.message === 'Unauthorized' ? 401 :
        error.message === 'Forbidden' ? 403 :
            error.message === 'Service Unavailable' ? 503 : 500);

    return jsonResponse({ error: error.message || "Internal Server Error" }, status);
}

// ---- Supabase Clients ----

export function getSupabaseClient(env: any) {
    return createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY
    );
}

export function getUserClient(env: any, request: Request) {
    const authHeader = request.headers.get('Authorization');
    return createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        {
            global: {
                headers: authHeader ? { 'Authorization': authHeader } : undefined
            }
        }
    );
}

// ---- Utils ----

export async function withRetry<T>(fn: () => Promise<{ data: T | null; error: any }>, retries = 3): Promise<T | null> {
    try {
        const { data, error } = await fn();
        if (error) throw error;
        return data;
    } catch (error: any) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
            return withRetry(fn, retries - 1);
        }
        console.error("Supabase API Error after retries:", error.message || error);
        throw error;
    }
}
// ---- Push Notifications ----

export async function sendPushNotificationToUser(env: any, userId: string, title: string, body: string, data?: any) {
    const supabase = getSupabaseClient(env);

    // 1. Get user's FCM token
    const { data: profile, error: dbError } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', userId)
        .single();

    if (dbError) {
        return { success: false, message: `Erro ao buscar perfil: ${dbError.message}` };
    }

    if (!profile?.fcm_token) {
        return {
            success: false,
            message: "Você não possui um token FCM registrado.",
            details: "Abra o aplicativo no Android para registrar o dispositivo."
        };
    }

    // 2. Send via FCM
    try {
        if (env.FCM_SERVER_KEY) {
            const response = await fetch(`https://fcm.googleapis.com/fcm/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${env.FCM_SERVER_KEY}`
                },
                body: JSON.stringify({
                    to: profile.fcm_token,
                    notification: {
                        title,
                        body,
                        sound: "default",
                        badge: 1
                    },
                    data: {
                        ...(data || {}),
                        click_action: "FLUTTER_NOTIFICATION_CLICK"
                    },
                    priority: "high"
                })
            });

            const resultTex = await response.text();

            if (response.status === 404) {
                return {
                    success: false,
                    message: "Firebase retornou 404 (Não Encontrado).",
                    details: "Isso geralmente significa que a API Legada do Cloud Messaging está desativada no Console do Google Cloud para este projeto."
                };
            }
            if (response.ok) {
                return { success: true, message: "Notificação enviada com sucesso!", details: resultTex };
            } else {
                return { success: false, message: `Erro no Firebase: ${response.status}`, details: resultTex };
            }
        } else {
            return { success: false, message: "FCM_SERVER_KEY não configurada na Cloudflare." };
        }
    } catch (e: any) {
        console.error("Critical Push error:", e);
        return { success: false, message: `Erro crítico: ${e.message}` };
    }
}
