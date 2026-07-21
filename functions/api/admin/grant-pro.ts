import { getSupabaseClient, jsonResponse, errorResponse } from '../_shared';

export const onRequest = async ({ request, env }: { request: Request; env: any }) => {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const body = await request.json() as any;
        const { emails, userIds } = body;

        if ((!emails || !Array.isArray(emails) || emails.length === 0) && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
            return errorResponse(new Error('emails or userIds array is required'), 400);
        }

        const adminClient = getSupabaseClient(env);
        
        // Data fixa solicitada: 31/12/2026 às 23:00 (Fuso de Brasília: -03:00)
        const proExpiresAt = "2026-12-31T23:00:00-03:00";

        let query = adminClient
            .from('profiles')
            .update({ 
                is_pro: true,
                pro_expires_at: proExpiresAt
            });

        if (userIds && userIds.length > 0) {
            query = query.in('id', userIds);
        } else {
            query = query.in('email', emails);
        }

        const { data, error } = await query.select('id, email');

        if (error) throw error;

        let missingEmails: string[] = [];
        if (emails && emails.length > 0) {
            const successfulEmails = data ? data.map(d => d.email.toLowerCase()) : [];
            missingEmails = emails.filter((email: string) => !successfulEmails.includes(email.toLowerCase().trim()));
        }

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
