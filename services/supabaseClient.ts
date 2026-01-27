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