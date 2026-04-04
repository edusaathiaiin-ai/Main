'use client'

/**
 * AuthProvider — hydrates authStore from the live Supabase session.
 *
 * Strategy:
 *  1. On mount: fetch session + full profile → setProfile() ONCE
 *  2. Subscribe to onAuthStateChange:
 *     - SIGNED_OUT → clear profile
 *     - TOKEN_REFRESHED → re-fetch profile (token rotation, not page load)
 *     - SIGNED_IN is intentionally SKIPPED here — individual pages (onboard,
 *       chat) do their own fetch to avoid a race condition where AuthProvider
 *       and the page both hit profiles simultaneously.
 */

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import type { Profile } from '@/types'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()
    setLoading(true)

    // 1. Hydrate once on mount — only if profile not already in store
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        setProfile(null)
        setLoading(false)
        return
      }
      // Skip if page (onboard/chat) already loaded the profile
      // EXCEPT on ?upgraded=true — always re-fetch so the new plan_id is fresh
      const already = useAuthStore.getState().profile
      const isPostPayment =
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('upgraded') === 'true'
      if (already && !isPostPayment) {
        setLoading(false)
        return
      }

      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data, error }) => {
          setProfile(error || !data ? null : (data as Profile))
          setLoading(false)
        })
    })

    // 2. Stay in sync — only TOKEN_REFRESHED and SIGNED_OUT
    //    Skip SIGNED_IN to avoid race with onboard page's own fetch
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setProfile(null)
      } else if (event === 'TOKEN_REFRESHED') {
        // Quietly refresh profile on token rotation
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data) setProfile(data as Profile)
          })
      }
      // SIGNED_IN intentionally omitted — pages handle their own init
    })

    // 3. Re-fetch profile when tab regains focus (catches plan upgrades)
    function handleFocus() {
      const current = useAuthStore.getState().profile
      if (!current?.id) return
      supabase
        .from('profiles')
        .select('*')
        .eq('id', current.id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) setProfile(data as Profile)
        })
    }
    window.addEventListener('focus', handleFocus)

    return () => {
      subscription.unsubscribe()
      window.removeEventListener('focus', handleFocus)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // Empty array is intentional — must only run once on mount.
  // setProfile/setLoading are Zustand stable refs (never change).

  return <>{children}</>
}
