import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/utils/supabase/server';

interface Comment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  username?: string | null;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
  image_path?: string | null;
  image_mime?: string | null;
  image_size?: number | null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const movieId = searchParams.get('movieId');
    const limitParam = searchParams.get('limit');
    const cursorCreatedAt = searchParams.get('cursorCreatedAt');
    const cursorId = searchParams.get('cursorId');

    if (!movieId) {
      return NextResponse.json(
        { error: 'movieId is required' },
        { status: 400 }
      );
    }

    const limit = limitParam ? parseInt(limitParam, 10) : 5;
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: 'limit must be between 1 and 100' },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();

    // Get current user ID (if authenticated)
    const { data: { user: authUser } } = await supabase.auth.getUser();
    const userId = authUser?.id || null;

    // Check if user is admin
    let isAdmin = false;
    if (userId) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single();
      
      if (!profileError && userProfile) {
        isAdmin = userProfile.is_admin === true;
      }
    }

    // Build query for root-level APPROVED comments only (parent_id IS NULL)
    // Order by created_at DESC, id DESC (newest first)
    // Note: We don't join users here to avoid relationship ambiguity
    // Only approved comments are counted in the pagination limit
    let query = supabase
      .from('movie_comments')
      .select(`
        id,
        movie_id,
        user_id,
        parent_id,
        body,
        approved,
        created_at,
        position_market_type,
        position_selected_range,
        position_points,
        image_path,
        image_mime,
        image_size
      `)
      .eq('movie_id', movieId)
      .eq('approved', true) // Only approved comments for pagination
      .is('parent_id', null) // Only root-level comments for pagination
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1); // Fetch one extra to determine if there's more

    // Apply cursor filter if provided
    // For keyset pagination: (created_at < cursorCreatedAt) OR (created_at = cursorCreatedAt AND id < cursorId)
    // PostgREST syntax: use .or() with comma-separated conditions
    // Format: "condition1,condition2" means "condition1 OR condition2"
    // For "A OR (B AND C)", we use: "A,and(B,C)"
    if (cursorCreatedAt && cursorId) {
      // Filter: (created_at < cursor) OR (created_at = cursor AND id < cursorId)
      // PostgREST: created_at.lt.value,or(created_at.eq.value,and(id.lt.value))
      query = query.or(
        `created_at.lt.${cursorCreatedAt},and(created_at.eq.${cursorCreatedAt},id.lt.${cursorId})`
      );
    }

    const { data: commentsData, error: commentsError } = await query;

    if (commentsError) {
      console.error('Error fetching paginated comments:', commentsError);
      return NextResponse.json(
        { error: commentsError.message || 'Failed to fetch comments' },
        { status: 500 }
      );
    }

    if (!commentsData) {
      return NextResponse.json({ comments: [], nextCursor: null });
    }

    // Check if there are more comments
    const hasMore = commentsData.length > limit;
    const comments = hasMore ? commentsData.slice(0, limit) : commentsData;

    // Fetch usernames separately to avoid relationship ambiguity
    const userIds = [...new Set(comments.map((c: any) => c.user_id).filter(Boolean))];
    const userMap = new Map<string, string | null>();
    
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, username')
        .in('id', userIds);

      if (!usersError && usersData) {
        usersData.forEach((u: { id: string; username: string | null }) => {
          userMap.set(u.id, u.username);
        });
      }
    }

    // Transform the data to flatten the nested structure
    const transformedComments: Comment[] = comments.map((comment: any) => {
      return {
        id: comment.id,
        movie_id: comment.movie_id,
        user_id: comment.user_id,
        parent_id: comment.parent_id,
        body: comment.body,
        approved: comment.approved,
        created_at: comment.created_at,
        username: userMap.get(comment.user_id) || null,
        position_market_type: comment.position_market_type || null,
        position_selected_range: comment.position_selected_range || null,
        position_points: comment.position_points || null,
        image_path: comment.image_path || null,
        image_mime: comment.image_mime || null,
        image_size: comment.image_size || null,
      };
    });

    // Calculate next cursor from the last APPROVED comment (for pagination)
    let nextCursor: { created_at: string; id: string } | null = null;
    if (hasMore && comments.length > 0) {
      const lastComment = comments[comments.length - 1];
      nextCursor = {
        created_at: lastComment.created_at,
        id: lastComment.id,
      };
    }

    // Fetch pending comments separately (if authenticated)
    // These are NOT counted in the pagination limit
    // Admins see ALL pending comments, regular users see only their own
    if (isAdmin) {
      // Admin: Fetch ALL pending comments from all users
      const { data: pendingCommentsData, error: pendingError } = await supabase
        .from('movie_comments')
        .select(`
          id,
          movie_id,
          user_id,
          parent_id,
          body,
          approved,
          created_at,
          position_market_type,
          position_selected_range,
          position_points,
          image_path,
          image_mime,
          image_size
        `)
        .eq('movie_id', movieId)
        .eq('approved', false)
        .is('parent_id', null) // Only root-level pending comments
        .order('created_at', { ascending: false });

      if (!pendingError && pendingCommentsData && pendingCommentsData.length > 0) {
        // Fetch usernames for pending comments
        const pendingUserIds = [...new Set(pendingCommentsData.map((c: any) => c.user_id).filter(Boolean))];
        const pendingUserMap = new Map<string, string | null>();
        
        if (pendingUserIds.length > 0) {
          const { data: pendingUsersData, error: pendingUsersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', pendingUserIds);

          if (!pendingUsersError && pendingUsersData) {
            pendingUsersData.forEach((u: { id: string; username: string | null }) => {
              pendingUserMap.set(u.id, u.username);
            });
          }
        }

        // Transform pending comments and add to the array
        const transformedPendingComments: Comment[] = pendingCommentsData.map((comment: any) => {
          return {
            id: comment.id,
            movie_id: comment.movie_id,
            user_id: comment.user_id,
            parent_id: comment.parent_id,
            body: comment.body,
            approved: comment.approved,
            created_at: comment.created_at,
            username: pendingUserMap.get(comment.user_id) || null,
            position_market_type: comment.position_market_type || null,
            position_selected_range: comment.position_selected_range || null,
            position_points: comment.position_points || null,
            image_path: comment.image_path || null,
            image_mime: comment.image_mime || null,
            image_size: comment.image_size || null,
          };
        });

        // Add pending comments to the transformed comments array
        // They will be sorted by the buildThreads function in the component
        transformedComments.push(...transformedPendingComments);
      }
    } else if (userId) {
      // Regular user: Fetch only their own pending comments
      const { data: pendingCommentsData, error: pendingError } = await supabase
        .from('movie_comments')
        .select(`
          id,
          movie_id,
          user_id,
          parent_id,
          body,
          approved,
          created_at,
          position_market_type,
          position_selected_range,
          position_points,
          image_path,
          image_mime,
          image_size
        `)
        .eq('movie_id', movieId)
        .eq('user_id', userId)
        .eq('approved', false)
        .is('parent_id', null) // Only root-level pending comments
        .order('created_at', { ascending: false });

      if (!pendingError && pendingCommentsData && pendingCommentsData.length > 0) {
        // Fetch usernames for pending comments (should be the current user, but fetch for consistency)
        const pendingUserIds = [...new Set(pendingCommentsData.map((c: any) => c.user_id).filter(Boolean))];
        const pendingUserMap = new Map<string, string | null>();
        
        if (pendingUserIds.length > 0) {
          const { data: pendingUsersData, error: pendingUsersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', pendingUserIds);

          if (!pendingUsersError && pendingUsersData) {
            pendingUsersData.forEach((u: { id: string; username: string | null }) => {
              pendingUserMap.set(u.id, u.username);
            });
          }
        }

        // Transform pending comments and add to the array
        const transformedPendingComments: Comment[] = pendingCommentsData.map((comment: any) => {
          return {
            id: comment.id,
            movie_id: comment.movie_id,
            user_id: comment.user_id,
            parent_id: comment.parent_id,
            body: comment.body,
            approved: comment.approved,
            created_at: comment.created_at,
            username: pendingUserMap.get(comment.user_id) || null,
            position_market_type: comment.position_market_type || null,
            position_selected_range: comment.position_selected_range || null,
            position_points: comment.position_points || null,
            image_path: comment.image_path || null,
            image_mime: comment.image_mime || null,
            image_size: comment.image_size || null,
          };
        });

        // Add pending comments to the transformed comments array
        // They will be sorted by the buildThreads function in the component
        transformedComments.push(...transformedPendingComments);
      }
    }

    // Now fetch all replies for these root comments
    // This ensures threading still works correctly
    // Only fetch approved replies OR replies from the current user (if authenticated)
    if (transformedComments.length > 0) {
      const rootCommentIds = transformedComments.map(c => c.id);
      let repliesQuery = supabase
        .from('movie_comments')
        .select(`
          id,
          movie_id,
          user_id,
          parent_id,
          body,
          approved,
          created_at,
          position_market_type,
          position_selected_range,
          position_points
        `)
        .in('parent_id', rootCommentIds);

      // Filter replies based on user role:
      // - Admins: see all replies (approved and pending)
      // - Regular users: see approved replies OR their own pending replies
      // - Unauthenticated: see only approved replies
      if (isAdmin) {
        // Admin: Fetch all replies (no filter needed - RLS will handle visibility)
        // We can remove the approved filter entirely or use .or() to be explicit
        repliesQuery = repliesQuery; // No filter - admins see everything via RLS
      } else if (userId) {
        // Regular user: approved OR their own pending
        repliesQuery = repliesQuery.or(`approved.eq.true,user_id.eq.${userId}`);
      } else {
        // Unauthenticated: only approved
        repliesQuery = repliesQuery.eq('approved', true);
      }

      const { data: repliesData, error: repliesError } = await repliesQuery
        .order('created_at', { ascending: true }); // Replies ordered oldest first

      if (!repliesError && repliesData) {
        // Fetch usernames for replies
        const replyUserIds = [...new Set(repliesData.map((r: any) => r.user_id).filter(Boolean))];
        const replyUserMap = new Map<string, string | null>();
        
        if (replyUserIds.length > 0) {
          const { data: replyUsersData, error: replyUsersError } = await supabase
            .from('users')
            .select('id, username')
            .in('id', replyUserIds);

          if (!replyUsersError && replyUsersData) {
            replyUsersData.forEach((u: { id: string; username: string | null }) => {
              replyUserMap.set(u.id, u.username);
            });
          }
        }

        // Transform replies
        const transformedReplies: Comment[] = repliesData.map((reply: any) => {
          return {
            id: reply.id,
            movie_id: reply.movie_id,
            user_id: reply.user_id,
            parent_id: reply.parent_id,
            body: reply.body,
            approved: reply.approved,
            created_at: reply.created_at,
            username: replyUserMap.get(reply.user_id) || null,
            position_market_type: reply.position_market_type || null,
            position_selected_range: reply.position_selected_range || null,
            position_points: reply.position_points || null,
            image_path: reply.image_path || null,
            image_mime: reply.image_mime || null,
            image_size: reply.image_size || null,
          };
        });

        // Append replies to the comments array
        // The buildThreads function in the component will organize them properly
        transformedComments.push(...transformedReplies);
      }
    }

    return NextResponse.json({
      comments: transformedComments,
      nextCursor,
    });
  } catch (err) {
    console.error('Error in paginated comments route:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

