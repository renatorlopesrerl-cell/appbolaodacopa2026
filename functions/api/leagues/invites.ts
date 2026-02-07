
import { getUserClient, jsonResponse, errorResponse } from '../_shared';

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

export const onRequest = async ({ request, env, data }: { request: Request, env: any, data: any }) => {
    try {
        const authUser = data.user;
        const userClient = getUserClient(env, request);

        if (request.method === 'GET') {
            const url = new URL(request.url);
            const email = url.searchParams.get('email');
            if (!email) return errorResponse(new Error("Email required"), 400);

            if (email.toLowerCase() !== authUser.email?.toLowerCase()) return errorResponse(new Error("Forbidden"), 403);

            const { data, error } = await userClient.from('league_invites').select('*').eq('email', email.toLowerCase()).eq('status', 'pending');
            if (error) throw error;
            return jsonResponse(data || []);
        }

        if (request.method === 'POST') {
            const body = await request.json() as any;
            const { action } = body;

            if (action === 'invite') {
                const { leagueId, email } = body;
                if (!leagueId || !email) return errorResponse(new Error("Missing arguments"), 400);

                const { data: league, error: fetchError } = await userClient.from('leagues').select('*').eq('id', leagueId).single();
                if (fetchError || !league) return errorResponse(new Error("League not found"), 404);

                const { data: existingUser } = await userClient.from('profiles').select('id').eq('email', email).maybeSingle();
                if (existingUser && league.participants.includes(existingUser.id)) {
                    return errorResponse(new Error("Usuário já participa desta liga"), 400);
                }

                // Check for existing pending invite
                const { data: existingInvite } = await userClient.from('league_invites')
                    .select('id')
                    .eq('league_id', leagueId)
                    .eq('email', email.toLowerCase())
                    .eq('status', 'pending')
                    .maybeSingle();

                if (existingInvite) {
                    return errorResponse(new Error("Convite já enviado para este usuário"), 400);
                }

                const limit = getLeagueLimit(league.settings);
                if (league.participants.length >= limit) return errorResponse(new Error("Limite de participantes da liga atingido"), 400);

                const { error } = await userClient.from('league_invites').insert({
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

                const { data: invite, error: fetchInviteError } = await userClient.from('league_invites').select('*').eq('id', inviteId).single();
                if (fetchInviteError || !invite) return errorResponse(new Error("Invite not found"), 404);

                if (invite.email.toLowerCase() !== authUser.email?.toLowerCase()) {
                    return errorResponse(new Error("Invite email does not match logged in user"), 403);
                }

                if (accept) {
                    const { data: league, error: fetchLeagueError } = await userClient.from('leagues').select('*').eq('id', invite.league_id).single();
                    if (fetchLeagueError || !league) return errorResponse(new Error("League not found"), 404);

                    // Check if already in league
                    if (league.participants.includes(authUser.id)) {
                        await userClient.from('league_invites').update({ status: 'accepted' }).eq('id', inviteId);
                        return jsonResponse({ success: true, message: "Joined league" });
                    }

                    const limit = getLeagueLimit(league.settings);
                    if (league.participants.length >= limit) return jsonResponse({ success: false, message: "League limit reached" }, 400);

                    const updatedParticipants = Array.from(new Set([...league.participants, authUser.id]));
                    const updatedPending = (league.pending_requests || []).filter((id: string) => id !== authUser.id);

                    await userClient.from('leagues').update({
                        participants: updatedParticipants,
                        pending_requests: updatedPending
                    }).eq('id', league.id);
                }

                await userClient.from('league_invites').update({ status: accept ? 'accepted' : 'rejected' }).eq('id', inviteId);

                return jsonResponse({ success: true, message: accept ? "Joined league" : "Invite rejected" });
            }

            return errorResponse(new Error("Invalid action"), 400);
        }

        return new Response("Method not allowed", { status: 405 });
    } catch (e: any) {
        return errorResponse(e);
    }
}
