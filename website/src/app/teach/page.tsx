import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title:       'Teach on EdUsaathiAI — Faculty Partner Programme',
  description:
    'Join EdUsaathiAI as a faculty partner. Connect with thousands of serious students for live, personalised sessions that no AI can replace.',
  openGraph: {
    title:       'Teach on EdUsaathiAI — Faculty Partner Programme',
    description:
      "Your knowledge has shaped careers. Now let it reach thousands.",
    type:        'website',
  },
  robots: { index: true, follow: true },
}

// ── Brand tokens, scoped to this page so future sections reuse them ─────
const GOLD        = '#C9993A'
const GOLD_LIGHT  = '#E5B86A'
const TEXT_HIGH   = '#FFFFFF'
const TEXT_MID    = 'rgba(255, 255, 255, 0.60)'
const TEXT_LOW    = 'rgba(255, 255, 255, 0.40)'
const BG_ACCENT   = 'rgba(201, 153, 58, 0.05)'

export default function TeachLandingPage() {
  return (
    <main>
      <Hero />
      {/* Future sections 2–6 land below this line */}
    </main>
  )
}

// ──────────────────────────────────────────────────────────────────────
// Section 1 — Hero
// ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section
      className="relative overflow-hidden"
      style={{ paddingTop: '120px', paddingBottom: '140px' }}
    >
      {/* Ambient gold glow, soft, top-right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute"
        style={{
          top:      '-10%',
          right:    '-15%',
          width:    '680px',
          height:   '680px',
          background:
            'radial-gradient(circle, rgba(201,153,58,0.08) 0%, transparent 65%)',
          filter:   'blur(40px)',
        }}
      />

      <div
        className="relative mx-auto px-6 md:px-10"
        style={{ maxWidth: '960px' }}
      >
        {/* Eyebrow */}
        <p
          className="uppercase"
          style={{
            color:          GOLD,
            fontSize:       '12px',
            letterSpacing:  '0.22em',
            fontWeight:     600,
            marginBottom:   '32px',
          }}
        >
          Faculty Partner Programme
        </p>

        {/* Headline */}
        <h1
          style={{
            fontFamily:    'var(--font-teach-display), Georgia, serif',
            color:         TEXT_HIGH,
            fontSize:      'clamp(36px, 6vw, 56px)',
            lineHeight:    1.1,
            fontWeight:    500,
            letterSpacing: '-0.02em',
            marginBottom:  '28px',
          }}
        >
          Your knowledge has
          <br />
          shaped careers.
          <br />
          Now let it reach <span style={{ color: GOLD }}>thousands</span>.
        </h1>

        {/* Subtext */}
        <p
          style={{
            color:        TEXT_MID,
            fontSize:     '18px',
            lineHeight:   1.6,
            maxWidth:     '620px',
            marginBottom: '48px',
            fontWeight:   400,
          }}
        >
          EdUsaathiAI connects India&rsquo;s brightest students with experts
          like you &mdash; for live, personalised sessions that no AI can
          replace.
        </p>

        {/* Primary CTA — gold button */}
        <div className="flex flex-col items-start gap-5">
          <Link
            href="/login?role=faculty"
            className="inline-flex items-center gap-2 transition-all duration-200"
            style={{
              background:   GOLD,
              color:        '#0F1923',
              padding:      '18px 36px',
              borderRadius: '14px',
              fontSize:     '16px',
              fontWeight:   700,
              boxShadow:    '0 12px 40px rgba(201,153,58,0.25)',
              textDecoration: 'none',
            }}
          >
            Apply to join our faculty
            <span aria-hidden="true" style={{ fontSize: '18px' }}>&rarr;</span>
          </Link>

          {/* Secondary link — sign in */}
          <p style={{ color: TEXT_LOW, fontSize: '13px', marginTop: '4px' }}>
            Already a faculty partner?{' '}
            <Link
              href="/login"
              style={{
                color:           GOLD_LIGHT,
                textDecoration:  'none',
                fontWeight:      500,
                borderBottom:    `1px solid ${GOLD_LIGHT}33`,
                paddingBottom:   '1px',
              }}
            >
              Sign in &rarr;
            </Link>
          </p>
        </div>
      </div>

      {/* Thin gold separator — visually closes the hero and signals more below */}
      <div
        aria-hidden="true"
        className="mx-auto"
        style={{
          marginTop: '120px',
          maxWidth:  '120px',
          height:    '1px',
          background: `linear-gradient(90deg, transparent, ${GOLD}55, transparent)`,
        }}
      />

      {/* Subtle bottom gradient so the eye keeps scrolling */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height:     '120px',
          background: `linear-gradient(180deg, transparent, ${BG_ACCENT})`,
        }}
      />
    </section>
  )
}
