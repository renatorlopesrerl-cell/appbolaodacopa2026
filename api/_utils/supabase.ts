import { createClient } from '@supabase/supabase-js';
import { supabaseServer as supabase } from '../_supabase';
export { supabase };

/**
 * Creates a Supabase client that uses the user's own JWT token.
 * This is essential for RLS to work correctly.
 */
export function getUserClient(req: Request) {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return supabase;

    return createClient(
        process.env.SUPABASE_URL || '',
        process.env.SUPABASE_ANON_KEY || '',
        {
            global: {
                headers: { 'Authorization': authHeader }
            }
        }
    );
}


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
        console.error("Supabase API Error after retries:", error.message || error);
        throw error; // Throw the actual error to see it in the frontend
    }
}


export { requireAuth, requireAdmin } from '../_auth';

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
