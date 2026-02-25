
import { createClient } from '@supabase/supabase-js';

export const onRequest = async ({ env }: { env: any }) => {
    const url = env.SUPABASE_URL || '';
    const key = env.SUPABASE_ANON_KEY || '';
    const fcm = env.FCM_SERVER_KEY || '';

    // Test connection
    let supabaseError = null;
    try {
        const supabase = createClient(url, key);
        const { error } = await supabase.from('profiles').select('id').limit(1);
        supabaseError = error ? error.message : "Connection Success";
    } catch (e: any) {
        supabaseError = e.message;
    }

    const status = {
        SUPABASE_URL: {
            present: !!url,
            length: url.length,
            startsWithHttps: url.startsWith('https://'),
            hasWhitespace: url !== url.trim()
        },
        SUPABASE_ANON_KEY: {
            present: !!key,
            length: key.length,
            hasWhitespace: key !== key.trim()
        },
        FCM_SERVER_KEY: {
            present: !!fcm,
            length: fcm.length,
            hasWhitespace: fcm !== fcm.trim()
        },
        TEST_CONNECTION: supabaseError,
        NODE_VERSION: env.NODE_VERSION || 'unknown'
    };

    return new Response(JSON.stringify(status, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};
