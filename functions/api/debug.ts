
export const onRequest = async ({ env }: { env: any }) => {
    const status = {
        SUPABASE_URL: !!env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!env.SUPABASE_ANON_KEY,
        FCM_SERVER_KEY: !!env.FCM_SERVER_KEY,
        NODE_VERSION: env.NODE_VERSION || 'unknown'
    };

    return new Response(JSON.stringify(status, null, 2), {
        headers: { 'Content-Type': 'application/json' }
    });
};
