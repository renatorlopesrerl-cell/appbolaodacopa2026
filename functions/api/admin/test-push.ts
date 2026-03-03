import { jsonResponse, errorResponse, sendPushNotificationToUser } from '../_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const authUser = data.user;
        if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

        // Env check (FCM v1)
        const hasV1Keys = env.FCM_CLIENT_EMAIL && env.FCM_PRIVATE_KEY;

        if (!hasV1Keys) {
            return jsonResponse({
                success: false,
                message: "ERRO: Credenciais FCM v1 não configuradas no Cloudflare.",
                debug: "Certifique-se de que FCM_CLIENT_EMAIL e FCM_PRIVATE_KEY estão nas variáveis de ambiente."
            }, 200);
        }

        const result = await sendPushNotificationToUser(
            env,
            authUser.id,
            "Teste de Notificação 🚀",
            "Se você está vendo isso, o sistema de Push está funcionando!"
        );

        return jsonResponse(result);

    } catch (e: any) {
        return errorResponse(e);
    }
}
