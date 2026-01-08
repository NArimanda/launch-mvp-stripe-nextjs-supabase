import { NextResponse } from 'next/server';
import { supabaseAdmin, supabaseAdminStorage } from '@/utils/supabase-admin';
import { moderateComment } from '@/utils/moderation/openaiModeration';
import { generateSignedImageUrl } from '@/utils/supabase/storage';
import { createCommentWithCooldown } from '@/app/api/comments/actions';
import sharp from 'sharp';

export async function POST(request: Request) {
  try {
    // Parse FormData
    console.log('[Comment Submit] Received FormData request');
    const formData = await request.formData();
    
    // Log all FormData keys for debugging
    const formDataKeys: string[] = [];
    for (const key of formData.keys()) {
      formDataKeys.push(key);
    }
    console.log('[Comment Submit] FormData keys:', formDataKeys);
    
    // Extract text fields
    const user_id = formData.get('user_id') as string;
    const movie_id = formData.get('movie_id') as string;
    const parent_id = formData.get('parent_id') as string | null;
    const commentBody = formData.get('body') as string;
    const position_market_type = formData.get('position_market_type') as string | null;
    const position_selected_range = formData.get('position_selected_range') as string | null;
    const position_points = formData.get('position_points') as string | null;
    
    // Extract optional image file
    const imageFileRaw = formData.get('image');
    console.log('[Comment Submit] Image file extraction:', {
      hasImageField: !!imageFileRaw,
      imageType: imageFileRaw ? typeof imageFileRaw : 'null',
      isFile: imageFileRaw instanceof File,
      isBlob: imageFileRaw instanceof Blob
    });
    
    const imageFile = imageFileRaw instanceof File ? imageFileRaw : null;

    // Validate required fields including user_id
    if (!user_id || !movie_id || !commentBody || !commentBody.trim()) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate image if provided
    if (imageFile) {
      console.log('[Comment Submit] Image file validation:', {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type,
        lastModified: imageFile.lastModified
      });

      // Check if file is actually valid
      if (!(imageFile instanceof File)) {
        console.error('[Comment Submit] Image file is not a valid File instance');
        return NextResponse.json(
          { error: 'Image file is invalid or corrupted' },
          { status: 400 }
        );
      }

      // Validate file size (6MB max)
      if (imageFile.size === 0) {
        console.error('[Comment Submit] Image file is empty');
        return NextResponse.json(
          { error: 'Image file is empty' },
          { status: 400 }
        );
      }

      if (imageFile.size >= 6 * 1024 * 1024) {
        console.error('[Comment Submit] Image file exceeds size limit:', {
          size: imageFile.size,
          maxSize: 6 * 1024 * 1024
        });
        return NextResponse.json(
          { error: 'Image size must be less than 6MB' },
          { status: 400 }
        );
      }

      // Validate MIME type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!imageFile.type || !allowedTypes.includes(imageFile.type)) {
        console.error('[Comment Submit] Invalid image MIME type:', {
          providedType: imageFile.type,
          allowedTypes
        });
        return NextResponse.json(
          { error: 'Image must be JPEG, PNG, or WebP' },
          { status: 400 }
        );
      }

      // Validate image dimensions (must be less than 4096px in both width and height)
      try {
        // Convert File to Buffer for sharp processing
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Get image dimensions using sharp
        const metadata = await sharp(buffer).metadata();
        const { width, height } = metadata;

        if (width !== undefined && height !== undefined) {
          if (width >= 4096 || height >= 4096) {
            console.error('[Comment Submit] Image dimensions exceed limit:', {
              width,
              height,
              maxDimension: 4096
            });
            return NextResponse.json(
              { error: 'Image dimensions must be less than 4096x4096 pixels' },
              { status: 400 }
            );
          }
        } else {
          console.error('[Comment Submit] Could not read image dimensions');
          return NextResponse.json(
            { error: 'Unable to read image dimensions. Please ensure the image file is valid.' },
            { status: 400 }
          );
        }
      } catch (dimensionError) {
        console.error('[Comment Submit] Error checking image dimensions:', dimensionError);
        return NextResponse.json(
          { error: 'Failed to validate image dimensions. Please ensure the image file is valid.' },
          { status: 400 }
        );
      }

      console.log('[Comment Submit] Image file validation passed');
    } else {
      console.log('[Comment Submit] No image file provided');
    }

    // Step 1: Insert comment using server action (enforces 1-minute cooldown)
    const result = await createCommentWithCooldown(
      user_id,
      movie_id,
      commentBody.trim(),
      parent_id || null,
      position_market_type || null,
      position_selected_range || null,
      position_points ? parseInt(position_points, 10) : null
    );

    if ('error' in result) {
      console.error('Comment submit - Server action error:', result.error);
      
      // Check for cooldown error
      if (result.error.includes('Please wait')) {
        return NextResponse.json(
          { error: result.error },
          { status: 429 }
        );
      }
      
      
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      );
    }

    const commentId = result.commentId;

    // Fetch the inserted comment data for later use
    const { data: fetchedCommentData, error: fetchError } = await supabaseAdmin
      .from('movie_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    let commentData: any;
    if (fetchError || !fetchedCommentData) {
      console.error('Comment submit - Error fetching inserted comment:', {
        commentId,
        error: fetchError?.message
      });
      // Create minimal commentData object as fallback
      commentData = {
        id: commentId,
        movie_id: movie_id,
        user_id: user_id,
        parent_id: parent_id || null,
        body: commentBody.trim(),
        approved: false,
        created_at: new Date().toISOString()
      };
    } else {
      commentData = fetchedCommentData;
    }
    const textPreview = commentBody.trim().length > 100 
      ? commentBody.trim().substring(0, 100) + '...' 
      : commentBody.trim();

    let imagePath: string | null = null;
    let imageMime: string | null = null;
    let imageSize: number | null = null;

    // Step 2: Handle image upload if present
    if (imageFile && imageFile.size > 0) {
      console.log('[Comment Submit] Starting image upload process', {
        commentId,
        fileName: imageFile.name,
        fileSize: imageFile.size,
        fileType: imageFile.type
      });

      try {
        // Verify bucket exists and is accessible
        console.log('[Comment Submit] Verifying bucket access...');
        const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets();
        
        if (bucketError) {
          console.error('[Comment Submit] Error listing buckets:', {
            commentId,
            error: bucketError.message
          });
          return NextResponse.json(
            { 
              error: 'Storage service unavailable', 
              details: bucketError.message || 'Cannot access storage buckets',
              commentId 
            },
            { status: 500 }
          );
        }

        const commentImagesBucket = buckets?.find(b => b.id === 'comment-images');
        if (!commentImagesBucket) {
          console.error('[Comment Submit] comment-images bucket not found:', {
            commentId,
            availableBuckets: buckets?.map(b => b.id) || []
          });
          return NextResponse.json(
            { 
              error: 'Storage bucket not found', 
              details: 'The comment-images bucket does not exist. Please run the migration script.',
              commentId 
            },
            { status: 500 }
          );
        }

        console.log('[Comment Submit] Bucket verified:', {
          commentId,
          bucketId: commentImagesBucket.id,
          bucketName: commentImagesBucket.name,
          bucketPublic: commentImagesBucket.public
        });
        // Get file extension
        const ext = imageFile.name.split('.').pop() || 
                   (imageFile.type === 'image/jpeg' ? 'jpg' : 
                    imageFile.type === 'image/png' ? 'png' : 
                    imageFile.type === 'image/webp' ? 'webp' : 'jpg');
        const storagePath = `${user_id}/${commentId}.${ext}`;

        console.log('[Comment Submit] Prepared storage path:', {
          commentId,
          storagePath,
          extension: ext
        });

        // Convert File to ArrayBuffer for server-side upload
        console.log('[Comment Submit] Converting File to ArrayBuffer...');
        let arrayBuffer: ArrayBuffer;
        try {
          arrayBuffer = await imageFile.arrayBuffer();
          console.log('[Comment Submit] ArrayBuffer conversion successful:', {
            arrayBufferSize: arrayBuffer.byteLength,
            expectedSize: imageFile.size
          });
        } catch (bufferError) {
          console.error('[Comment Submit] Failed to convert File to ArrayBuffer:', {
            commentId,
            error: bufferError instanceof Error ? bufferError.message : 'Unknown error',
            errorType: bufferError instanceof Error ? bufferError.constructor.name : typeof bufferError
          });
          throw new Error(`Failed to process image file: ${bufferError instanceof Error ? bufferError.message : 'Unknown error'}`);
        }

        // Convert ArrayBuffer to Buffer
        console.log('[Comment Submit] Converting ArrayBuffer to Buffer...');
        const buffer = Buffer.from(arrayBuffer);
        console.log('[Comment Submit] Buffer creation successful:', {
          bufferLength: buffer.length,
          expectedLength: imageFile.size
        });

        // Upload image to Supabase Storage
        console.log('[Comment Submit] Uploading to Supabase Storage...', {
          commentId,
          bucket: 'comment-images',
          storagePath,
          contentType: imageFile.type,
          bufferSize: buffer.length
        });

        const { data: uploadData, error: uploadError } = await supabaseAdminStorage.storage
          .from('comment-images')
          .upload(storagePath, buffer, {
            contentType: imageFile.type,
            upsert: false
          });

        if (uploadError) {
          console.error('[Comment Submit] Image upload error:', {
            commentId,
            storagePath,
            error: uploadError.message,
            errorName: uploadError.name,
            errorStatus: uploadError.statusCode,
            fullError: JSON.stringify(uploadError, Object.getOwnPropertyNames(uploadError))
          });
          
          // Return error to client instead of silently continuing
          return NextResponse.json(
            { 
              error: 'Image upload failed', 
              details: uploadError.message || 'Unknown upload error',
              commentId 
            },
            { status: 500 }
          );
        }

        if (!uploadData) {
          console.error('[Comment Submit] Upload succeeded but no data returned:', {
            commentId,
            storagePath
          });
          return NextResponse.json(
            { 
              error: 'Image upload failed', 
              details: 'Upload completed but no data returned',
              commentId 
            },
            { status: 500 }
          );
        }

        console.log('[Comment Submit] Image upload successful:', {
          commentId,
          storagePath,
          uploadDataPath: uploadData.path,
          uploadDataId: uploadData.id
        });

        imagePath = storagePath;
        imageMime = imageFile.type;
        imageSize = imageFile.size;

        // Update comment with image metadata
        console.log('[Comment Submit] Updating comment with image metadata...', {
          commentId,
          imagePath,
          imageMime,
          imageSize
        });

        const { error: updateError } = await supabaseAdmin
          .from('movie_comments')
          .update({
            image_path: imagePath,
            image_mime: imageMime,
            image_size: imageSize
          })
          .eq('id', commentId);

        if (updateError) {
          console.error('[Comment Submit] Error updating comment with image metadata:', {
            commentId,
            error: updateError.message,
            errorCode: updateError.code,
            errorDetails: updateError.details,
            errorHint: updateError.hint
          });
          // Image is uploaded but metadata update failed - return error
          return NextResponse.json(
            { 
              error: 'Failed to update comment with image metadata', 
              details: updateError.message || 'Unknown error',
              commentId 
            },
            { status: 500 }
          );
        }

        console.log('[Comment Submit] Comment updated with image metadata successfully:', {
          commentId,
          imagePath,
          imageMime,
          imageSize
        });
      } catch (imageError) {
        console.error('[Comment Submit] Error processing image:', {
          commentId,
          error: imageError instanceof Error ? imageError.message : 'Unknown error',
          errorType: imageError instanceof Error ? imageError.constructor.name : typeof imageError,
          stack: imageError instanceof Error ? imageError.stack : undefined
        });
        // Return error to client
        return NextResponse.json(
          { 
            error: 'Failed to process image', 
            details: imageError instanceof Error ? imageError.message : 'Unknown error',
            commentId 
          },
          { status: 500 }
        );
      }
    }

    // Step 3: Run moderation (text-only or multimodal)
    const hasImage = !!imagePath;
    
    console.log('[Moderation] Route: Starting moderation', {
      commentId,
      textPreview,
      hasImage,
      currentStatus: 'pending',
      moderationMode: hasImage ? 'multimodal (text + image)' : 'text-only'
    });

    try {
      let signedImageUrl: string | null = null;
      
      if (hasImage) {
        // Generate signed URL for multimodal moderation
        signedImageUrl = await generateSignedImageUrl(imagePath!, 300);
        
        if (!signedImageUrl) {
          console.error('[Moderation] Route: Could not generate signed URL for image', {
            commentId,
            imagePath: imagePath!.substring(0, 50) + '...',
            action: 'falling back to text-only moderation'
          });
          // Fall back to text-only moderation
        }
      }

      const moderationResult = await moderateComment(
        commentBody.trim(),
        signedImageUrl,
        commentId
      );
      
      console.log('[Moderation] Route: Received moderation result', {
        commentId,
        flagged: moderationResult.flagged,
        moderationMode: signedImageUrl ? 'multimodal' : 'text-only'
      });

      // If moderation passes (flagged=false), auto-approve the comment
      if (!moderationResult.flagged) {
        // Defensive check: only auto-approve if comment is still pending
        const { error: updateError } = await supabaseAdmin
          .from('movie_comments')
          .update({
            approved: true,
            approved_at: new Date().toISOString()
          })
          .eq('id', commentId)
          .eq('approved', false); // Only update if still pending

        if (updateError) {
          console.error('[Moderation] Route: Error auto-approving comment', {
            commentId,
            error: updateError.message,
            action: 'auto-approve failed'
          });
        } else {
          console.log('[Moderation] Route: Comment auto-approved', {
            commentId,
            action: 'auto-approved',
            previousStatus: 'pending',
            newStatus: 'approved',
            moderationMode: signedImageUrl ? 'multimodal' : 'text-only'
          });
          // Update commentData to reflect approval status
          commentData.approved = true;
          commentData.approved_at = new Date().toISOString();
        }
      } else {
        console.log('[Moderation] Route: Comment flagged, keeping pending', {
          commentId,
          action: 'keep pending',
          flagged: true,
          moderationMode: signedImageUrl ? 'multimodal' : 'text-only'
        });
      }
    } catch (moderationError) {
      // Don't block comment creation on moderation failure
      console.error('[Moderation] Route: Error in moderation process', {
        commentId,
        error: moderationError instanceof Error ? moderationError.message : 'Unknown error',
        errorType: moderationError instanceof Error ? moderationError.constructor.name : typeof moderationError,
        action: 'moderation failed, keeping pending'
      });
      // Comment remains pending (fail-safe)
    }

    // Step 4: Re-fetch the complete comment record to ensure we return all latest data
    console.log('[Comment Submit] Re-fetching complete comment record...', { commentId });
    const { data: finalCommentData, error: finalFetchError } = await supabaseAdmin
      .from('movie_comments')
      .select('*')
      .eq('id', commentId)
      .single();

    if (finalFetchError) {
      console.error('[Comment Submit] Error fetching final comment data:', {
        commentId,
        error: finalFetchError.message,
        errorCode: finalFetchError.code,
        action: 'returning initial comment data'
      });
      // Fall back to returning the initial commentData if fetch fails
      return NextResponse.json({ data: commentData }, { status: 201 });
    }

    console.log('[Comment Submit] Comment submission successful:', {
      commentId,
      hasImage: !!finalCommentData?.image_path,
      approved: finalCommentData?.approved,
      imagePath: finalCommentData?.image_path || null
    });

    return NextResponse.json({ data: finalCommentData }, { status: 201 });
  } catch (err) {
    console.error('Error in submit comment route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

