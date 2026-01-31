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
                user_id: userId,
                plano: "PRO",
            },
            notification_url: "https://bolaodacopa2026.pages.dev/api/webhook-mercadopago",
            statement_descriptor: "BOLAO COPA",
            external_reference: userId,
        };

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`
            },
            body: JSON.stringify(preferenceData)
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Mercado Pago API Error: ${response.status} ${response.statusText} - ${errorData}`);
        }

        const data: any = await response.json();

        // Using sandbox_init_point for testing as requested
        return new Response(JSON.stringify({ init_point: data.sandbox_init_point }), {
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
