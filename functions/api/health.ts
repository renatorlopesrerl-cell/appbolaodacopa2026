
import { getSupabaseClient, jsonResponse } from './_shared';

export const onRequestGet = async ({ env }: { env: any }) => {
    try {
        const supabase = getSupabaseClient(env);

        // Try a simple public query
        const { error, status } = await supabase.from('matches').select('count', { count: 'exact', head: true });

        return jsonResponse({
            status: error ? 'error' : 'ok',
            platform: 'Cloudflare Pages',
            database: error ? error.message : 'connected',
            httpStatus: status,
            env: {
                hasUrl: !!env.SUPABASE_URL,
                hasKey: !!env.SUPABASE_ANON_KEY
            },
            timestamp: new Date().toISOString()
        });
    } catch (e: any) {
        return jsonResponse({ status: 'crash', error: e.message }, 500);
    }
}
