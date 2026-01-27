import { supabase, withRetry, jsonResponse, errorResponse, requireAdmin } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        const url = new URL(req.url);

        if (req.method === 'GET') {
            // GET /api/leagues
            const data = await withRetry(async () => {
                return await supabase.from('leagues').select('*').order('created_at', { ascending: false });
            });

            // Basic filtering to remove [EXCLUÍDA] if needed, though usually Client handles view logic.
            // Let's filter server side for cleanliness.
            const cleanLeagues = (data as any[])?.filter(l => !l.name.includes('[EXCLUÍDA]')) || [];
            return jsonResponse(cleanLeagues);
        }

        if (req.method === 'POST') {
            // Create or Join logic
            // To properly secure "Create", we should check Auth.
            // But for now, we follow the pattern: Client checks auth, passes token.

            // Extract Action from query or body? 
            // Simplified: POST usually means Create in REST. 
            // Join could be a separate endpoint or action.
            // Let's assume standard REST: POST = Create.

            const user = await requireAdmin(req).catch(() => null) || null; // Just check AUth, admin not strictly required to create league usually, but let's check basic Auth.
            // Actually `requireAdmin` enforces Admin. We just need `requireAuth`.
            // Let's reimplement a simple `requireAuth` inside here or use the token.

            const authHeader = req.headers.get('Authorization');
            if (!authHeader) return errorResponse(new Error("Unauthorized"));
            const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (!authUser) return errorResponse(new Error("Unauthorized"));

            // Parse Body
            const body = await req.json();

            // Insert
            const { error } = await supabase.from('leagues').insert([body]);
            if (error) throw error;

            return jsonResponse({ success: true }, 201);
        }

        if (req.method === 'PUT') {
            // Update League (Owner only)
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) return errorResponse(new Error("Unauthorized"), 401);
            const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

            const body = await req.json();
            const { id, ...updates } = body;
            if (!id) return errorResponse(new Error("League ID required"), 400);

            // Verify Ownership
            const { data: league, error: fetchError } = await supabase.from('leagues').select('admin_id').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);
            if (league.admin_id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await supabase.from('leagues').update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        if (req.method === 'DELETE') {
            // Soft Delete League (Owner only)
            const url = new URL(req.url);
            const id = url.searchParams.get('id');
            const authHeader = req.headers.get('Authorization');

            if (!authHeader) return errorResponse(new Error("Unauthorized"), 401);
            const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (!authUser) return errorResponse(new Error("Unauthorized"), 401);
            if (!id) return errorResponse(new Error("League ID required"), 400);

            // Verify Ownership
            const { data: league, error: fetchError } = await supabase.from('leagues').select('admin_id, name').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);
            if (league.admin_id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            // Soft Delete
            const { error } = await supabase.from('leagues').update({
                name: `${league.name} [EXCLUÍDA]`,
                participants: [],
                pending_requests: []
            }).eq('id', id);

            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}
