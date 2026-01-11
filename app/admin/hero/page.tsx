import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import HeroAdminClient from './HeroAdminClient';

interface HeroArticle {
  id: string;
  title: string;
  image_path: string | null;
  href: string;
  kicker: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export default async function AdminHeroPage() {
  const supabase = await createClient();

  // Get auth user
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

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
        </div>
      </div>
    );
  }

  // Fetch hero articles ordered by display_order
  const { data: heroArticlesData, error: heroArticlesError } = await supabase
    .from('hero_articles')
    .select('id, title, image_path, href, kicker, display_order, created_at, updated_at')
    .order('display_order', { ascending: true });

  if (heroArticlesError) {
    console.error('Error fetching hero articles:', heroArticlesError);
  }

  const heroArticles: HeroArticle[] = heroArticlesData || [];

  return (
    <div className="min-h-screen px-4 py-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Hero Carousel Management</h1>
        <p className="text-slate-600 dark:text-slate-400">Manage articles displayed in the hero carousel on the home page.</p>
      </div>

      <HeroAdminClient initialArticles={heroArticles} />
    </div>
  );
}
