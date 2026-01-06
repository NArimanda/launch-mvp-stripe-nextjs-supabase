'use server';

import { supabaseAdmin } from '@/utils/supabase-admin';

/**
 * Generate a signed URL for a private storage object
 * @param imagePath - The storage path to the image (e.g., "user-id/comment-id.jpg")
 * @param expirySeconds - URL expiry time in seconds (default: 300 = 5 minutes)
 * @returns Signed URL string or null if generation fails
 */
export async function generateSignedImageUrl(
  imagePath: string,
  expirySeconds: number = 300
): Promise<string | null> {
  try {
    if (!imagePath) {
      console.error('[Storage] No image path provided');
      return null;
    }

    // Generate signed URL using admin client
    const { data, error } = await supabaseAdmin.storage
      .from('comment-images')
      .createSignedUrl(imagePath, expirySeconds);

    if (error) {
      console.error('[Storage] Error generating signed URL:', {
        error: error.message,
        imagePath: imagePath.substring(0, 50) + '...' // Log partial path only
      });
      return null;
    }

    if (!data?.signedUrl) {
      console.error('[Storage] No signed URL returned');
      return null;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('[Storage] Exception generating signed URL:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return null;
  }
}


