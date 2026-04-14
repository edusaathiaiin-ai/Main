/**
 * /teach route layout.
 *
 * Faculty landing page — separate design language from the rest of the
 * site: dark, prestigious, invitation-only feel. Loads Fraunces + Plus
 * Jakarta Sans as scoped CSS variables so they only ship when someone
 * actually visits /teach — the student-facing pages keep their existing
 * Playfair + DM Sans bundle untouched.
 *
 * All marketing sections of /teach compose under this layout.
 */

import type { ReactNode } from 'react'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets:  ['latin'],
  variable: '--font-teach-display',
  display:  'swap',
  weight:   ['400', '500', '600', '700'],
})

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-teach-body',
  display:  'swap',
  weight:   ['300', '400', '500', '600', '700'],
})

export default function TeachLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${jakarta.variable}`}
      style={{
        background: '#0F1923',
        color:      '#FFFFFF',
        minHeight:  '100vh',
        fontFamily: 'var(--font-teach-body), system-ui, -apple-system, sans-serif',
      }}
    >
      {children}
    </div>
  )
}
