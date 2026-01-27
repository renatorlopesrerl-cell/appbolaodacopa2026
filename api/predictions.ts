import { supabase, withRetry, jsonResponse, errorResponse } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        if (req.method === 'GET') {
            const data = await withRetry(async () => {
                return await supabase.from('predictions').select('*');
            });
            return jsonResponse(data);
        }

        if (req.method === 'POST') {
            // Submit Prediction
            const authHeader = req.headers.get('Authorization');
            if (!authHeader) return errorResponse(new Error("Unauthorized"));

            // Ideally we check user session
            const body = await req.json();

            // Bulk upsert or single? App does single usually, or bulk?
            // Let's support array or object.
            const updates = Array.isArray(body) ? body : [body];

            const { error } = await supabase.from('predictions').upsert(updates);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
