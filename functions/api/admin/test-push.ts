import { jsonResponse, errorResponse, sendPushNotificationToUser } from '../_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const authUser = data.user;
        if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

        // Env check
        const fcmKey = env.FCM_SERVER_KEY;

        if (!fcmKey) {
            return jsonResponse({
                success: false,
                message: "ERRO: FCM_SERVER_KEY não configurada no Cloudflare.",
                debug: "Vá em Settings > Variables no Cloudflare e adicione FCM_SERVER_KEY."
            }, 200);
        }

        console.log(`Manual Test Push requested by ${authUser.id}`);

        await sendPushNotificationToUser(
            env,
            authUser.id,
            "Teste de Notificação 🚀",
            "Se você está vendo isso, o sistema de Push está funcionando!"
        );

        return jsonResponse({
            success: true,
            message: "Comando de teste enviado com sucesso!",
            details: "Verifique o log do Cloudflare para confirmar o resultado do FCM."
        });

    } catch (e: any) {
        return errorResponse(e);
    }
}
