import { createClient } from '@supabase/supabase-js'

// ── JWKS Cache ───────────────────────────────────────────────────────────────
// Busca as chaves públicas ECC do Supabase uma vez e guarda em memória.
// Sem nenhuma chave secreta — a chave pública é feita para ser pública.
// Recarregado automaticamente quando o Cloudflare Worker reinicia (deploy).
let jwksCache: { keys: any[]; fetchedAt: number } | null = null;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora
const SUPABASE_JWKS_URL = 'https://sjianpqzozufnobftksp.supabase.co/auth/v1/.well-known/jwks.json';

async function getJwks(): Promise<any[]> {
    const now = Date.now();
    if (jwksCache && (now - jwksCache.fetchedAt) < JWKS_CACHE_TTL_MS) {
        return jwksCache.keys;
    }
    const res = await fetch(SUPABASE_JWKS_URL);
    if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
    const data = await res.json() as any;
    jwksCache = { keys: data.keys || [], fetchedAt: now };
    console.log(`[Middleware] JWKS carregado: ${jwksCache.keys.length} chave(s).`);
    return jwksCache.keys;
}

// ── Decodificação base64url ───────────────────────────────────────────────────
function base64urlDecode(str: string): ArrayBuffer {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer as ArrayBuffer;
}

function base64urlToJson(str: string): any {
    const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(
        str.length + (4 - str.length % 4) % 4, '='
    );
    return JSON.parse(atob(padded));
}

// ── Validação JWT local com JWKS (ES256 / ECC P-256) ─────────────────────────
// Verifica a assinatura criptográfica do token sem nenhuma chamada de rede
// (exceto na primeira vez para buscar o JWKS, que fica em cache por 1 hora).
async function verifyJwtWithJwks(token: string): Promise<{ user: any } | null> {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;

        // 1. Decodificar o header para pegar alg e kid
        const header = base64urlToJson(headerB64);

        if (header.alg !== 'ES256') {
            // Token usa algoritmo diferente (ex: HS256 legacy) — usa fallback
            console.warn(`[Middleware] JWT alg=${header.alg} não é ES256. Usando fallback.`);
            return null;
        }

        // 2. Buscar chave pública do JWKS (com cache em memória)
        const keys = await getJwks();
        const jwk = header.kid
            ? keys.find((k: any) => k.kid === header.kid)
            : keys.find((k: any) => k.alg === 'ES256' || k.crv === 'P-256');

        if (!jwk) {
            console.warn('[Middleware] Chave JWKS não encontrada. kid:', header.kid);
            return null;
        }

        // 3. Importar a chave pública ECC P-256 via Web Crypto API (nativa no Cloudflare)
        const cryptoKey = await crypto.subtle.importKey(
            'jwk',
            jwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['verify']
        );

        // 4. Verificar assinatura ECDSA
        const signatureBytes = base64urlDecode(signatureB64);
        const dataToVerify = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
        const isValid = await crypto.subtle.verify(
            { name: 'ECDSA', hash: 'SHA-256' },
            cryptoKey,
            signatureBytes,
            dataToVerify
        );

        if (!isValid) {
            console.warn('[Middleware] JWT: assinatura inválida.');
            return null;
        }

        // 5. Decodificar payload e verificar expiração
        const payload = base64urlToJson(payloadB64);
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < nowSec) {
            console.warn('[Middleware] JWT: token expirado.');
            return null;
        }

        // 6. Retornar objeto compatível com userData.user do supabase.auth.getUser()
        return {
            user: {
                id: payload.sub,
                email: payload.email,
                role: payload.role,
                user_metadata: payload.user_metadata || {},
                app_metadata: payload.app_metadata || {},
                aud: payload.aud,
            }
        };
    } catch (err) {
        console.error('[Middleware] Erro na validação JWKS:', err);
        return null;
    }
}

// ── Admin Permission Cache ────────────────────────────────────────────────────
// Evita consultar o banco a cada request para rotas /admin.
// Cache por userId, TTL de 5 minutos.
const adminCache = new Map<string, { data: any; timestamp: number }>();
const ADMIN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

// ── Retry helper ─────────────────────────────────────────────────────────────
async function retry(fn: () => Promise<any>, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            if (i === attempts - 1) throw err;
            await new Promise(r => setTimeout(r, 500));
        }
    }
}

// ── Middleware principal ──────────────────────────────────────────────────────
export const onRequest = async ({ request, env, next, data }: any) => {
    const originHeader = request.headers.get('Origin');
    const url = new URL(request.url);
    const isPushTest = url.pathname.includes('/admin/test-push');

    // CORS Configuration
    // 1. Localhost (Capacitor Android/iOS dev) → ecoa a origin
    // 2. Domínio de produção → permite
    // 3. Push test → permite qualquer
    // 4. Origem desconhecida → bloqueia (browser bloqueia a resposta)
    let allowedOrigin = 'null';
    let allowCredentials = 'false';
    const PRODUCTION_ORIGIN = 'https://bolaodacopa2026.app';

    if (isPushTest) {
        allowedOrigin = '*';
        allowCredentials = 'false';
    } else if (!originHeader) {
        // Sem Origin = APK nativo (Capacitor) — permite sem credentials
        allowedOrigin = PRODUCTION_ORIGIN;
        allowCredentials = 'false';
    } else if (originHeader.includes('localhost') || originHeader.includes('127.0.0.1')) {
        allowedOrigin = originHeader;
        allowCredentials = 'true';
    } else if (originHeader === PRODUCTION_ORIGIN) {
        allowedOrigin = PRODUCTION_ORIGIN;
        allowCredentials = 'true';
    } else {
        allowedOrigin = 'null';
        allowCredentials = 'false';
    }

    const allowHeaders = 'Content-Type, Authorization, x-requested-with, apikey, x-client-info, x-supabase-auth, cache-control, pragma, expires';

    // Handle OPTIONS Preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': allowedOrigin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': allowHeaders,
                'Access-Control-Allow-Credentials': allowCredentials,
                'Access-Control-Max-Age': '86400',
            }
        });
    }

    // Helper para adicionar CORS em qualquer resposta
    const withCors = (response: Response) => {
        const res = new Response(response.body, response);
        res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.headers.set('Access-Control-Allow-Headers', allowHeaders);
        res.headers.set('Access-Control-Allow-Credentials', allowCredentials);
        return res;
    };

    try {
        // Rotas públicas — sem autenticação
        const isPublic = url.pathname.includes('/health') ||
                         url.pathname.includes('/push_webhook') ||
                         url.pathname.includes('/push/webhook');

        if (isPublic) {
            console.log(`[Middleware] Acesso público: ${url.pathname}`);
            const response = await next();
            return withCors(response);
        }

        const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
        const authHeader = request.headers.get('Authorization');

        if (!authHeader) {
            return withCors(new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 }));
        }

        const token = authHeader.replace('Bearer ', '');

        // ── Validação do Token ──────────────────────────────────────────────
        // Tenta verificar localmente com JWKS (< 1ms após primeira carga).
        // Se falhar por qualquer motivo, usa supabase.auth.getUser() como fallback.
        let resolvedUser: any = null;

        try {
            resolvedUser = await verifyJwtWithJwks(token);
        } catch (jwksErr) {
            console.warn('[Middleware] JWKS indisponível. Usando fallback:', jwksErr);
        }

        if (!resolvedUser) {
            // Fallback: validação remota via Supabase Auth
            const { data: userObj, error } = await retry(() => supabase.auth.getUser(token));
            if (error || !userObj?.user) {
                return withCors(new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 }));
            }
            resolvedUser = userObj;
        }

        // ── Proteção de rotas /admin ────────────────────────────────────────
        if (request.url.includes('/admin')) {
            const userId = resolvedUser.user.id;
            const now = Date.now();

            // Cache de permissões admin (evita query ao banco a cada request)
            let cached = adminCache.get(userId);
            if (!cached || (now - cached.timestamp) > ADMIN_CACHE_TTL_MS) {
                const { data: p } = await retry(async () =>
                    await supabase.from('profiles')
                        .select('is_admin, is_match_admin')
                        .eq('id', userId)
                        .single()
                );
                cached = { data: p, timestamp: now };
                adminCache.set(userId, cached);
            }

            const isSuperAdmin = cached.data?.is_admin === true;
            const isMatchAdmin = cached.data?.is_match_admin === true;

            if (!isSuperAdmin && !isMatchAdmin) {
                return withCors(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));
            }

            // Match admins têm acesso restrito a certos endpoints
            if (!isSuperAdmin && isMatchAdmin &&
                !request.url.includes('/admin/matches') &&
                !request.url.includes('/admin/brasileirao-matches') &&
                !request.url.includes('/admin/brazil-match-goals') &&
                !request.url.includes('/admin/send-mass-push') &&
                !request.url.includes('/admin/broadcast-push') &&
                !request.url.includes('/admin/push-reminder')
            ) {
                return withCors(new Response(JSON.stringify({ error: 'Forbidden. Matches admin only.' }), { status: 403 }));
            }
        }

        // Passa o usuário resolvido para os handlers seguintes
        if (data) data.user = resolvedUser.user;

        const response = await next();
        return withCors(response);

    } catch (err) {
        // SECURITY: loga o erro completo no servidor, nunca expõe detalhes ao cliente
        console.error('[Middleware] Internal error:', err);
        return withCors(new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }));
    }
};
