import { supabaseServer as supabase } from './_supabase';
import { jsonResponse } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        return jsonResponse({
            status: 'unauthorized',
            error: 'No Authorization header',
            env: {
                hasUrl: !!process.env.SUPABASE_URL,
                hasKey: !!process.env.SUPABASE_ANON_KEY
            }
        }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error) {
            return jsonResponse({
                status: 'error',
                error: error.message,
                code: error.status,
                tokenPrefix: token.substring(0, 10) + '...'
            }, 401);
        }

        if (!user) {
            return jsonResponse({ status: 'unauthorized', error: 'No user returned' }, 401);
        }

        return jsonResponse({
            status: 'success',
            user: { id: user.id, email: user.email },
            env: {
                hasUrl: !!process.env.SUPABASE_URL,
                hasKey: !!process.env.SUPABASE_ANON_KEY
            }
        });
    } catch (e: any) {
        return jsonResponse({ status: 'crash', error: e.message }, 500);
    }
}
