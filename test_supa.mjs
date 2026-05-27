import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://sjianpqzozufnobftksp.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWFucHF6b3p1Zm5vYmZ0a3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjA4MjIsImV4cCI6MjA4MjAzNjgyMn0.bcrW8xvags_6dOYhN_fQqrI_AR4gGfZaBDeCSqA5Ch8');
async function test() {
  const { data, error } = await supabase.from('profiles').select('id, name').limit(5);
  console.log('Profiles fetched:', data ? data.length : 0);
  console.log('Error:', error);
}
test();
