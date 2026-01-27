import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("Missing Supabase Env Vars in API");
}

export const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

/**
 * Execute a Supabase query with automatic retry logic.
 * Retries up to 3 times with 1s delay.
 */
export async function withRetry<T>(fn: () => Promise<{ data: T | null; error: any }>, retries = 3): Promise<T | null> {
    try {
        const { data, error } = await fn();
        if (error) throw error;
        return data;
    } catch (error: any) {
        if (retries > 0) {
            await new Promise(res => setTimeout(res, 1000));
            return withRetry(fn, retries - 1);
        }
        console.error("Supabase API Error after retries:", error.message);
        throw new Error("Service Unavailable"); // Generic safe error
    }
}

/**
 * Validates if the request is authenticated and user is Admin.
 * Returns the user object if authorized, throws error otherwise.
 */
export async function requireAdmin(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) throw new Error("Unauthorized");

    // Check Admin Role in DB
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

    if (!profile || !profile.is_admin) {
        throw new Error("Forbidden");
    }

    return user;
}

/**
 * Standard API Response Helper
 */
export function jsonResponse(data: any, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

export function errorResponse(error: any, statusOverride?: number) {
    const status = statusOverride || (error.message === 'Unauthorized' ? 401 :
        error.message === 'Forbidden' ? 403 :
            error.message === 'Service Unavailable' ? 503 : 500);

    return jsonResponse({ error: error.message || "Internal Server Error" }, status);
}
