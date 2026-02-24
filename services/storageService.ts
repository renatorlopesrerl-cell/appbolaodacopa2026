
import { supabase } from './supabase'; // Keep for auth session if needed, but we used api.ts pattern.

/**
 * Uploads a Base64 image string to Supabase Storage via API Routes.
 */
export const uploadBase64Image = async (base64: string, folder: string, oldImageUrl?: string): Promise<string> => {
    if (base64.startsWith('http')) return base64;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Delete old image if it exists and is not a default/placeholder
    if (oldImageUrl && !oldImageUrl.includes('dicebear') && !oldImageUrl.includes('placehold') && !oldImageUrl.includes('flagcdn')) {
        // Firing and forgetting the delete to not block upload
        deleteImage(oldImageUrl).catch(err => console.warn("Background delete failed", err));
    }

    const isCapacitor = (window as any).Capacitor !== undefined;
    const PRODUCAO_URL = 'https://bolaodacopa2026.app';
    const storageEndpoint = isCapacitor ? `${PRODUCAO_URL}/api/storage` : '/api/storage';

    console.log(`Sending upload request to ${storageEndpoint} for folder: ${folder}...`);
    const response = await fetch(storageEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ base64, folder })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        console.error("Upload fetch failed:", error);
        throw new Error(error.error || 'Upload failed');
    }

    const { publicUrl } = await response.json();
    console.log("Upload successful, Public URL:", publicUrl);
    return publicUrl;
};

/**
 * Deletes an image from Supabase Storage given its public URL.
 */
export const deleteImage = async (publicUrl: string): Promise<void> => {
    if (!publicUrl) return;

    // Extract file path from URL
    // URL format: .../storage/v1/object/public/[bucket]/[folder]/[filename]
    // OR: .../storage/v1/object/public/[bucket]/[filename] if at root
    // We need to parse this carefully or just send the URL to backend to parse.
    // Let's send the URL to the backend delete endpoint.

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const isCapacitor = (window as any).Capacitor !== undefined;
    const PRODUCAO_URL = 'https://appbolaodacopa2026.app';
    const deleteEndpoint = isCapacitor ? `${PRODUCAO_URL}/api/storage/delete` : '/api/storage/delete';

    console.log(`Sending delete request to ${deleteEndpoint} for URL: ${publicUrl}...`);
    try {
        const response = await fetch(deleteEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ url: publicUrl })
        });

        if (!response.ok) {
            console.warn(`Failed to delete old image: ${publicUrl}`, await response.text());
        } else {
            console.log(`Successfully deleted old image: ${publicUrl}`);
        }
    } catch (e) {
        console.error("Delete image fetch error:", e);
        // Don't throw, deletion failure shouldn't block main flow
    }
};

// Keep for compatibility but recommended to use uploadBase64Image
export const uploadImage = async (file: File | Blob, folder: string, oldImageUrl?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            uploadBase64Image(reader.result as string, folder, oldImageUrl).then(resolve).catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

