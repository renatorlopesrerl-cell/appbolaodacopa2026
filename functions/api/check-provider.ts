import { getSupabaseClient, jsonResponse, errorResponse } from './_shared';

export const onRequestGet = async ({ request, env }: { request: Request, env: any }) => {
    try {
        const url = new URL(request.url);
        const email = url.searchParams.get('email');

        if (!email) {
            return errorResponse(new Error("Email parameter is required"), 400);
        }

        // Normalize email to match DB
        const normalizedEmail = email.trim().toLowerCase();

        const adminClient = getSupabaseClient(env);

        // 1. Get user UUID from profiles table using Service Role
        const { data: profile, error: profileError } = await adminClient
            .from('profiles')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (profileError || !profile) {
            // User not found in profiles
            return jsonResponse({ provider: 'not_found' });
        }

        // 2. Get user details from auth.users using admin API
        const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(profile.id);

        if (authError || !authData?.user) {
            return jsonResponse({ provider: 'not_found' });
        }

        // 3. Check if any of the linked identities is google
        const identities = authData.user.identities || [];
        const isGoogle = identities.some(id => id.provider === 'google');
        
        return jsonResponse({ 
            provider: isGoogle ? 'google' : 'email' 
        });

    } catch (e: any) {
        return errorResponse(e);
    }
}
