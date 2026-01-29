
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

            // Sanitize input: Prevent is_admin escalation or Id spoofing
            const safeBody: any = {
                id: authUser.id, // Enforce ID
                name: body.name,
                avatar: body.avatar,
                whatsapp: body.whatsapp,
                pix: body.pix,
                theme: body.theme,
                notification_settings: body.notification_settings
            };

            // Remove undefined keys
            Object.keys(safeBody).forEach(key => safeBody[key] === undefined && delete safeBody[key]);

            const { error } = await userClient.from('profiles').upsert(safeBody);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
