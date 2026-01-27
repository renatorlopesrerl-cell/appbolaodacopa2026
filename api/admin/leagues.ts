import { supabase, withRetry, requireAdmin, jsonResponse, errorResponse } from '../../_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        await requireAdmin(req); // Enforce Admin

        if (req.method === 'DELETE') {
            const url = new URL(req.url);
            const id = url.searchParams.get('id');
            if (!id) throw new Error("ID required");

            // Mark as [EXCLUÍDA]? Or Hard Delete?
            // "Excluir" in logic usually implies soft delete or hard delete depending on rules.
            // App logic: `[EXCLUÍDA]` prefix used in other places.
            // Let's support Hard Delete via API as Admin has power.

            const { error } = await supabase.from('leagues').delete().eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}
