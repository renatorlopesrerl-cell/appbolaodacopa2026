import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjianpqzozufnobftksp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqaWFucHF6b3p1Zm5vYmZ0a3NwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0NjA4MjIsImV4cCI6MjA4MjAzNjgyMn0.bcrW8xvags_6dOYhN_fQqrI_AR4gGfZaBDeCSqA5Ch8';

// Custom fetch com timeout de 20s para todas as chamadas diretas ao Supabase
const fetchWithTimeout = (input: RequestInfo | URL, init?: RequestInit) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
    return fetch(input, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: window.localStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storageKey: 'bolao-copa-native-v1'
    },
    // Desabilita realtime (não utilizado) para evitar conexões WebSocket desnecessárias
    realtime: {
        params: {
            eventsPerSecond: -1  // desativa conexão automática de realtime
        }
    },
    global: {
        fetch: fetchWithTimeout
    }
});