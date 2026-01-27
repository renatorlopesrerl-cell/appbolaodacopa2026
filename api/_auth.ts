import { supabaseServer as supabase } from './_supabase';

/**
 * Validates the Authorization header and returns the user object.
 * Throws an error if unauthorized.
 */
export async function requireAuth(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) throw new Error("Unauthorized");

    return user;
}

/**
 * Validates if the user is an admin.
 * Throws an error if not authorized or not admin.
 */
export async function requireAdmin(req: Request) {
    const user = await requireAuth(req);

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (error || !profile || !profile.is_admin) {
        throw new Error("Forbidden");
    }

    return user;
}
