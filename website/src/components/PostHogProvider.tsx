'use client'

/**
 * PostHog provider for the Next.js App Router.
 * See CLAUDE.md §25 for event catalogue and privacy rules.
 *
 * - Initialises posthog-js once on the client
 * - Captures $pageview on every route change (App Router doesn't emit page
 *   events natively — we observe pathname + search params)
 * - Disables autocapture of form inputs (students type emails/questions)
 * - Session replay OFF at launch
 */

import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'

function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    const search = searchParams?.toString()
    const url = search ? `${pathname}?${search}` : pathname
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return // no-op when key missing (prevents noisy errors in dev)

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      // Only create person profiles after identify() — anonymous marketing
      // traffic doesn't burn quota on profiles we'll never use
      person_profiles: 'identified_only',
      capture_pageview: false, // we handle pageviews manually for App Router
      capture_pageleave: true,
      autocapture: {
        // Privacy: do not capture text from inputs/textareas (students type
        // emails, questions, personal info) — CLAUDE.md §25
        dom_event_allowlist: ['click', 'submit'],
        css_selector_allowlist: ['[data-ph-capture]'],
      },
      disable_session_recording: true, // session replay OFF at launch
      persistence: 'localStorage+cookie',
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug(false)
      },
    })
  }, [])

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </PHProvider>
  )
}
