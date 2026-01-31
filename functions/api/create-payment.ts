import { MercadoPagoConfig, Preference } from 'mercadopago';

export const onRequestPost = async (context) => {
    try {
        const { request, env } = context;
        const body = await request.json();
        const { userId } = body as { userId: string };

        if (!userId) {
            return new Response(JSON.stringify({ error: 'User ID is required' }), { status: 400 });
        }

        if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
            return new Response(JSON.stringify({ error: 'Server misconfiguration: Missing MP Token' }), { status: 500 });
        }

        const client = new MercadoPagoConfig({ accessToken: env.MERCADO_PAGO_ACCESS_TOKEN });
        const preference = new Preference(client);

        const preferenceData = {
            items: [
                {
                    id: 'pro-plan',
                    title: 'Bolão Copa 2026 - Plano PRO',
                    quantity: 1,
                    unit_price: 5.99,
                    currency_id: 'BRL',
                    description: 'Acesso a estatísticas e simulador PRO'
                },
            ],
            back_urls: {
                success: "https://bolaodacopa2026.pages.dev/pagamento/sucesso",
                failure: "https://bolaodacopa2026.pages.dev/pagamento/erro",
                pending: "https://bolaodacopa2026.pages.dev/pagamento/pendente",
            },
            auto_return: "approved",
            metadata: {
                user_id: userId, // Snake case is safer for MP metadata
                plano: "PRO",
            },
            notification_url: "https://bolaodacopa2026.pages.dev/api/webhook-mercadopago",
            statement_descriptor: "BOLAO COPA",
            external_reference: userId, // Backup ID
        };

        const response = await preference.create({ body: preferenceData });

        return new Response(JSON.stringify({ init_point: response.init_point }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Mercado Pago Error:', error);
        return new Response(JSON.stringify({
            error: 'Failed to create payment preference',
            details: error instanceof Error ? error.message : JSON.stringify(error)
        }), { status: 500 });
    }
};
