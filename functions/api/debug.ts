
import { createClient } from '@supabase/supabase-js';

export const onRequest = async ({ env }: { env: any }) => {
    const url = env.SUPABASE_URL || '';
    const key = env.SUPABASE_ANON_KEY || '';
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    // Cloudflare FCM Keys (FCM v1)
    const fcmClientEmail = env.FCM_CLIENT_EMAIL || '';
    const fcmPrivateKey = env.FCM_PRIVATE_KEY || '';
    const fcmProjectId = env.FCM_PROJECT_ID || '';

    // Testing DB access
    let supabaseStatus = "Checking...";
    let profilesCount = 0;
    let tokensCount = 0;

    try {
        const supabase = createClient(url, serviceKey || key);
        const { data: profs, error: pErr } = await supabase.from('profiles').select('id', { count: 'exact' });
        const { data: toks, error: tErr } = await supabase.from('user_fcm_tokens').select('token', { count: 'exact' });
        
        profilesCount = profs?.length || 0;
        tokensCount = toks?.length || 0;
        supabaseStatus = (pErr || tErr) ? `Error: ${pErr?.message || tErr?.message}` : "Connected Successfully";
    } catch (e: any) {
        supabaseStatus = `Exception: ${e.message}`;
    }

    const report = {
        timestamp: new Date().toISOString(),
        environment: {
            SUPABASE_URL: !!url,
            SUPABASE_ANON_KEY: !!key,
            SUPABASE_SERVICE_ROLE_KEY: !!serviceKey,
            FCM_V1_CONFIGURED: !!(fcmClientEmail && fcmPrivateKey && fcmProjectId)
        },
        database_health: {
            connection: supabaseStatus,
            total_profiles: profilesCount,
            total_tokens_registered: tokensCount
        },
        tips: tokensCount === 0 ? "⚠️ No tokens found! Users must click 'Sincronizar este dispositivo' in their profile." : "Tokens are present. If notifications fail, check FCM credentials."
    };

    return new Response(JSON.stringify(report, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        }
    });
};
