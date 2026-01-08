import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  // Fetch user's username
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('username')
    .eq('id', user.id)
    .single();

  if (userError || !userProfile || !userProfile.username) {
    // If no username found, redirect to login
    redirect('/login');
  }

  // Redirect to the user's dashboard
  redirect(`/${userProfile.username}/dashboard`);
}
