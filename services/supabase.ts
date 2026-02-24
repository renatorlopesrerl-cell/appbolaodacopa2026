import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjianpqzozufnobftksp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWFucHF6b3p1Zm5vYmZ0a3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjA4MjIsImV4cCI6MjA4MjAzNjgyMn0.bcrW8xvags_6dOYhN_fQqrI_AR4gGfZaBDeCSqA5Ch8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        autoRefreshToken: true,
        persistSession: true,
        storageKey: 'bolao-copa-native-v1',
        storage: window.localStorage
    }
});