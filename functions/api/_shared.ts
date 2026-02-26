
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
    const { data: profile } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', userId)
        .single();

    if (!profile?.fcm_token) {
        console.warn(`Push skipped for ${userId}: No FCM token found in profile.`);
        return;
    }

    // 2. Send via FCM
    // Note: Cloudflare environment needs FCM_SERVER_KEY or FCM_SERVICE_ACCOUNT
    console.log(`Attempting to send push to ${userId} (Token: ${profile.fcm_token.substring(0, 10)}...)`);

    try {
        // This is a simplified call. For FCM v1, you need an OAuth2 token.
        // If the user has FCM_SERVER_KEY (legacy) or FCM_SERVICE_ACCOUNT (v1) configured:
        if (env.FCM_SERVER_KEY) {
            const response = await fetch('https://fcm.googleapis.com/fcm/send', {
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
                        click_action: "FLUTTER_NOTIFICATION_CLICK" // Standard for many libraries
                    },
                    priority: "high"
                })
            });

            const result = await response.text();
            console.log(`FCM Sent Result: ${response.status} - ${result}`);
        } else {
            console.warn("FCM_SERVER_KEY is not defined in the environment variables (Cloudflare).");
        }
    } catch (e: any) {
        console.error("Critical Push send error:", e.message || e);
    }
}
