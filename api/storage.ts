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
        if (!base64) return errorResponse(new Error("Missing base64 data"), 400);

        // Detect content type and strip prefix
        let contentType = 'image/jpeg';
        let base64Data = base64;

        if (base64.startsWith('data:')) {
            const match = base64.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
                contentType = match[1];
                base64Data = match[2];
            }
        }

        // Convert Base64 to Buffer/Uint8Array for Supabase
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const ext = contentType.split('/')[1] || 'jpg';
        const name = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        // Use 'Public' as default bucket, and folder as path
        const bucketOverride = 'Public';
        const targetFolder = folder || 'uploads';
        const filePath = `${targetFolder}/${name}`;

        console.log(`Uploading to bucket: ${bucketOverride}, path: ${filePath}, type: ${contentType}`);

        const { data, error } = await userClient.storage
            .from(bucketOverride)
            .upload(filePath, bytes, {
                cacheControl: '3600',
                upsert: true,
                contentType: contentType
            });

        if (error) {
            console.error("Supabase Storage Error:", error);
            throw error;
        }

        const { data: { publicUrl } } = userClient.storage
            .from(bucketOverride)
            .getPublicUrl(filePath);

        return jsonResponse({ publicUrl, filePath });

    } catch (e: any) {
        console.error("Storage Handler Exception:", e);
        return errorResponse(e);
    }
}
