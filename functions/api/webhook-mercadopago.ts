import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

export const onRequestPost = async (context) => {
    try {
        const { request, env } = context;
        const url = new URL(request.url);

        // Webhook can come as query param ?id=... or body.data.id depends on configuration
        // Mercado Pago usually posts to notification_url with ?topic=payment&id=123
        // Or body: { action: 'payment.created', data: { id: '123' } }

        const body: any = await request.json().catch(() => ({}));
        const queryParams = url.searchParams;

        let paymentId = body.data?.id;
        if (!paymentId && queryParams.get('type') === 'payment') {
            paymentId = queryParams.get('data.id');
        }

        // Sometimes MP sends just id in query
        if (!paymentId) paymentId = queryParams.get('id');

        if (!paymentId) {
            console.log('Webhook: No payment ID found', body, url.toString());
            return new Response('OK', { status: 200 }); // Return 200 to acknowledge anyway
        }

        if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
            console.error('Missing MP Token');
            return new Response('Config Error', { status: 500 });
        }

        const client = new MercadoPagoConfig({ accessToken: env.MERCADO_PAGO_ACCESS_TOKEN });
        const paymentClient = new Payment(client);

        const payment = await paymentClient.get({ id: paymentId });

        if (payment.status === 'approved') {
            const userId = payment.metadata?.user_id || payment.external_reference;

            if (userId && env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
                const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

                // Set expire date to 4 years from now (next cup) or just "forever" (null)
                // User asked for "2026-08-01" or similar. Let's do 2026-12-31 to be safe.
                const expiresAt = new Date('2026-12-31T23:59:59Z').toISOString();

                const { error } = await supabase.from('profiles').update({
                    is_pro: true,
                    pro_expires_at: expiresAt
                }).eq('id', userId);

                if (error) {
                    console.error('Supabase Update Error:', error);
                } else {
                    console.log(`User ${userId} upgraded to PRO`);
                }
            } else {
                console.error('Missing Supabase Config or User ID');
            }
        }

        return new Response('OK', { status: 200 });

    } catch (error) {
        console.error('Webhook Error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
};
