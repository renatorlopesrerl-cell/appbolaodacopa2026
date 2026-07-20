import { jsonResponse, errorResponse, getSupabaseClient } from '../_shared';

/**
 * POST /api/admin/push-reminder
 * 
 * Triggers the push_reminder logic (sends reminder notifications to users).
 * Protected by the middleware: requires a valid JWT and is_admin OR is_match_admin role.
 * 
 * This replaces the old client-side call that used a hardcoded secret key in the URL.
 * The JWT from the authenticated user is used — the Worker middleware validates admin role.
 */
export const onRequest = async ({ request, env, data }: { request: Request; env: any; data: any }) => {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    try {
        const authUser = data.user;
        if (!authUser) return errorResponse(new Error('Unauthorized'), 401);

        const supabase = getSupabaseClient(env);

        // Verify admin role server-side (belt-and-suspenders, middleware also checks)
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin, is_match_admin')
            .eq('id', authUser.id)
            .single();

        if (!profile?.is_admin && !profile?.is_match_admin) {
            return errorResponse(new Error('Forbidden: admin role required'), 403);
        }

        // Forward to Supabase push-notification edge function with reminder action
        const pushUrl = `${env.SUPABASE_URL}/functions/v1/push-notification`;
        const response = await fetch(pushUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ action: 'push_reminder' })
        });

        const result = await response.json().catch(() => ({ message: 'No response body' }));

        return jsonResponse({ success: response.ok, result });
    } catch (e: any) {
        console.error('[admin/push-reminder] Error:', e);
        return errorResponse(e);
    }
};
