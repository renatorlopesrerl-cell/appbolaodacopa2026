import { jsonResponse, errorResponse, getSupabaseClient, processBulkNotifications } from '../_shared';

export const onRequest = async (context: any) => {
    const { request, env, data } = context;

    try {
        const authUser = data.user;
        if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

        // Somente Super Admin pode disparar broadcast
        const supabase = getSupabaseClient(env);
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_admin')
            .eq('id', authUser.id)
            .single();

        if (!profile?.is_admin) {
            return errorResponse(new Error("Forbidden"), 403);
        }

        if (request.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405);
        }

        const body = await request.json();
        const { action, title, message, tokens } = body;

        // Action: Obter todos os tokens para o frontend orquestrar os lotes
        if (action === 'get_tokens') {
            const fetchAll = async (table: string, column: string) => {
                let allRows: any[] = [];
                let hasMore = true;
                let page = 0;
                const PAGE_SIZE = 1000;
                while (hasMore) {
                    const { data, error } = await supabase
                        .from(table)
                        .select(column)
                        .order(column)
                        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                    if (error) throw error;
                    if (data && data.length > 0) {
                        allRows.push(...data);
                        page++;
                        if (data.length < PAGE_SIZE) hasMore = false;
                    } else {
                        hasMore = false;
                    }
                }
                return allRows;
            };

            const tokenRows = await fetchAll('user_fcm_tokens', 'token');
            let allTokens = [...new Set((tokenRows || []).map((r: any) => r.token).filter((t: string) => t && t.trim() !== ''))];

            const profileRows = await fetchAll('profiles', 'fcm_token');
            if (profileRows) {
                profileRows.forEach((p: any) => {
                    if (p.fcm_token && p.fcm_token.trim() !== '' && !allTokens.includes(p.fcm_token)) {
                        allTokens.push(p.fcm_token);
                    }
                });
            }

            return jsonResponse({ 
                success: true, 
                tokens: allTokens 
            });
        }

        // Action: Enviar um lote específico de tokens
        if (action === 'send_chunk') {
            if (!title || !message || !tokens || !Array.isArray(tokens)) {
                return jsonResponse({ error: 'Title, message e array de tokens são obrigatórios para send_chunk' }, 400);
            }

            const result = await processBulkNotifications(env, tokens, title, message);
            
            return jsonResponse({ 
                success: true, 
                message: 'Lote encaminhado para Edge Function',
                result
            });
        }

        // Action: Obter todos os tokens de lembrete de palpite
        if (action === 'get_reminder_tokens') {
            // First get all profiles where notification_settings->predictionReminder is not false
            // Since it's jsonb, we have to fetch and filter, or use raw PostgREST jsonb filter
            // PostgREST syntax for jsonb: notification_settings->predictionReminder
            // Let's just fetch all profiles and filter in memory to be safe, or use Supabase filter
            
            const { data: profiles, error: profError } = await supabase
                .from('profiles')
                .select('id, notification_settings');
                
            if (profError) throw profError;
            
            // Filter profiles that have predictionReminder enabled (true or undefined/null)
            const userIds = profiles
                .filter(p => {
                    const settings = p.notification_settings || {};
                    return settings.predictionReminder !== false;
                })
                .map(p => p.id);
                
            if (userIds.length === 0) {
                 return jsonResponse({ success: true, tokens: [] });
            }

            // Get tokens for these users
            // Process in chunks of 500 to avoid URL length limit in .in()
            let allTokens: string[] = [];
            const CHUNK_SIZE = 500;
            
            for(let i=0; i < userIds.length; i+=CHUNK_SIZE) {
                 const chunkIds = userIds.slice(i, i+CHUNK_SIZE);
                 const { data: tokenRows } = await supabase
                    .from('user_fcm_tokens')
                    .select('token')
                    .in('user_id', chunkIds);
                    
                 if (tokenRows) {
                     allTokens.push(...tokenRows.map(r => r.token));
                 }
                 
                 // Fallback legacy
                 const { data: legacyRows } = await supabase
                    .from('profiles')
                    .select('fcm_token')
                    .in('id', chunkIds)
                    .not('fcm_token', 'is', null)
                    .neq('fcm_token', '');
                 
                 if (legacyRows) {
                     allTokens.push(...legacyRows.map(r => r.fcm_token));
                 }
            }
            
            const uniqueTokens = [...new Set(allTokens.filter(t => t && t.trim() !== ''))];
            
            return jsonResponse({ 
                success: true, 
                tokens: uniqueTokens 
            });
        }

        return jsonResponse({ error: 'Ação inválida' }, 400);

    } catch (e: any) {
        return errorResponse(e);
    }
}
