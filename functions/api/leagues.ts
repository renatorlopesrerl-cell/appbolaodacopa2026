
import { getUserClient, getSupabaseClient, withRetry, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const url = new URL(request.url);
        const authUser = data.user;
        const userClient = getUserClient(env, request);

        if (request.method === 'GET') {
            const searchCode = url.searchParams.get('code');
            if (searchCode) {
                const data = await withRetry(async () => {
                    return await userClient.from('leagues').select('*').eq('league_code', searchCode.toUpperCase());
                });
                const cleanLeagues = (data as any[])?.filter(l => !l.name.includes('[EXCLUÍDA]')) || [];
                return jsonResponse(cleanLeagues);
            }

            // Check if user is admin
            const { data: profile } = await userClient
                .from('profiles')
                .select('is_admin')
                .eq('id', authUser.id)
                .single();
            const isAdmin = profile?.is_admin || false;

            // Paginate with .range() — PostgREST caps at 1000 rows per request
            const PAGE = 1000;
            const allLeagues: any[] = [];
            let offset = 0;

            while (true) {
                const pageData = await withRetry(async () => {
                    let query = userClient.from('leagues').select('*').order('id').range(offset, offset + PAGE - 1);
                    if (!isAdmin) {
                        query = query.or(`admin_id.eq.${authUser.id},participants.cs.{${authUser.id}},pending_requests.cs.{${authUser.id}},is_private.eq.false`);
                    }
                    return query;
                });

                if (!pageData || (pageData as any[]).length === 0) break;
                allLeagues.push(...(pageData as any[]));
                if ((pageData as any[]).length < PAGE) break;
                offset += PAGE;
            }

            // Filter out leagues with '[EXCLUÍDA]' in name
            const cleanLeagues = allLeagues.filter((l: any) => !l.name.includes('[EXCLUÍDA]'));
            return jsonResponse(cleanLeagues);

        }

        if (request.method === 'POST') {
            const body = await request.json() as any;

            if (!body.name || body.name.trim() === '') {
                return errorResponse(new Error("League name is required"), 400);
            }

            // Verify if a league with this name already exists
            const { data: existingLeagues } = await userClient
                .from('leagues')
                .select('id')
                .ilike('name', body.name.trim())
                .limit(1);

            if (existingLeagues && existingLeagues.length > 0) {
                return errorResponse(new Error("Já existe uma liga com este nome. Escolha outro."), 409);
            }

            const generatedId = `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const getLeagueCode = () => {
                let code = '';
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
                return code;
            };

            const safeLeague = {
                id: generatedId, // SECURITY: Always use server-generated ID, never trust client-supplied IDs
                league_code: body.league_code || getLeagueCode(),
                name: body.name,
                image: body.image,
                description: body.description,
                is_private: !!body.is_private,
                settings: body.settings || { isUnlimited: false, plan: 'FREE' },
                admin_id: authUser.id, // Enforce admin to be creator
                participants: [authUser.id], // Creator starts as participant
                pending_requests: []
            };

            const { error } = await userClient.from('leagues').insert([safeLeague]);
            if (error) throw error;
            return jsonResponse({ success: true, data: safeLeague }, 201);
        }

        if (request.method === 'PUT') {
            const body = await request.json() as any;
            const { id, ...updates } = body;
            if (!id) return errorResponse(new Error("League ID required"), 400);

            const adminClient = getSupabaseClient(env);

            // Verify Ownership (General Admin can bypass this check)
            const { data: league, error: fetchError } = await adminClient.from('leagues').select('admin_id').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);

            const { data: profile } = await adminClient
                .from('profiles')
                .select('is_admin')
                .eq('id', authUser.id)
                .single();
            const isAdmin = profile?.is_admin || false;

            if (league.admin_id !== authUser.id && !isAdmin) return errorResponse(new Error("Forbidden"), 403);

            // SECURITY: Prevent ownership hijacking
            delete updates.admin_id;
            delete updates.id;

            const { error } = await adminClient.from('leagues').update(updates).eq('id', id);
            if (error) throw error;

            return jsonResponse({ success: true });
        }

        if (request.method === 'DELETE') {
            const id = url.searchParams.get('id');
            if (!id) return errorResponse(new Error("League ID required"), 400);

            const adminClient = getSupabaseClient(env);

            // Verify Ownership (General Admin can bypass this check)
            const { data: league, error: fetchError } = await adminClient.from('leagues').select('admin_id, name').eq('id', id).single();
            if (fetchError || !league) return errorResponse(new Error("League not found"), 404);

            const { data: profile } = await adminClient
                .from('profiles')
                .select('is_admin')
                .eq('id', authUser.id)
                .single();
            const isAdmin = profile?.is_admin || false;

            if (league.admin_id !== authUser.id && !isAdmin) return errorResponse(new Error("Forbidden"), 403);

            const { error } = await adminClient.from('leagues').update({
                name: `${league.name} [EXCLUÍDA]`,
                participants: [],
                pending_requests: []
            }).eq('id', id);

            if (error) throw error;

            return jsonResponse({ success: true });
        }

        return new Response("Method not allowed", { status: 405 });

    } catch (e: any) {
        return errorResponse(e);
    }
}
