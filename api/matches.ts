import { supabase, withRetry, jsonResponse, errorResponse } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    try {
        if (req.method === 'GET') {
            const data = await withRetry(async () => {
                return await supabase.from('matches').select('*').order('date', { ascending: true });
            });
            return jsonResponse(data);
        }
        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
