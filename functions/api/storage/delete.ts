
import { createClient } from '@supabase/supabase-js';

export const onRequest = async (context: any) => {
    const { request, env } = context;

    if (request.method !== 'POST') {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        const { url } = await request.json();

        if (!url) {
            return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
        }

        // Parse path from URL
        // URL format: .../storage/v1/object/public/[bucket]/[folder]/[filename]
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/public/');

        if (pathParts.length < 2) {
            return new Response(JSON.stringify({ error: "Invalid public URL format" }), { status: 400 });
        }

        const fullPath = pathParts[1]; // [bucket]/[folder]/[filename] or [bucket]/[filename]
        const bucket = fullPath.split('/')[0];
        const filePath = fullPath.substring(bucket.length + 1);

        console.log(`Deleting: Bucket=${bucket}, Path=${filePath}`);

        // Initialize Supabase Client (Service Role needed for deletion typically, or authenticated user)
        // Here we use the service role key from env to ensure we can delete anything
        // BE CAREFUL: This allows deleting any file if the correct URL is known.
        // Ideally we should check if the user owns the file, but for now we follow the request.

        const supabaseUrl = env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

        // Note: Client-side deletion often requires RLS policies allowing 'delete' for the user.
        // If this runs on server (Edge Function), we might use Service Role Key if available in env.

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { error } = await supabase
            .storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error("Supabase Delete Error:", error);
            return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e: any) {
        console.error("Delete Handler Exception:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
};
