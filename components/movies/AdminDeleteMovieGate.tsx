'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';
import AdminDeleteMovieButton from '@/components/AdminDeleteMovieButton';

type Props = {
  movieId: string;
  movieTitle: string;
};

export default function AdminDeleteMovieGate({ movieId, movieTitle }: Props) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchAdminStatus() {
      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Error fetching admin status:', error);
        setIsAdmin(false);
        return;
      }
      setIsAdmin(data?.is_admin === true);
    }

    fetchAdminStatus();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (!isAdmin) return null;

  return <AdminDeleteMovieButton movieId={movieId} movieTitle={movieTitle} />;
}
