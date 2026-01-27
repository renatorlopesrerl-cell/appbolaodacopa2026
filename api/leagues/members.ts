import { supabase, withRetry, jsonResponse, errorResponse, requireAuth, getUserClient } from '../_utils/supabase';

export const config = {
    runtime: 'edge',
};

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
        const authUser = await requireAuth(req);
        const userClient = getUserClient(req);

        const { leagueId, userId, action } = await req.json();
        if (!leagueId || !userId || !action) return errorResponse(new Error("Missing arguments"), 400);

        // Fetch League
        const { data: league, error: fetchError } = await userClient.from('leagues').select('*').eq('id', leagueId).single();
        if (fetchError || !league) return errorResponse(new Error("League not found"), 404);

        const isAdmin = league.admin_id === authUser.id;
        const isSelf = authUser.id === userId;

        if (action === 'approve') {
            if (!isAdmin) return errorResponse(new Error("Forbidden"), 403);

            const limit = getLeagueLimit(league.settings);
            if (league.participants.length >= limit) return jsonResponse({ success: false, message: "League limit reached" }, 400);

            const updatedPending = league.pending_requests.filter((id: string) => id !== userId);
            const updatedParticipants = Array.from(new Set([...league.participants, userId]));

            await userClient.from('leagues').update({
                participants: updatedParticipants,
                pending_requests: updatedPending
            }).eq('id', leagueId);

            return jsonResponse({ success: true, message: "User approved" });
        }

        if (action === 'reject') {
            if (!isAdmin) return errorResponse(new Error("Forbidden"), 403);

            const updatedPending = league.pending_requests.filter((id: string) => id !== userId);
            await userClient.from('leagues').update({ pending_requests: updatedPending }).eq('id', leagueId);

            return jsonResponse({ success: true, message: "User rejected" });
        }

        if (action === 'remove') {
            if (!isAdmin && !isSelf) return errorResponse(new Error("Forbidden"), 403);

            const updatedParticipants = league.participants.filter((id: string) => id !== userId);
            await userClient.from('leagues').update({ participants: updatedParticipants }).eq('id', leagueId);

            return jsonResponse({ success: true, message: "User removed" });
        }

        return errorResponse(new Error("Invalid action"), 400);

    } catch (e: any) {
        return errorResponse(e);
    }
}

