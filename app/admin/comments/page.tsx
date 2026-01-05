import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CommentRowClient from './CommentRowClient';

interface Comment {
  id: string;
  movie_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  approved: boolean;
  created_at: string;
  approved_at?: string | null;
  approved_by?: string | null;
  position_market_type?: string | null;
  position_selected_range?: string | null;
  position_points?: number | null;
  movie_title?: string | null;
  movie_slug?: string | null;
  username?: string | null;
  user_is_banned?: boolean;
}

export default async function AdminCommentsPage() {
  const supabase = await createClient();

  // Get auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  console.log('PAGE USER:', authUser?.id);

  if (authError || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Please sign in</h1>
          <p className="text-slate-600 dark:text-slate-400">You must be signed in to access this page.</p>
        </div>
      </div>
    );
  }

  // Fetch user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, username, is_admin')
    .eq('id', authUser.id)
    .single();


  // Check if profile exists
  if (profileError || !userProfile) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 dark:text-red-400 mb-4">Profile Not Found</h1>
          <p className="text-red-800 dark:text-red-300 mb-4">
            Your auth user ID does not have a matching row in <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">public.users</code>.
          </p>
          <p className="text-red-800 dark:text-red-300 mb-2">
            <strong>Auth User ID:</strong> <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">{authUser.id}</code>
          </p>
          <p className="text-red-800 dark:text-red-300">
            Please ensure that <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">public.users.id</code> matches <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">auth.uid()</code>.
          </p>
        </div>
      </div>
    );
  }

  // Check admin status
  if (userProfile.is_admin !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Not Authorized</h1>
          <p className="text-slate-600 dark:text-slate-400">You do not have admin privileges.</p>
          <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-left text-xs font-mono">
            <p>Auth User ID: {authUser.id}</p>
            <p>Is Admin: {String(userProfile.is_admin)}</p>
          </div>
        </div>
      </div>
    );
  }

  // Fetch all comments (no approved filter) - admin should see all
  const { data: commentsData, error: commentsError } = await supabase
    .from('movie_comments')
    .select('id, movie_id, user_id, parent_id, body, approved, created_at, approved_at, approved_by, position_market_type, position_selected_range, position_points')
    .order('created_at', { ascending: false });

  if (commentsError) {
    console.error('Error fetching comments:', commentsError);
  }

  const comments = commentsData || [];

  // Ensure comments is always an array to prevent crashes
  const safeComments = Array.isArray(comments) ? comments : [];

  // Compute counts
  const totalCount = safeComments.length;
  const pendingCount = safeComments.filter(c => !c.approved).length;
  const approvedCount = safeComments.filter(c => c.approved).length;

  // Fetch movies with slug
  const movieIds = [...new Set(safeComments.map(c => c.movie_id).filter(Boolean))];
  const { data: moviesData } = await supabase
    .from('movies')
    .select('id, title, slug')
    .in('id', movieIds);

  type MovieInfo = { title: string; slug: string };
  const movieMap = new Map<string, MovieInfo>(
    (moviesData || []).map((m: { id: string; title: string; slug: string }) => [m.id, { title: m.title, slug: m.slug }])
  );

  // Fetch usernames and ban status
  const userIds = [...new Set(comments.map((c: { user_id: string }) => c.user_id))];
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, username, is_banned')
    .in('id', userIds);

  // Handle errors when fetching user data (e.g., if migration hasn't been run)
  if (usersError) {
    console.error('Error fetching user data (ban status):', usersError);
    // Check if error is due to missing column
    if (usersError.message?.includes('column') && usersError.message?.includes('is_banned')) {
      console.error('⚠️ The is_banned column does not exist. Please run the add_shadow_ban.sql migration.');
    } else if (usersError.message?.includes('permission') || usersError.message?.includes('policy')) {
      console.error('⚠️ RLS policy error. Admins may not have permission to read is_banned. Check RLS policies.');
    }
  }

  // Create user map with fallback for missing data
  const userMap = new Map(
    (usersData || []).map((u: { id: string; username: string | null; is_banned: boolean | null }) => [
      u.id,
      { username: u.username, is_banned: u.is_banned ?? false }
    ])
  );

  // Enrich comments with movie titles, usernames, and ban status
  // If user data fetch failed, default to false for is_banned
  const enrichedComments: Comment[] = comments.map((comment: any) => {
    const movie = movieMap.get(comment.movie_id);
    const userInfo = userMap.get(comment.user_id);
    return {
      ...comment,
      movie_title: movie?.title || null,
      movie_slug: movie?.slug || null,
      username: userInfo?.username || null,
      // Default to false if userInfo is missing (e.g., due to query error)
      user_is_banned: userInfo?.is_banned ?? false,
    };
  });

  // Separate into pending and approved
  const pendingComments = enrichedComments
    .filter(c => !c.approved)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()); // oldest first

  const approvedComments = enrichedComments
    .filter(c => c.approved)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); // newest first

  return (
    <div className="min-h-screen px-4 py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Comment Moderation</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage and moderate movie comments</p>
      </div>


      {/* Pending Comments Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Pending Comments ({pendingComments.length})
        </h2>
        {pendingComments.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No pending comments</p>
        ) : (
          <div className="space-y-4">
            {pendingComments.map((comment) => (
              <CommentRowClient
                key={comment.id}
                comment={comment}
                isPending={true}
              />
            ))}
          </div>
        )}
      </section>

      {/* Approved Comments Section */}
      <section>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
          Approved Comments ({approvedComments.length})
        </h2>
        {approvedComments.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No approved comments</p>
        ) : (
          <div className="space-y-4">
            {approvedComments.map((comment) => (
              <CommentRowClient
                key={comment.id}
                comment={comment}
                isPending={false}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
