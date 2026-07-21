import { getSupabaseClient, jsonResponse, errorResponse } from '../_shared';

export const onRequest = async ({ request, env }: { request: Request; env: any }) => {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await request.json() as any;
        const { emails } = body;

        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            return errorResponse(new Error('emails array is required'), 400);
        }

        const adminClient = getSupabaseClient(env);
        
        // Data fixa solicitada: 31/12/2026 às 23:00 (Fuso de Brasília: -03:00)
        const proExpiresAt = "2026-12-31T23:00:00-03:00";

        const { data, error } = await adminClient
            .from('profiles')
            .update({ 
                is_pro: true,
                pro_expires_at: proExpiresAt
            })
            .in('email', emails)
            .select('id, email');

        if (error) throw error;

        const successfulEmails = data ? data.map(d => d.email.toLowerCase()) : [];
        const missingEmails = emails.filter((email: string) => !successfulEmails.includes(email.toLowerCase().trim()));

        return jsonResponse({ 
            success: true, 
            count: data?.length || 0, 
            missingEmails,
            data 
        });
    } catch (e: any) {
        return errorResponse(e);
    }
};
