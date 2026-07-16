import { getUserClient, withRetry, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    try {
        const userClient = getUserClient(env, request);

        if (request.method === 'GET') {
            const data = await withRetry(async () => {
                return await userClient
                    .from('brasileirao_teams')
                    .select('*')
                    .order('name', { ascending: true });
            });
            return jsonResponse(data || []);
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
