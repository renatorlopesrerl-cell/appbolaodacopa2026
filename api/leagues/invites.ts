import { supabase, withRetry, jsonResponse, errorResponse } from '../_utils/supabase';

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
    if (req.method !== 'POST' && req.method !== 'GET') return new Response("Method not allowed", { status: 405 });

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) return errorResponse(new Error("Unauthorized"), 401);
        const { data: { user: authUser } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!authUser) return errorResponse(new Error("Unauthorized"), 401);

        if (req.method === 'GET') {
            const url = new URL(req.url);
            const email = url.searchParams.get('email');
            if (!email) return errorResponse(new Error("Email required"), 400);

            // Security: Ensure one can only fetch their own invites?
            // Auth User Email check might be complex if they used different invite email.
            // But let's assume loose check for now or strict.
            // Strict: authUser.email === email.
            if (email.toLowerCase() !== authUser.email?.toLowerCase()) return errorResponse(new Error("Forbidden"), 403);

            const { data, error } = await supabase.from('league_invites').select('*').eq('email', email.toLowerCase()).eq('status', 'pending');
            if (error) throw error;
            return jsonResponse(data);
        }

        if (req.method === 'POST') {
            const body = await req.json();
            const { action } = body;

            if (action === 'invite') {
                const { leagueId, email } = body;
                if (!leagueId || !email) return errorResponse(new Error("Missing arguments"), 400);

                // Fetch League
                const { data: league, error: fetchError } = await supabase.from('leagues').select('*').eq('id', leagueId).single();
                if (fetchError || !league) return errorResponse(new Error("League not found"), 404);

                // Check if user exists (to check if already participant)
                const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
                if (existingUser && league.participants.includes(existingUser.id)) {
                    return jsonResponse({ success: false, message: "User already in league" }, 400);
                }

                // Check Limit
                const limit = getLeagueLimit(league.settings);
                if (league.participants.length >= limit) return jsonResponse({ success: false, message: "League limit reached" }, 400);

                // Send Invite
                const { error } = await supabase.from('league_invites').insert({
                    league_id: leagueId,
                    email: email.toLowerCase().trim(),
                    status: 'pending'
                });
                if (error) throw error;

                return jsonResponse({ success: true, message: "Invite sent" });
            }

            if (action === 'respond') {
                const { inviteId, accept } = body;
                if (!inviteId) return errorResponse(new Error("Missing inviteId"), 400);

                const { data: invite, error: fetchInviteError } = await supabase.from('league_invites').select('*').eq('id', inviteId).single();
                if (fetchInviteError || !invite) return errorResponse(new Error("Invite not found"), 404);

                // Verify email matches current user? 
                // In strict mode yes, but user email in auth might differ if they logged in with Google vs Email invite.
                // Let's trust authUser is the intended recipient if they have the invite ID (usually filtered by UI).
                // Better: Check if authUser.email == invite.email.
                if (invite.email.toLowerCase() !== authUser.email?.toLowerCase()) {
                    // Allow if invite email matches user email
                    // If not, potentially error or strict check. 
                    // Let's enforce it for security.
                    return errorResponse(new Error("Invite email does not match logged in user"), 403);
                }

                if (accept) {
                    const { data: league, error: fetchLeagueError } = await supabase.from('leagues').select('*').eq('id', invite.league_id).single();
                    if (fetchLeagueError || !league) return errorResponse(new Error("League not found"), 404);

                    // Check Limit
                    const limit = getLeagueLimit(league.settings);
                    if (league.participants.length >= limit) return jsonResponse({ success: false, message: "League limit reached" }, 400);

                    const updatedParticipants = Array.from(new Set([...league.participants, authUser.id]));
                    const updatedPending = league.pending_requests.filter((id: string) => id !== authUser.id);

                    await supabase.from('leagues').update({
                        participants: updatedParticipants,
                        pending_requests: updatedPending
                    }).eq('id', league.id);
                }

                // Update Invite Status
                await supabase.from('league_invites').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', inviteId);

                return jsonResponse({ success: true, message: accept ? "Joined league" : "Invite rejected" });
            }

            return errorResponse(new Error("Invalid action"), 400);

        }
    } catch (e: any) {
        return errorResponse(e);
    }
}
