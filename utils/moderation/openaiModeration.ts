'use server';

import OpenAI from 'openai';

// Initialize OpenAI client (server-side only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Moderate comment content (text and optionally image) using OpenAI's moderation API
 * @param text - The comment text to moderate
 * @param imageUrl - Optional signed URL to the comment image
 * @param commentId - Optional comment ID for tracking in logs
 * @returns Object with flagged boolean (true = needs review, false = safe to approve)
 */
export async function moderateComment(
  text: string,
  imageUrl?: string | null,
  commentId?: string | null
): Promise<{ flagged: boolean }> {
  const startTime = Date.now();
  const model = 'omni-moderation-latest';

  try {
    // Validate API key is available
    if (!process.env.OPENAI_API_KEY) {
      console.error('[Moderation] OPENAI_API_KEY not configured', {
        commentId: commentId || null
      });
      return { flagged: true }; // Fail-safe: keep pending if no API key
    }

    // Prepare text preview (first 100 chars)
    const textPreview = text.length > 100 ? text.substring(0, 100) + '...' : text;
    const hasImage = !!imageUrl;
    
    // Log entry point
    console.log('[Moderation] Starting moderation', {
      commentId: commentId || null,
      textPreview,
      textLength: text.length,
      hasImage,
      model
    });

    // Build input array dynamically
    const content: Array<{ type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }> = [
      { type: 'text', text }
    ];

    // Add image if provided
    if (imageUrl) {
      content.push({
        type: 'image_url',
        image_url: { url: imageUrl }
      });
      
      // Mask image URL for logging (show domain only, not full path)
      try {
        const urlObj = new URL(imageUrl);
        const maskedUrl = `${urlObj.protocol}//${urlObj.host}/...`;
        console.log('[Moderation] API Request', {
          commentId: commentId || null,
          model,
          inputTypes: ['text', 'image_url'],
          textLength: text.length,
          imageUrl: maskedUrl
        });
      } catch {
        console.log('[Moderation] API Request', {
          commentId: commentId || null,
          model,
          inputTypes: ['text', 'image_url'],
          textLength: text.length,
          imageUrl: '[unable to parse URL]'
        });
      }
    } else {
      console.log('[Moderation] API Request', {
        commentId: commentId || null,
        model,
        inputTypes: ['text'],
        textLength: text.length
      });
    }

    // Call OpenAI moderation API
    const response = await openai.moderations.create({
      model,
      input: content
    });

    const duration = Date.now() - startTime;

    // Extract flagged status from response
    // The moderation API returns results array, check if any result is flagged
    const flagged = response.results.some(result => result.flagged === true);

    // Log full API response
    console.log('[Moderation] API Response', {
      commentId: commentId || null,
      id: response.id,
      model: response.model,
      results: response.results.map((r, index) => ({
        index,
        flagged: r.flagged,
        categories: r.categories,
        categoryScores: r.category_scores
      })),
      durationMs: duration
    });

    // Log final decision with clear flagged status
    console.log('[Moderation] Final Decision', {
      commentId: commentId || null,
      flagged,
      durationMs: duration,
      hasImage
    });

    return { flagged };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error server-side only (don't expose sensitive data)
    console.error('[Moderation] Error:', {
      commentId: commentId || null,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      durationMs: duration,
      hasImage: !!imageUrl
    });

    // Fail-safe: return flagged=true to keep comment pending on error
    return { flagged: true };
  }
}

