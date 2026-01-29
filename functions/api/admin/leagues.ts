
import { getUserClient, jsonResponse, errorResponse } from '../../_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    try {
        // middleware handles admin check
        const userClient = getUserClient(env, request);

        if (request.method === 'DELETE') {
            const url = new URL(request.url);
            const id = url.searchParams.get('id');
            if (!id) throw new Error("ID required");

            const { error } = await userClient.from('leagues').delete().eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}
