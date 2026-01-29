
import { getUserClient, withRetry, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const authUser = data.user;
        const userClient = getUserClient(env, request);

        if (request.method === 'GET') {
            const url = new URL(request.url);
            const id = url.searchParams.get('id');

            if (id) {
                const { data, error } = await userClient.from('profiles').select('*').eq('id', id).single();
                if (error) return errorResponse(error, 404);
                return jsonResponse(data);
            }

            // Default: List all (respecting RLS)
            const data = await withRetry(async () => {
                return await userClient.from('profiles').select('*');
            });
            return jsonResponse(data);
        }

        if (request.method === 'POST') {
            const body = await request.json() as any;

            // Ensure user only updates their own profile
            if (body.id !== authUser.id) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await userClient.from('profiles').upsert(body);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
