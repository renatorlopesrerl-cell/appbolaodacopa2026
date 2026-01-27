import { supabase, withRetry, jsonResponse, errorResponse } from '../_utils/supabase';

export const config = {
    runtime: 'edge',
};

// Helper: Replicate frontend limit logic
const getLeagueLimit = (settings: any) => {
    if (settings?.isUnlimited) return Infinity;
    const plan = settings?.plan || 'FREE';
    switch (plan) {
        case 'VIP_UNLIMITED': return Infinity;
        case 'VIP_MASTER': return 200;
        case 'VIP': return 100;
        case 'VIP_BASIC': return 50;
        case 'FREE':
        default: return 5;
    }
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response("Method not allowed", { status: 405 });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return errorResponse(new Error("Unauthorized"), 401);
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!user) return errorResponse(new Error("Unauthorized"), 401);

        const { id } = await req.json();
        if (!id) return errorResponse(new Error("League ID required"), 400);

        // Fetch League
        const { data: league, error: fetchError } = await supabase.from('leagues').select('*').eq('id', id).single();
        if (fetchError || !league) return errorResponse(new Error("League not found"), 404);

        // Check if already in
        if (league.participants.includes(user.id)) {
            return jsonResponse({ success: false, message: "Already a participant" }, 400);
        }

        // Check Limit
        const limit = getLeagueLimit(league.settings);
        if (league.participants.length >= limit) {
            return jsonResponse({ success: false, message: "League is full" }, 400);
        }

        // Logic
        let updates: any = {};
        if (league.is_private) {
            if (league.pending_requests.includes(user.id)) {
                return jsonResponse({ success: false, message: "Request already pending" }, 400);
            }
            updates = { pending_requests: [...league.pending_requests, user.id] };
        } else {
            updates = { participants: [...league.participants, user.id] };
        }

        const { error } = await supabase.from('leagues').update(updates).eq('id', id);
        if (error) throw error;

        return jsonResponse({ success: true, message: league.is_private ? "Request sent" : "Joined successfully" });

    } catch (e: any) {
        return errorResponse(e);
    }
}
