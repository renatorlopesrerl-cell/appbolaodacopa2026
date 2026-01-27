import { createClient } from '@supabase/supabase-js'

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.error("CRITICAL ERROR: SUPABASE_URL or SUPABASE_ANON_KEY is missing from environment variables!");
}

export const supabaseServer = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
)
