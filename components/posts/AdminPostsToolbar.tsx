'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/utils/supabase';

export default function AdminPostsToolbar() {
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

  return (
    <Link
      href="/admin/posts/new"
      className="shrink-0 inline-flex items-center justify-center rounded-full bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-neutral-800 transition-colors"
    >
      New post
    </Link>
  );
}
