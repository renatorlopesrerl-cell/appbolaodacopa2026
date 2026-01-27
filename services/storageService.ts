
import { supabase } from './supabase'; // Keep for auth session if needed, but we used api.ts pattern.

/**
 * Uploads a Base64 image string to Supabase Storage via API Routes.
 */
export const uploadBase64Image = async (base64: string, folder: string): Promise<string> => {
    if (base64.startsWith('http')) return base64;

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    console.log(`Sending upload request to /api/storage for folder: ${folder}...`);
    const response = await fetch('/api/storage', {
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

// Keep for compatibility but recommended to use uploadBase64Image
export const uploadImage = async (file: File | Blob, folder: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            uploadBase64Image(reader.result as string, folder).then(resolve).catch(reject);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

