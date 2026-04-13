'use client'

/**
 * WaLinkTip — post-first-chat nudge to link WhatsApp.
 *
 * Renders below the chat input. Visible only when:
 *   - User has not yet linked their WhatsApp number (profile.wa_phone null), AND
 *   - User has had at least one round-trip exchange in the current chat
 *     (messages.length >= 2 — one user msg + one assistant reply), AND
 *   - User has not previously dismissed the nudge.
 *
 * Once dismissed it never reappears (localStorage). Once a phone is linked
 * the nudge auto-disappears even without explicit dismissal.
 *
 * Tone is benefit-led: "one soul, every device" — never pushy, never
 * mandatory. See CLAUDE.md §17 (Points Economy / dignity escape hatches).
 */

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { trackWaLinkClicked } from '@/lib/analytics'

const DISMISSED_KEY = 'wa_nudge_dismissed'

export function WaLinkTip() {
  const profile = useAuthStore((s) => s.profile)
  const messageCount = useChatStore((s) => s.messages.length)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(DISMISSED_KEY) === '1'
  })

  // Don't render until the student has actually had a chat exchange
  const hasChatted = messageCount >= 2
  const hasWa = !!profile?.wa_phone
  if (!profile || hasWa || dismissed || !hasChatted) return null

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1')
    setDismissed(true)
  }

  return (
    <div
      className="mx-3 mt-2 flex items-start justify-between gap-3 rounded-xl px-4 py-3"
      style={{
        background: 'rgba(37,211,102,0.07)',
        border: '1px solid rgba(37,211,102,0.18)',
      }}
    >
      <div className="flex-1">
        <p
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary, #1A1814)' }}
        >
          📱 Your Saathi is also on WhatsApp
        </p>
        <p
          className="mt-1 text-xs"
          style={{ color: 'var(--text-secondary, #4A4740)' }}
        >
          Same soul memory, same journey — everywhere.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <Link
            href="/profile#whatsapp"
            onClick={() => trackWaLinkClicked('chat_tip')}
            className="text-xs font-semibold underline underline-offset-2"
            style={{ color: 'var(--gold, #B8860B)' }}
          >
            Add your number →
          </Link>
          <button
            onClick={dismiss}
            className="text-xs"
            style={{ color: 'var(--text-ghost, #A8A49E)' }}
          >
            Maybe later
          </button>
        </div>
      </div>
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
