
import { supabase } from './supabase';

const BUCKET_NAME = 'Public'; // Bucket name matches user's setup

/**
 * Converts a Base64 string to a Blob
 */
export const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
};

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * @param file The file object or Blob to upload
 * @param folder The folder path (e.g., 'avatars', 'leagues')
 * @param fileName (Optional) Specific filename. If not provided, a random one is generated.
 */
export const uploadImage = async (file: File | Blob, folder: string, fileName?: string): Promise<string> => {
    try {
        const ext = file.type.split('/')[1] || 'jpg';
        const name = fileName || `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
        const filePath = `${folder}/${name}`;

        // Upload to bucket
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        throw error;
    }
};

/**
 * Uploads a Base64 image string to Supabase Storage.
 * @param base64 The Base64 string (data:image/...)
 * @param folder The folder path
 */
export const uploadBase64Image = async (base64: string, folder: string): Promise<string> => {
    // If it's already a URL (http...), return it as is
    if (base64.startsWith('http')) return base64;

    const blob = base64ToBlob(base64);
    return uploadImage(blob, folder);
};
