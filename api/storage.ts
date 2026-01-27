import { jsonResponse, errorResponse, requireAuth, getUserClient } from './_utils/supabase';

export const config = {
    runtime: 'edge',
};

export default async function handler(req: Request) {
    if (req.method !== 'POST') return new Response("Method not allowed", { status: 405 });

    try {
        await requireAuth(req);
        const userClient = getUserClient(req);

        const { base64, folder, fileName } = await req.json();
        if (!base64 || !folder) return errorResponse(new Error("Missing base64 or folder"), 400);

        // Convert Base64 to Buffer/Uint8Array for Supabase
        const base64Data = base64.split(',')[1] || base64;
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const ext = 'jpg'; // Default to jpg for base64 uploads
        const name = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const filePath = `${folder}/${name}`;

        const { data, error } = await userClient.storage
            .from('Public')
            .upload(filePath, bytes, {
                cacheControl: '3600',
                upsert: true,
                contentType: 'image/jpeg'
            });

        if (error) throw error;

        const { data: { publicUrl } } = userClient.storage
            .from('Public')
            .getPublicUrl(filePath);

        return jsonResponse({ publicUrl });

    } catch (e: any) {
        return errorResponse(e);
    }
}
