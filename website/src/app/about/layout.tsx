import type { ReactNode } from 'react'
import { Fraunces, Plus_Jakarta_Sans } from 'next/font/google'

const fraunces = Fraunces({
  subsets:  ['latin'],
  variable: '--font-about-display',
  display:  'swap',
  weight:   ['400', '500', '600', '700'],
})

const jakarta = Plus_Jakarta_Sans({
  subsets:  ['latin'],
  variable: '--font-about-body',
  display:  'swap',
  weight:   ['300', '400', '500', '600', '700', '800'],
})

export default function AboutLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${fraunces.variable} ${jakarta.variable}`}
      style={{
        background: '#FFFFFF',
        color:      '#0A0A0A',
        minHeight:  '100vh',
        fontFamily: 'var(--font-about-body), system-ui, -apple-system, sans-serif',
      }}
    >
      {children}
    </div>
  )
}
