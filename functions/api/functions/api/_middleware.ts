import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
)

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

export const onRequest = async ({ request, next }) => {
    const authHeader = request.headers.get('Authorization')

    if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const { data: userData, error } = await retry(() =>
        supabase.auth.getUser(token)
    )

    if (error || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401 })
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
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
        }
    }

    request.user = userData.user
  if (!request.url.includes('/api')) {
    return next()
  }

  // valida token só para API
}
