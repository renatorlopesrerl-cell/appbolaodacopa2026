import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjianpqzozufnobftksp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWFucHF6b3p1Zm5vYmZ0a3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjA4MjIsImV4cCI6MjA4MjAzNjgyMn0.bcrW8xvags_6dOYhN_fQqrI_AR4gGfZaBDeCSqA5Ch8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.localStorage, // Capacitor persists via standard localStorage
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,    // Essential for OAuth/Magic Link callbacks
        flowType: 'pkce',
        storageKey: 'bolao-copa-native-v1'
    }
});