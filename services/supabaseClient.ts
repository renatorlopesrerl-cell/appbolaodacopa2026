import { createClient } from '@supabase/supabase-js';


const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Missing Supabase credentials. check .env file');
}

// Singleton Pattern for HMR:
// During development, HMR may reload this module, re-initializing the client.
// We attach the client to the global window object to persist the connection across reloads.
declare global {
    var _supabaseInstance: ReturnType<typeof createClient> | undefined;
}

export const supabase = globalThis._supabaseInstance || createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (process.env.NODE_ENV !== 'production') {
    globalThis._supabaseInstance = supabase;
}

/**
 * Helper to execute Supabase requests with retry logic.
 * @param fn Async function that performs the Supabase request
 * @param retries Number of retries (default: 3)
 * @param delayMs Delay between retries in ms (default: 1000)
 */
export async function supabaseRequest<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
    try {
        return await fn();
    } catch (err) {
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, delayMs));
        console.warn(`Supabase request failed, retrying... (${retries} retries left)`);
        return supabaseRequest(fn, retries - 1, delayMs);
    }
}