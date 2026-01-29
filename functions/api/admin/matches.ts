
import { getUserClient, jsonResponse, errorResponse } from '../../_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    try {
        // middleware handles admin check
        const userClient = getUserClient(env, request);

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { id, ...updates } = body;

            if (!id) throw new Error("Match ID required");

            const { error } = await userClient.from('matches').update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
