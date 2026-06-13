
// Last update: 2026-03-03T03:00 (Triggering build with new env vars)
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
        env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
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

export async function withRetry<T>(fn: () => Promise<{ data: T | null; error: any }>, retries = 3, attempt = 0): Promise<T | null> {
    try {
        const { data, error } = await fn();
        if (error) throw error;
        return data;
    } catch (error: any) {
        if (retries > 0) {
            // Exponential backoff: 500ms → 1000ms → 2000ms
            const delay = 500 * Math.pow(2, attempt);
            console.warn(`[withRetry] Tentativa ${attempt + 1} falhou. Aguardando ${delay}ms antes de tentar novamente...`);
            await new Promise(res => setTimeout(res, delay));
            return withRetry(fn, retries - 1, attempt + 1);
        }
        console.error("Supabase API Error after retries:", error.message || error);
        throw error;
    }
}

// ---- OAuth2 / JWT Helpers for FCM v1 (Web Crypto) ----

export async function getAccessToken(env: any) {
    const clientEmail = env.FCM_CLIENT_EMAIL;
    const rawKey = env.FCM_PRIVATE_KEY;

    if (!clientEmail || !rawKey) {
        throw new Error("FCM_CLIENT_EMAIL ou FCM_PRIVATE_KEY não configurados.");
    }

    const privateKey = rawKey.replace(/\\n/g, '\n');
    const header = { alg: "RS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: clientEmail,
        scope: "https://www.googleapis.com/auth/firebase.messaging",
        aud: "https://oauth2.googleapis.com/token",
        exp: now + 3600,
        iat: now,
    };

    const encodedHeader = b64url_utf8(JSON.stringify(header));
    const encodedPayload = b64url_utf8(JSON.stringify(payload));
    const unsignedJwt = `${encodedHeader}.${encodedPayload}`;

    // Import the PKCS#8 private key
    // We strip headers and convert from base64 string to ArrayBuffer
    const lines = privateKey.split('\n');
    const b64Data = lines.filter(line => !line.startsWith('-----')).join('');
    const binaryKey = str2ab(atob(b64Data));

    const cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        binaryKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode(unsignedJwt)
    );

    const encodedSignature = b64url_buffer(signature);
    const jwt = `${unsignedJwt}.${encodedSignature}`;

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    });

    const data = await response.json() as any;
    if (!response.ok) {
        throw new Error(`Google OAuth2 Error: ${JSON.stringify(data)}`);
    }
    return data.access_token;
}

function str2ab(str: string) {
    const buf = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        buf[i] = str.charCodeAt(i);
    }
    return buf.buffer;
}

function b64url_utf8(str: string) {
    const uint8 = new TextEncoder().encode(str);
    const binary = String.fromCharCode(...uint8);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64url_buffer(buf: ArrayBuffer) {
    const binary = String.fromCharCode(...new Uint8Array(buf));
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---- Push Notifications ----

export async function sendPushNotificationToUsers(env: any, userIds: string[], title: string, body: string, data?: any) {
    console.log(`[Push Service] Forwarding ${userIds.length} users to Supabase Edge Function`);
    try {
        const url = `${env.SUPABASE_URL}/functions/v1/push-notification`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                title,
                body,
                data,
                userIds
            })
        });

        const result = await response.json() as any;
        return { success: response.ok, ...result };
    } catch (e: any) {
        console.error("Critical Push Edge Function error:", e);
        return { success: false, message: "Erro no serviço de notificações" };
    }
}

export async function sendPushNotificationToUser(env: any, userId: string, title: string, body: string, data?: any) {
    return sendPushNotificationToUsers(env, [userId], title, body, data);
}

// ---- Bulk Push Helpers (Scalability) ----

export function extractTokens(userIds: string[], allUsers: any[], tokenRows: any[] | null): string[] {
    const tokens = new Set<string>();
    
    // Mapa rápido da tabela user_fcm_tokens
    const tokenMap = new Map<string, string[]>();
    if (tokenRows) {
        tokenRows.forEach((r: any) => {
            if (!tokenMap.has(r.user_id)) tokenMap.set(r.user_id, []);
            tokenMap.get(r.user_id)!.push(r.token);
        });
    }

    // Mapa rápido dos profiles
    const profileMap = new Map<string, any>();
    allUsers.forEach((u: any) => profileMap.set(u.id, u));

    for (const uid of userIds) {
        let added = false;
        if (tokenMap.has(uid)) {
            tokenMap.get(uid)!.forEach(t => {
                if (t && t.trim()) {
                    tokens.add(t.trim());
                    added = true;
                }
            });
        }
        
        if (!added && profileMap.has(uid)) {
            const legacyToken = profileMap.get(uid).fcm_token;
            if (legacyToken && legacyToken.trim()) {
                tokens.add(legacyToken.trim());
            }
        }
    }

    return Array.from(tokens);
}

export async function processBulkNotifications(env: any, tokens: string[], title: string, body: string, dataObj?: any) {
    try {
        console.log(`[Bulk Push] Forwarding ${tokens.length} tokens to Supabase Edge Function.`);
        const url = `${env.SUPABASE_URL}/functions/v1/push-notification`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                title,
                body,
                data: dataObj,
                tokens
            })
        });

        const result = await response.json() as any;
        console.log(`[Bulk Push] Finalizado Edge Function result:`, result);
        return { success: response.ok, ...result };
    } catch (error) {
        console.error(`[Bulk Push] Erro crítico no forward process:`, error);
        return { success: false, error };
    }
}
