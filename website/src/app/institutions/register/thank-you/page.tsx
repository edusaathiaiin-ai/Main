// ─────────────────────────────────────────────────────────────────────────────
// /institutions/register/thank-you — warm post-submission page.
//
// No login, no next steps, no lead-capture tricks — just acknowledgement and
// a soft invitation to explore the student-facing product while they wait
// for Jaydeep's follow-up.
// ─────────────────────────────────────────────────────────────────────────────

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Registration received · EdUsaathiAI',
  description: 'Your institution registration is with us. Jaydeep Buch will reach out within 48 hours.',
}

export default function InstitutionRegisterThankYouPage() {
  return (
    <main
      style={{
        background: 'var(--bg-base)',
        minHeight:  '100vh',
        display:    'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding:    '48px 20px',
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 580,
          width:    '100%',
          padding:  '40px 32px',
          textAlign:'center',
        }}
      >
        {/* Gold accent line */}
        <div style={{
          width: 40, height: 3, borderRadius: 999,
          background: 'var(--gold)',
          margin: '0 auto 24px',
        }} />

        {/* Soft checkmark */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'var(--saathi-light)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          fontSize: 28,
        }}
             aria-hidden="true">
          ✦
        </div>

        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize:   'clamp(24px, 3.4vw, 32px)',
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          margin: '0 0 16px',
          color: 'var(--text-primary)',
        }}>
          We&apos;ve received your registration.
        </h1>

        <p style={{
          fontSize:   16,
          lineHeight: 1.7,
          color:      'var(--text-secondary)',
          margin:     '0 0 14px',
        }}>
          <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Jaydeep Buch
          </strong> will reach out within 48 hours to schedule a short demo
          session with your team.
        </p>

        <p style={{
          fontSize:   15,
          lineHeight: 1.7,
          color:      'var(--text-secondary)',
          margin:     '0 0 28px',
        }}>
          In the meantime, explore what your students will experience:
        </p>

        <Link
          href="/"
          className="btn btn-primary btn-large"
          style={{
            display: 'inline-flex',
            padding: '12px 24px',
            fontSize: 15,
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Explore edusaathiai.in →
        </Link>

        <p style={{
          fontSize: 12, color: 'var(--text-ghost)',
          margin: '32px 0 0', lineHeight: 1.6,
        }}>
          Anything urgent? Email{' '}
          <a href="mailto:admin@edusaathiai.in" style={{ color: 'var(--gold)', textDecoration: 'none' }}>
            admin@edusaathiai.in
          </a>
          {' '}— we respond within a working day.
        </p>
      </div>
    </main>
  )
}
