
import { getUserClient, jsonResponse, errorResponse } from './_shared';

export const onRequest = async ({ request, env }: { request: Request, env: any }) => {
    if (request.method !== 'POST') return new Response("Method not allowed", { status: 405 });

    try {
        const userClient = getUserClient(env, request);
        const { base64, folder, fileName } = await request.json() as any;

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

        // SECURITY: Only allow image types
        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!ALLOWED_TYPES.includes(contentType)) {
            return errorResponse(new Error('Tipo de arquivo não permitido. Use JPEG, PNG, WEBP ou GIF.'), 400);
        }

        // SECURITY: Limit file size to 5MB (base64 is ~33% larger than binary)
        const MAX_SIZE_BYTES = 5 * 1024 * 1024;
        const estimatedBytes = Math.ceil((base64Data.length * 3) / 4);
        if (estimatedBytes > MAX_SIZE_BYTES) {
            return errorResponse(new Error('Arquivo muito grande. Tamanho máximo: 5MB.'), 400);
        }

        // Convert Base64 to Buffer/Uint8Array for Supabase
        const binary = atob(base64Data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        const ext = contentType.split('/')[1] || 'jpg';
        const name = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

        const bucketOverride = 'Public';
        const targetFolder = folder || 'uploads';
        const filePath = `${targetFolder}/${name}`;

        console.log(`Uploading to bucket: ${bucketOverride}, path: ${filePath}, type: ${contentType}`);

        const { error } = await userClient.storage
            .from(bucketOverride)
            .upload(filePath, bytes, {
                cacheControl: '31536000',
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
