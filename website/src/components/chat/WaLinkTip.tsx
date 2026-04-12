'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'

const DISMISSED_KEY = 'wa_link_tip_dismissed'

export function WaLinkTip() {
  const profile = useAuthStore((s) => s.profile)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DISMISSED_KEY) === '1'
  })

  // Only show for Plus users who haven't linked WhatsApp
  const isPlus = profile?.plan_id && profile.plan_id !== 'free'
  const hasWa  = !!profile?.wa_phone

  if (!isPlus || hasWa || dismissed) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      className="mx-3 mt-2 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5"
      style={{
        background: 'rgba(37,211,102,0.07)',
        border: '1px solid rgba(37,211,102,0.18)',
      }}
    >
      <p className="text-xs" style={{ color: 'var(--text-secondary, #4A4740)' }}>
        <span className="mr-1">💬</span>
        Link your WhatsApp in{' '}
        <Link
          href="/profile"
          className="font-semibold underline underline-offset-2"
          style={{ color: 'var(--gold, #B8860B)' }}
        >
          Profile
        </Link>{' '}
        to use your Plus quota on WhatsApp Saathi.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 text-sm leading-none"
        style={{ color: 'var(--text-ghost, #A8A49E)' }}
      >
        ✕
      </button>
    </div>
  )
}
