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
    const origin = request.headers.get('Origin') || '*';

    // Handle OPTIONS Preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': origin,
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-requested-with',
                'Access-Control-Allow-Credentials': 'true',
                'Access-Control-Max-Age': '86400',
            }
        });
    }

    // Helper to add CORS to any response
    const withCors = (response) => {
        const res = new Response(response.body, response);
        res.headers.set('Access-Control-Allow-Origin', origin);
        res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
        res.headers.set('Access-Control-Allow-Credentials', 'true');
        return res;
    };

    try {
        // Public routes (no auth required)
        if (request.url.includes('/health') || request.url.includes('/api/debug')) {
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
                    .select('is_admin')
                    .eq('id', userData.user.id)
                    .single()
            )

            if (!profile?.is_admin) {
                return withCors(new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }));
            }
        }

        // Pass user to next handler
        if (data) {
            data.user = userData.user;
        }

        const response = await next();
        return withCors(response);
    } catch (err) {
        return withCors(new Response(JSON.stringify({ error: err.message }), { status: 500 }));
    }
}

