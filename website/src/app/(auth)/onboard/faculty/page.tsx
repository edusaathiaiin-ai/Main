'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FacultyOnboardFlow } from '@/components/onboard/FacultyOnboardFlow'

function FacultyOnboardInner() {
  const router = useRouter()
  const [profile, setProfile] = useState<{ id: string; role: string | null } | null>(null)
  const [loading, setLoading] = useState(true)
  const initRef = useRef(false)

  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    async function loadProfile() {
      const supabase = createClient()

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        router.replace('/login')
        return
      }

      // Small delay to let session cookie propagate after OAuth redirect
      await new Promise((r) => setTimeout(r, 800))

      // Fetch profile with retries
      type ProfRow = { id: string; role: string | null; is_active: boolean | null; full_name: string | null }
      let prof: ProfRow | null = null
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, role, is_active, full_name')
          .eq('id', user.id)
          .maybeSingle()

        if (!error && data) {
          prof = data as ProfRow
          break
        }
        if (attempt < 3) await new Promise((r) => setTimeout(r, 2000))
      }

      if (!prof) {
        router.replace('/login?error=profile_missing')
        return
      }

      // Already completed onboarding — send to faculty dashboard
      if (prof.is_active) {
        router.replace('/faculty')
        return
      }

      setProfile({ id: prof.id, role: prof.role })
      setLoading(false)
    }

    loadProfile().catch(() => router.replace('/login?error=profile_missing'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/10"
          style={{ borderTopColor: '#C9993A' }}
        />
      </main>
    )
  }

  if (!profile) return null

  return (
    <FacultyOnboardFlow
      profile={profile}
      onComplete={() => router.push('/faculty')}
    />
  )
}

export default function FacultyOnboardPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'var(--bg-base)' }}
        >
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-white/10"
            style={{ borderTopColor: '#C9993A' }}
          />
        </main>
      }
    >
      <FacultyOnboardInner />
    </Suspense>
  )
}
