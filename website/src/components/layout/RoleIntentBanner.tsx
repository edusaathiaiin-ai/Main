'use client'

// ─────────────────────────────────────────────────────────────────────────────
// RoleIntentBanner — surfaces the "you came here intending to be X but
// you're already Y" case after magic-link callback.
//
// The auth/callback page sets a sessionStorage flag when a returning user
// hits the form with `?role=faculty` (or similar) but their existing
// profile is a different role. Without this banner, the role intent
// silently dropped — the user logged in, landed on their existing
// dashboard, and never knew their faculty/institution intent went to
// /dev/null.
//
// Mounted at the (app)/layout level so any landing page — /chat,
// /faculty, /institution — shows it once. Dismissed via the X (or
// successful click on the CTA) clears the flag.
//
// Lives in sessionStorage, NOT a URL param, because: (a) we don't want
// it persisting if the user shares the URL, (b) refresh keeps the
// banner present until they dismiss, (c) the URL stays clean.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'

type Intent = {
  requested: 'faculty' | 'institution' | 'public' | 'student'
  current:   'faculty' | 'institution' | 'public' | 'student' | 'global_guest'
}

const STORAGE_KEY = 'edu.role-intent.dropped'

const PATHS: Record<Intent['requested'], { label: string; href: string }> = {
  faculty:     { label: 'Apply to teach',          href: '/teach' },
  institution: { label: 'Register your institution', href: '/education-institutions/register' },
  public:      { label: 'Browse as guest',         href: '/explore' },
  student:     { label: 'Continue as student',     href: '/chat' },
}

export function RoleIntentBanner() {
  const [intent, setIntent] = useState<Intent | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as Intent
      // Sanity-check: only show if the requested role actually differs.
      if (parsed.requested && parsed.current && parsed.requested !== parsed.current) {
        setIntent(parsed)
      } else {
        window.sessionStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  function dismiss() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(STORAGE_KEY)
    }
    setIntent(null)
  }

  if (!intent) return null

  const cta = PATHS[intent.requested]
  const requestedLabel = capitaliseRole(intent.requested)
  const currentLabel   = capitaliseRole(intent.current)

  return (
    <div
      role="status"
      style={{
        position:   'sticky',
        top:        0,
        zIndex:     50,
        width:      '100%',
        padding:    '10px 16px',
        background: 'linear-gradient(90deg, rgba(184,134,11,0.12) 0%, rgba(201,153,58,0.06) 100%)',
        borderBottom: '0.5px solid rgba(201,153,58,0.35)',
        color:      'var(--text-primary)',
        display:    'flex',
        alignItems: 'center',
        gap:        12,
        fontSize:   13,
        lineHeight: 1.5,
      }}
    >
      <span style={{ fontSize: 16 }}>✦</span>
      <p style={{ flex: 1, margin: 0 }}>
        You came here intending to register as <strong>{requestedLabel}</strong> — you&apos;re currently
        signed in as <strong>{currentLabel}</strong>.{' '}
        <a
          href={cta.href}
          style={{
            color:           'var(--gold)',
            fontWeight:      600,
            textDecoration:  'underline',
            textUnderlineOffset: '3px',
          }}
        >
          {cta.label} →
        </a>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        style={{
          width:      24,
          height:     24,
          borderRadius: 6,
          border:     'none',
          background: 'transparent',
          color:      'var(--text-secondary)',
          cursor:     'pointer',
          fontSize:   16,
          lineHeight: 1,
          padding:    0,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}

function capitaliseRole(r: string): string {
  if (r === 'global_guest') return 'Global Guest'
  return r.charAt(0).toUpperCase() + r.slice(1)
}
