'use server';

import { createServerSupabase } from '@/utils/supabase/server';
import { supabaseAdmin, supabaseAdminStorage } from '@/utils/supabase-admin';
import { revalidatePath } from 'next/cache';

export async function addHeroArticle(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const title = formData.get('title') as string;
    const href = formData.get('href') as string;
    const kicker = formData.get('kicker') as string | null;
    const imageFile = formData.get('image') as File | null;

    if (!title || !href) {
      return 'Title and URL are required';
    }

    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return 'User profile not found';
    }
    
    if (userProfile.is_admin !== true) {
      return 'Not authorized';
    }

    let imagePath: string | null = null;

    // Handle image upload if provided
    if (imageFile && imageFile.size > 0) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(imageFile.type)) {
        return 'Invalid image type. Please upload JPEG, PNG, or WebP.';
      }

      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024;
      if (imageFile.size > maxSize) {
        return 'Image size exceeds 10MB limit.';
      }

      try {
        // Get file extension
        const ext = imageFile.name.split('.').pop() || 
                   (imageFile.type === 'image/jpeg' ? 'jpg' : 
                    imageFile.type === 'image/png' ? 'png' : 
                    imageFile.type === 'image/webp' ? 'webp' : 'jpg');
        
        // Generate unique filename
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const storagePath = fileName;

        // Convert File to ArrayBuffer
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdminStorage.storage
          .from('hero-images')
          .upload(storagePath, buffer, {
            contentType: imageFile.type,
            upsert: false
          });

        if (uploadError) {
          console.error('Error uploading hero image:', uploadError);
          return `Failed to upload image: ${uploadError.message}`;
        }

        if (!uploadData) {
          return 'Image upload failed: No data returned';
        }

        imagePath = storagePath;
      } catch (uploadErr) {
        console.error('Error uploading hero image:', uploadErr);
        return `Failed to upload image: ${uploadErr instanceof Error ? uploadErr.message : 'Unknown error'}`;
      }
    }

    if (!imagePath) {
      return 'Image is required';
    }

    // Get max display_order to add new item at the end
    const { data: maxOrderData } = await supabaseAdmin
      .from('hero_articles')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextOrder = (maxOrderData?.display_order ?? -1) + 1;

    // Insert hero article
    const { error: insertError } = await supabaseAdmin
      .from('hero_articles')
      .insert({
        title,
        image_path: imagePath,
        href,
        kicker: kicker || null,
        display_order: nextOrder
      });

    if (insertError) {
      // If insert failed and we uploaded an image, try to clean it up
      if (imagePath) {
        await supabaseAdminStorage.storage
          .from('hero-images')
          .remove([imagePath]);
      }
      return `Failed to add hero article: ${insertError.message}`;
    }
    
    revalidatePath('/admin/hero');
    revalidatePath('/');
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}

export async function deleteHeroArticle(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const articleId = formData.get('articleId') as string;
    
    if (!articleId) {
      return 'Article ID is required';
    }
    
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return 'User profile not found';
    }
    
    if (userProfile.is_admin !== true) {
      return 'Not authorized';
    }

    // Fetch article to get image_path before deletion
    const { data: article, error: fetchError } = await supabaseAdmin
      .from('hero_articles')
      .select('image_path')
      .eq('id', articleId)
      .single();

    if (fetchError) {
      return `Article not found: ${fetchError.message}`;
    }

    // Delete the article
    const { error: deleteError } = await supabaseAdmin
      .from('hero_articles')
      .delete()
      .eq('id', articleId);
    
    if (deleteError) {
      return `Failed to delete article: ${deleteError.message}`;
    }

    // Delete image from storage if it exists (best effort)
    if (article?.image_path) {
      try {
        const { error: storageError } = await supabaseAdminStorage.storage
          .from('hero-images')
          .remove([article.image_path]);

        if (storageError) {
          console.error('Error deleting hero image from storage:', storageError);
          // Don't fail if storage delete fails
        }
      } catch (storageErr) {
        console.error('Error deleting hero image from storage:', storageErr);
        // Don't fail if storage delete fails
      }
    }
    
    revalidatePath('/admin/hero');
    revalidatePath('/');
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}

export async function reorderHeroArticles(prevState: string | null, formData: FormData): Promise<string | null> {
  try {
    const orderData = formData.get('order') as string;
    
    if (!orderData) {
      return 'Order data is required';
    }

    let orderArray: Array<{ id: string; display_order: number }>;
    try {
      orderArray = JSON.parse(orderData);
    } catch (parseError) {
      return 'Invalid order data format';
    }
    
    const supabase = await createServerSupabase();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return 'Not authenticated';
    }
    
    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (profileError || !userProfile) {
      return 'User profile not found';
    }
    
    if (userProfile.is_admin !== true) {
      return 'Not authorized';
    }

    // Update all articles with new display_order values
    // Use a transaction-like approach by updating each article
    for (const item of orderArray) {
      const { error: updateError } = await supabaseAdmin
        .from('hero_articles')
        .update({ display_order: item.display_order })
        .eq('id', item.id);

      if (updateError) {
        return `Failed to update order: ${updateError.message}`;
      }
    }
    
    revalidatePath('/admin/hero');
    revalidatePath('/');
    return null; // Success
  } catch (error) {
    return error instanceof Error ? error.message : 'An unexpected error occurred';
  }
}
