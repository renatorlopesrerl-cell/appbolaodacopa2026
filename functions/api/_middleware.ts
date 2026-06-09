import { createClient } from '@supabase/supabase-js'



async function retry(fn, attempts = 3) {
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn()
        } catch (err) {
            if (i === attempts - 1) throw err
            await new Promise(r => setTimeout(r, 500))
        }
    }
}

export const onRequest = async ({ request, env, next, data }) => {
    const originHeader = request.headers.get('Origin');
    const url = new URL(request.url);
    const isPushTest = url.pathname.includes('/admin/test-push');

    // CORS Configuration
    // 1. If it's a localhost origin (standard for Capacitor Android/iOS dev), echo it back.
    // 2. If it's our production domain, allow it.
    // 3. If it's a push test, allow *.
    // 4. Otherwise, block (origin: 'null') — prevents CSRF from third-party sites.
    let allowedOrigin = 'null';
    let allowCredentials = 'false';

    const PRODUCTION_ORIGIN = 'https://bolaodacopa2026.app';

    if (isPushTest) {
        allowedOrigin = '*';
        allowCredentials = 'false';
    } else if (!originHeader) {
        // No Origin header — likely a direct request from the APK (Capacitor native).
        // Allow it, but don't set Allow-Credentials since there's no origin to check.
        allowedOrigin = PRODUCTION_ORIGIN;
        allowCredentials = 'false';
    } else if (originHeader.includes('localhost') || originHeader.includes('127.0.0.1')) {
        allowedOrigin = originHeader;
        allowCredentials = 'true';
    } else if (originHeader === PRODUCTION_ORIGIN) {
        allowedOrigin = PRODUCTION_ORIGIN;
        allowCredentials = 'true';
    } else {
        // Unknown origin — reject CORS (still processes the request, but browser will block response)
        allowedOrigin = 'null';
        allowCredentials = 'false';
    }

    // Common Supabase and Auth headers used in web and mobile
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

    // Helper to add CORS to any response
    const withCors = (response) => {
        const res = new Response(response.body, response);
        res.headers.set('Access-Control-Allow-Origin', allowedOrigin);
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.headers.set('Access-Control-Allow-Headers', allowHeaders);
        res.headers.set('Access-Control-Allow-Credentials', allowCredentials);
        return res;
    };

    try {
        const isPublic = url.pathname.includes('/health') || 
                        url.pathname.includes('/push_webhook') || 
                        url.pathname.includes('/push_reminder');

        if (isPublic) {
            console.log(`[Middleware] Allowing public access to: ${url.pathname}`);
            const response = await next();
            return withCors(response);
        }

        const supabase = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_ANON_KEY
        )

        const authHeader = request.headers.get('Authorization')

        if (!authHeader) {
            return withCors(new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 }));
        }

        const token = authHeader.replace('Bearer ', '')

        const { data: userData, error } = await retry(() =>
            supabase.auth.getUser(token)
        )

        if (error || !userData?.user) {
            return withCors(new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 }));
        }

        // Admin protection
        if (request.url.includes('/admin')) {
            const { data: profile } = await retry(() =>
                supabase
                    .from('profiles')
                    .select('is_admin, is_match_admin')
                    .eq('id', userData.user.id)
                    .single()
            )

            const isSuperAdmin = profile?.is_admin === true;
            const isMatchAdmin = profile?.is_match_admin === true;

            if (!isSuperAdmin && !isMatchAdmin) {
                return withCors(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));
            }

            // Only Super Admins can access endpoints other than matches
            if (!isSuperAdmin && isMatchAdmin && !request.url.includes('/admin/matches')) {
                 return withCors(new Response(JSON.stringify({ error: 'Forbidden. Matches admin only.' }), { status: 403 }));
            }
        }

        // Pass user to next handler
        if (data) {
            data.user = userData.user;
        }

        const response = await next();
        return withCors(response);
    } catch (err) {
        // SECURITY: Log full error server-side, never expose technical details to client
        console.error('[Middleware] Internal error:', err);
        return withCors(new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }));
    }
}

