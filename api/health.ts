import { supabaseServer as supabase } from './_supabase';
import { jsonResponse } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        // Try a simple public query
        const { data, error, status } = await supabase.from('matches').select('count', { count: 'exact', head: true });

        return jsonResponse({
            status: error ? 'error' : 'ok',
            database: error ? error.message : 'connected',
            httpStatus: status,
            env: {
                hasUrl: !!process.env.SUPABASE_URL,
                hasKey: !!process.env.SUPABASE_ANON_KEY
            },
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return jsonResponse({ status: 'crash', error: e.message }, 500);
    }
}
