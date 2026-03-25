'use client';

/**
 * AuthProvider — hydrates authStore from the live Supabase session.
 *
 * Must wrap the entire app (registered in root layout) so every
 * client component that reads `useAuthStore().profile` gets a value.
 *
 * Strategy:
 *  1. On mount: fetch session + full profile → setProfile()
 *  2. Subscribe to onAuthStateChange:
 *     - SIGNED_IN / TOKEN_REFRESHED → re-fetch profile
 *     - SIGNED_OUT → setProfile(null)
 */

import { useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { Profile } from '@/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore();

  const fetchAndSetProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      setProfile(null);
    } else {
      setProfile(data as Profile);
    }
  }, [setProfile]);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    // 1. Hydrate immediately on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        fetchAndSetProfile(user.id);
      } else {
        setProfile(null);
      }
    });

    // 2. Stay in sync with auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setProfile(null);
        } else if (
          event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          fetchAndSetProfile(session.user.id);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAndSetProfile, setProfile, setLoading]);

  // Render children immediately — no blocking loader here.
  // Individual pages handle their own loading states.
  return <>{children}</>;
}
