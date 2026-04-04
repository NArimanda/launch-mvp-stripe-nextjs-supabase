import { createClient } from '@/utils/supabase/server';
import { debugLog } from '@/utils/debugLog';
import NewPostForm from './NewPostForm';

export const metadata = {
  title: 'New post',
};

export default async function AdminNewPostPage() {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  debugLog('ADMIN NEW POST USER:', authUser?.id);

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

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, email, username, is_admin')
    .eq('id', authUser.id)
    .single();

  if (profileError || !userProfile) {
    return (
      <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-red-900 dark:text-red-400 mb-4">Profile Not Found</h1>
          <p className="text-red-800 dark:text-red-300 mb-4">
            Your auth user ID does not have a matching row in{' '}
            <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">public.users</code>.
          </p>
          <p className="text-red-800 dark:text-red-300 mb-2">
            <strong>Auth User ID:</strong>{' '}
            <code className="bg-red-100 dark:bg-red-900/40 px-2 py-1 rounded">{authUser.id}</code>
          </p>
        </div>
      </div>
    );
  }

  if (userProfile.is_admin !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">Not Authorized</h1>
          <p className="text-slate-600 dark:text-slate-400">You do not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">New post</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Posts are visible immediately after publish. No drafts.
        </p>
      </header>
      <NewPostForm />
    </div>
  );
}
