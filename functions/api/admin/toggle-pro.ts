import { getSupabaseClient, jsonResponse, errorResponse } from '../_shared';

/**
 * POST /api/admin/toggle-pro
 * Protected by middleware: requires is_admin.
 * Toggles is_pro for a given userId.
 * This endpoint exists so that is_pro can NEVER be changed
 * directly from the frontend via the Supabase ANON key.
 */
export const onRequest = async ({ request, env }: { request: Request; env: any }) => {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await request.json() as any;
        const { userId, isPro } = body;

        if (!userId || typeof isPro !== 'boolean') {
            return errorResponse(new Error('userId and isPro (boolean) are required'), 400);
        }

        const adminClient = getSupabaseClient(env);
        const { error } = await adminClient
            .from('profiles')
            .update({ is_pro: isPro })
            .eq('id', userId);

        if (error) throw error;

        return jsonResponse({ success: true, userId, isPro });
    } catch (e: any) {
        return errorResponse(e);
    }
};
