
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

// ---- OAuth2 / JWT Helpers for FCM v1 (Web Crypto) ----

async function getAccessToken(env: any) {
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
        scope: "https://www.googleapis.com/auth/cloud-platform",
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

export async function sendPushNotificationToUser(env: any, userId: string, title: string, body: string, data?: any) {
    const supabase = getSupabaseClient(env);

    // 1. Get user's FCM tokens (supporting multiple devices)
    const { data: tokenRows, error: tokenError } = await supabase
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', userId);

    let tokens: string[] = [];
    
    // Se encontrou tokens na nova tabela, usa eles
    if (!tokenError && tokenRows && tokenRows.length > 0) {
        tokens = tokenRows.map(r => r.token);
        console.log(`Encontrados ${tokens.length} tokens para o usuário ${userId} na nova tabela.`);
    } 
    
    // Se a nova tabela estiver vazia OU der erro (ex: RLS), tenta a tabela antiga como plano B
    if (tokens.length === 0) {
        const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('fcm_token')
            .eq('id', userId)
            .single();
            
        if (profile?.fcm_token) {
            tokens = [profile.fcm_token];
            console.log(`Usando token legado da tabela profiles para o usuário ${userId}.`);
        }
        
        if (tokenError && tokens.length === 0) {
            console.warn("Erro ao buscar na nova tabela e nada encontrado na antiga:", tokenError.message);
        }
    }

    if (tokens.length === 0) {
        return {
            success: false,
            message: "Nenhum token FCM encontrado para este usuário.",
            details: "O usuário precisa registrar o dispositivo (Web ou Android)."
        };
    }

    // 2. Send via FCM v1 to ALL registered tokens
    const results = [];
    try {
        const accessToken = await getAccessToken(env);
        const projectId = env.FCM_PROJECT_ID || "batepapobase";

        for (const token of tokens) {
            const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`
                },
                body: JSON.stringify({
                    message: {
                        token: token,
                        notification: { title, body },
                        data: {
                            ...(data || {}),
                            click_action: "FLUTTER_NOTIFICATION_CLICK"
                        },
                        android: {
                            priority: "high",
                            notification: {
                                sound: "default",
                                icon: "ic_notification", // Native icon
                                notification_priority: "PRIORITY_HIGH"
                            }
                        },
                        webpush: {
                            notification: {
                                title: title,
                                body: body,
                                icon: "https://bolaodacopa2026.app/favicon.png",
                                badge: "https://bolaodacopa2026.app/favicon.png",
                                vibrate: [200, 100, 200]
                            },
                            fcm_options: {
                                link: data?.url ? `https://bolaodacopa2026.app${data.url}` : "https://bolaodacopa2026.app/"
                            }
                        }
                    }
                })
            });

            const result = await response.json() as any;
            if (response.ok) {
                results.push({ token, success: true, details: result });
            } else {
                // If token is invalid, remove it from the new table
                if (response.status === 404 || response.status === 400) {
                    await supabase.from('user_fcm_tokens').delete().eq('token', token);
                    results.push({ token, success: false, message: "Token removido por ser inválido" });
                } else {
                    results.push({ token, success: false, message: `Erro FCM: ${response.status}` });
                }
            }
        }

        const anySuccess = results.some(r => r.success);
        return { 
            success: anySuccess, 
            message: anySuccess ? "Notificação processada" : "Falha ao enviar para todos os dispositivos", 
            results 
        };

    } catch (e: any) {
        console.error("Critical Push v1 error:", e);
        return { success: false, message: `Erro crítico: ${e.message}` };
    }
}
