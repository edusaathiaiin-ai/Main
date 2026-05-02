'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Session } from '@supabase/supabase-js'
import { trackSignupCompleted } from '@/lib/analytics'

// ── Welcome email with retry ─────────────────────────────────────────────────
// Profile row may not exist yet when the callback fires (DB trigger race).
// Retry up to 3 times with increasing delays before giving up.
// send-welcome-email is idempotent (welcome_email_sent flag) — safe to call
// for both new and returning users.

async function sendWelcomeWithRetry(
  session: Session,
  maxAttempts = 3
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    // Wait before every attempt — profile needs time to be created
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)))

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-welcome-email`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
        }
      )
      const data = await res.json()

      // Success or already sent — stop retrying
      if (res.ok && (data.sent || data.skipped)) return

      // Profile not ready yet — retry
      console.warn(`Welcome email attempt ${i + 1} failed:`, data)
    } catch {
      // Network error — retry
    }
  }
}

// ── Session register (fire-and-forget after every successful login) ─────────

async function callSessionRegister(accessToken: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-register`
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ deviceInfo: { platform: 'web' } }),
    })
  } catch {
    // fire-and-forget — silently swallow; login flow must not be blocked
  }
}

// ── Ensure profile row exists ─────────────────────────────────────────────────

type DbUserRole = 'student' | 'faculty' | 'public' | 'institution'

async function ensureProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  roleParam: DbUserRole | null,
  accessToken: string,
): Promise<{ isActive: boolean; role: DbUserRole; wasCreated: boolean }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, is_active, role')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    const resolvedRole = roleParam ?? 'student'
    const { error: insertError } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name: null,
      role: resolvedRole,
      is_active: false,
      plan_id: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      if (!insertError.code?.startsWith('23')) {
        throw new Error(`Profile creation failed: ${insertError.message}`)
      }
    }

    // Welcome email is sent from onboard/page.tsx handleComplete()
    // after the student has set their name and chosen their Saathi.
    // Firing it here would miss the name and Saathi since the profile
    // is created by the handle_new_user DB trigger before this callback runs.

    return { isActive: false, role: resolvedRole, wasCreated: true }
  }

  return {
    isActive: profile.is_active ?? false,
    role: (profile.role as DbUserRole) ?? 'student',
    wasCreated: false,
  }
}

function roleDefaultRoute(role: DbUserRole): string {
  if (role === 'faculty') return '/faculty'
  if (role === 'institution') return '/institution'
  return '/chat'
}

// ─────────────────────────────────────────────────────────────────────────────

function CallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const supabase = createClient()

    async function handleCallback() {
      try {
        // Give Supabase a moment to exchange the PKCE code.
        // We use refreshSession() NOT getSession() — getSession() can return
        // a session whose access_token is malformed/undefined when the
        // @supabase/ssr cookie chunks are still being written. That token
        // then fails at the Supabase gateway with 401 "Invalid JWT" when
        // we try to call edge functions (send-welcome-email, etc).
        // refreshSession() always returns a fully-hydrated, valid session.
        let resolvedSession: Session | null = null

        const {
          data: { session },
          error,
        } = await supabase.auth.refreshSession()

        if (error || !session) {
          // Session may not be ready yet — wait 800ms and retry once
          await new Promise((r) => setTimeout(r, 800))
          const {
            data: { session: retrySession },
            error: retryError,
          } = await supabase.auth.refreshSession()

          if (retryError || !retrySession) {
            const isExpired =
              retryError?.message?.toLowerCase().includes('expired') ?? false
            setStatus('error')
            setErrorMsg(
              isExpired
                ? 'This login link has expired. Magic links are valid for 24 hours.'
                : (retryError?.message ?? 'Login failed. Please try again.')
            )
            setTimeout(
              () =>
                router.replace(
                  isExpired
                    ? '/login?error=link_expired'
                    : '/login?error=unauthorized'
                ),
              2000
            )
            return
          }
          resolvedSession = retrySession
        } else {
          resolvedSession = session
        }

        // Single-device enforcement — fire-and-forget, must not block redirect
        void callSessionRegister(resolvedSession.access_token)

        // Read role and saathi — sessionStorage (set by login page before OAuth redirect)
        // or URL params as fallback (magic link preserves them in some flows)
        const roleParam = (sessionStorage.getItem('pending_role') ??
          searchParams.get('role')) as DbUserRole | null
        const saathiSlug =
          sessionStorage.getItem('pending_saathi') ?? searchParams.get('saathi')

        // Clear so they don't persist across future logins
        sessionStorage.removeItem('pending_role')
        sessionStorage.removeItem('pending_saathi')

        // ── Ensure profile row exists before any further DB calls ─────────────
        const { isActive, role, wasCreated } = await ensureProfile(
          supabase,
          resolvedSession.user.id,
          resolvedSession.user.email ?? '',
          roleParam,
          resolvedSession.access_token,
        )

        // ── Role-intent mismatch (returning user, asked to register as a
        // different role than their existing profile). The intent silently
        // dropped before this fix — RoleIntentBanner picks this up on the
        // destination page and surfaces it. Skip if wasCreated (new profile
        // already matches the requested role) or if no roleParam was set.
        if (!wasCreated && roleParam && roleParam !== role) {
          try {
            sessionStorage.setItem(
              'edu.role-intent.dropped',
              JSON.stringify({ requested: roleParam, current: role }),
            )
          } catch {
            // sessionStorage can throw in private mode — best-effort only.
          }
        }

        // ── Analytics: signup_completed fires only for genuinely new users ──
        if (wasCreated) {
          const method = resolvedSession.user.app_metadata?.provider === 'google'
            ? 'google'
            : 'email'
          trackSignupCompleted(method, 0)
        }

        // ── Auto-detect faculty: applications, nominations, or approved status ──
        // Check ALL possible faculty signals — not just applications.
        if (role !== 'faculty' && resolvedSession.user.email) {
          try {
            const userEmail = resolvedSession.user.email.toLowerCase()

            // 1. Pending or approved faculty application
            const { data: application } = await supabase
              .from('faculty_applications')
              .select('id, status')
              .eq('email', userEmail)
              .in('status', ['pending', 'approved'])
              .maybeSingle()

            // 2. Faculty nomination (invited, applied, verified, eminent)
            const { data: nomination } = await supabase
              .from('faculty_nominations')
              .select('id, status')
              .eq('faculty_email', userEmail)
              .neq('status', 'declined')
              .maybeSingle()

            if (application || nomination) {
              await supabase
                .from('profiles')
                .update({ role: 'faculty' })
                .eq('id', resolvedSession.user.id)

              // If nomination exists, update its status to 'applied'
              if (nomination && nomination.status === 'invited') {
                await supabase
                  .from('faculty_nominations')
                  .update({ status: 'applied' })
                  .eq('id', nomination.id)
              }
            }
          } catch {
            // Non-critical — they can still complete onboarding manually
          }
        }

        // ── Saathi instant bonding ────────────────────────────────────────────
        // primary_saathi_id is UUID FK → verticals(id). Resolve slug → UUID before saving.
        if (saathiSlug) {
          try {
            const { toVerticalUuid } = await import('@/constants/verticalIds')
            const verticalUuid = toVerticalUuid(saathiSlug)
            if (verticalUuid) {
              await supabase
                .from('profiles')
                .update({ primary_saathi_id: verticalUuid })
                .eq('id', resolvedSession.user.id)
            }
          } catch {
            // Non-critical — onboarding will let user pick anyway
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Fire welcome email — retries handle profile-not-ready race condition.
        // Never blocks navigation.
        sendWelcomeWithRetry(resolvedSession).catch(() => {})

        // Re-read role in case we auto-upgraded to faculty above
        const { data: freshProfile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', resolvedSession.user.id)
          .single()
        const finalRole = freshProfile?.role ?? roleParam ?? role

        if (!isActive) {
          // Faculty applicants go straight to faculty onboarding
          if (finalRole === 'faculty') {
            router.replace('/onboard/faculty')
            return
          }
          // Build onboard URL preserving role + saathi params
          const onboardUrl = new URL('/onboard', window.location.origin)
          if (roleParam) onboardUrl.searchParams.set('role', roleParam)
          if (saathiSlug) onboardUrl.searchParams.set('saathi', saathiSlug)
          router.replace(onboardUrl.pathname + onboardUrl.search)
        } else {
          // Use finalRole — may have been auto-promoted to faculty
          // during this login if application was approved since last visit
          router.replace(roleDefaultRoute(finalRole as DbUserRole))
        }
      } catch (err) {
        setStatus('error')
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error')
        setTimeout(() => router.replace('/login?error=unauthorized'), 1500)
      }
    }

    handleCallback()
  }, [router, searchParams])

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center gap-6 px-4"
      style={{
        background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 100%)',
      }}
    >
      {status === 'verifying' ? (
        <>
          {/* Spinner */}
          <div
            className="h-12 w-12 animate-spin rounded-full border-2 border-white/10"
            style={{ borderTopColor: '#C9993A' }}
          />
          <div className="text-center">
            <p className="font-display mb-1 text-xl font-semibold text-white">
              Verifying your identity...
            </p>
            <p className="text-sm text-white/40">
              Connecting you to your Saathi
            </p>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="mb-2 text-sm text-red-400">Authentication failed</p>
          <p className="text-xs text-white/30">{errorMsg}</p>
          <p className="mt-2 text-xs text-white/40">Redirecting to login...</p>
        </div>
      )}
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main
          className="flex min-h-screen items-center justify-center"
          style={{ background: 'var(--bg-base)' }}
        >
          <div
            className="h-12 w-12 animate-spin rounded-full border-2"
            style={{ borderColor: 'var(--border-medium)', borderTopColor: '#B8860B' }}
          />
        </main>
      }
    >
      <CallbackInner />
    </Suspense>
  )
}
