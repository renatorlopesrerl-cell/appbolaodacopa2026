import { createClient } from '@supabase/supabase-js';

// Configuration provided by user
const SUPABASE_URL = 'https://sjianpqzozufnobftksp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWFucHF6b3p1Zm5vYmZ0a3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjA4MjIsImV4cCI6MjA4MjAzNjgyMn0.bcrW8xvags_6dOYhN_fQqrI_AR4gGfZaBDeCSqA5Ch8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);