import { supabase, withRetry, jsonResponse, errorResponse } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        if (req.method === 'GET') {
            const url = new URL(req.url);
            const id = url.searchParams.get('id');

            if (id) {
                const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
                if (error) return errorResponse(error, 404);
                return jsonResponse(data);
            }

            // Default: List all
            const data = await withRetry(async () => {
                return await supabase.from('profiles').select('*');
            });
            return jsonResponse(data);
        }

        if (req.method === 'POST') {
            // Update Profile
            // Verify Auth
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) return errorResponse(new Error("Unauthorized"));
            const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
            if (!user) return errorResponse(new Error("Unauthorized"));

            const body = await req.json();

            // Ensure user only updates their own profile
            if (body.id !== user.id) return errorResponse(new Error("Forbidden"));

            const { error } = await supabase.from('profiles').upsert(body);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
