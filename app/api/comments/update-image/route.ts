import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/utils/supabase-admin';
import { moderateComment } from '@/utils/moderation/openaiModeration';
import { generateSignedImageUrl } from '@/utils/supabase/storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { comment_id, image_path, image_mime, image_size } = body;

    if (!comment_id || !image_path) {
      return NextResponse.json(
        { error: 'Comment ID and image path are required' },
        { status: 400 }
      );
    }

    // Update comment with image metadata using admin client
    const { error: updateError } = await supabaseAdmin
      .from('movie_comments')
      .update({
        image_path: image_path,
        image_mime: image_mime || null,
        image_size: image_size || null
      })
      .eq('id', comment_id);

    if (updateError) {
      console.error('Error updating comment with image metadata:', updateError);
      return NextResponse.json(
        { error: updateError.message || 'Failed to update image metadata' },
        { status: 500 }
      );
    }

    // Step 2: Run multimodal moderation (text + image)
    console.log('[Moderation] Route: Starting multimodal moderation after image upload', {
      commentId: comment_id,
      imagePath: image_path.substring(0, 50) + '...',
      hasImage: true
    });

    try {
      // Fetch comment to get body text
      const { data: commentData, error: fetchError } = await supabaseAdmin
        .from('movie_comments')
        .select('body, approved')
        .eq('id', comment_id)
        .single();

      if (fetchError || !commentData) {
        console.error('[Moderation] Route: Error fetching comment for moderation', {
          commentId: comment_id,
          error: fetchError?.message,
          action: 'moderation skipped'
        });
        // Don't fail the request, image update was successful
      } else {
        const textPreview = commentData.body.length > 100 
          ? commentData.body.substring(0, 100) + '...' 
          : commentData.body;

        console.log('[Moderation] Route: Preparing for moderation', {
          commentId: comment_id,
          textPreview,
          currentApprovedStatus: commentData.approved,
          imagePath: image_path.substring(0, 50) + '...'
        });

        // Generate signed URL for the image (300 seconds = 5 minutes expiry)
        const signedImageUrl = await generateSignedImageUrl(image_path, 300);

        if (!signedImageUrl) {
          console.error('[Moderation] Route: Could not generate signed URL for image', {
            commentId: comment_id,
            imagePath: image_path.substring(0, 50) + '...',
            action: 'falling back to text-only moderation'
          });
          
          // Continue with text-only moderation if image URL generation fails
          console.log('[Moderation] Route: Running text-only moderation (signed URL failed)', {
            commentId: comment_id,
            moderationMode: 'text-only'
          });

          const moderationResult = await moderateComment(
            commentData.body, 
            null, 
            comment_id
          );
          
          console.log('[Moderation] Route: Text-only moderation result', {
            commentId: comment_id,
            flagged: moderationResult.flagged
          });

          if (!moderationResult.flagged && !commentData.approved) {
            // Auto-approve if text-only moderation passes
            const { error: approveError } = await supabaseAdmin
              .from('movie_comments')
              .update({
                approved: true,
                approved_at: new Date().toISOString()
              })
              .eq('id', comment_id)
              .eq('approved', false);

            if (!approveError) {
              console.log('[Moderation] Route: Comment auto-approved (text-only after image URL failure)', {
                commentId: comment_id,
                action: 'auto-approved',
                moderationMode: 'text-only',
                previousStatus: 'pending',
                newStatus: 'approved'
              });
            } else {
              console.error('[Moderation] Route: Error auto-approving comment (text-only)', {
                commentId: comment_id,
                error: approveError.message
              });
            }
          } else if (moderationResult.flagged) {
            console.log('[Moderation] Route: Comment flagged (text-only), keeping pending', {
              commentId: comment_id,
              action: 'keep pending',
              flagged: true
            });
          }
        } else {
          console.log('[Moderation] Route: Signed URL generated successfully, running multimodal moderation', {
            commentId: comment_id,
            moderationMode: 'multimodal (text + image)',
            signedUrlGenerated: true
          });

          // Run multimodal moderation with text + image
          const moderationResult = await moderateComment(
            commentData.body, 
            signedImageUrl, 
            comment_id
          );

          console.log('[Moderation] Route: Multimodal moderation result', {
            commentId: comment_id,
            flagged: moderationResult.flagged,
            currentApprovedStatus: commentData.approved
          });

          if (!moderationResult.flagged) {
            // Moderation passes - auto-approve if still pending
            if (!commentData.approved) {
              const { error: approveError } = await supabaseAdmin
                .from('movie_comments')
                .update({
                  approved: true,
                  approved_at: new Date().toISOString()
                })
                .eq('id', comment_id)
                .eq('approved', false); // Only update if still pending

              if (approveError) {
                console.error('[Moderation] Route: Error auto-approving comment (multimodal)', {
                  commentId: comment_id,
                  error: approveError.message,
                  action: 'auto-approve failed'
                });
              } else {
                console.log('[Moderation] Route: Comment auto-approved (multimodal)', {
                  commentId: comment_id,
                  action: 'auto-approved',
                  moderationMode: 'multimodal',
                  previousStatus: 'pending',
                  newStatus: 'approved'
                });
              }
            } else {
              console.log('[Moderation] Route: Comment already approved, no action needed', {
                commentId: comment_id,
                currentStatus: 'approved',
                flagged: false
              });
            }
          } else {
            // Moderation flags the content - un-approve if previously approved
            // This handles the case where text was safe but image is problematic
            if (commentData.approved) {
              const { error: unapproveError } = await supabaseAdmin
                .from('movie_comments')
                .update({
                  approved: false,
                  approved_at: null
                })
                .eq('id', comment_id);

              if (unapproveError) {
                console.error('[Moderation] Route: Error un-approving flagged comment', {
                  commentId: comment_id,
                  error: unapproveError.message,
                  action: 'un-approve failed'
                });
              } else {
                console.log('[Moderation] Route: Comment un-approved due to flagged image', {
                  commentId: comment_id,
                  action: 'un-approved',
                  previousStatus: 'approved',
                  newStatus: 'pending',
                  reason: 'image flagged'
                });
              }
            } else {
              console.log('[Moderation] Route: Comment flagged (multimodal), keeping pending', {
                commentId: comment_id,
                action: 'keep pending',
                flagged: true,
                moderationMode: 'multimodal'
              });
            }
          }
        }
      }
    } catch (moderationError) {
      // Don't block image update on moderation failure
      console.error('[Moderation] Route: Error in moderation process', {
        commentId: comment_id,
        error: moderationError instanceof Error ? moderationError.message : 'Unknown error',
        errorType: moderationError instanceof Error ? moderationError.constructor.name : typeof moderationError,
        action: 'moderation failed, keeping current status'
      });
      // Image update was successful, comment remains pending (fail-safe)
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error in update image route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

