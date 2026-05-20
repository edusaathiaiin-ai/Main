// ─────────────────────────────────────────────────────────────────────────────
// /education-institutions/login — Institution Portal sign in (Phase 1.4d)
//
// A distinct, decorated door for institution members. The mechanism is the
// same as /login (Supabase email magic link + Google OAuth) — what differs
// is identity:
//
//   • URL signals where you belong (/education-institutions/login, not /login)
//   • Headline is "Institution Portal", not generic sign-in
//   • Subtitle names the three roles served: principal, co-principal, faculty
//   • Stronger gold accent + serif headline tie back to the activation email
//     and the principal dashboard (visual continuity)
//
// Under the hood, signInWithOtp / signInWithOAuth → /auth/callback. The
// callback reads user_metadata.institution_role and routes:
//   principal → /education-institutions/<slug>/admin
//   faculty   → /education-institutions/<slug>/faculty
//   (no role) → /chat   ← if a student wanders here, they still land sane
//
// So this page never needs to "know" who's signing in; it's pure identity
// surface. The routing intelligence stays in the callback (the locked
// design — metadata is the source of truth, not URL provenance).
//
// Student footer link bounces back to /login. The /login page gets a
// reciprocal "Institution sign in →" link so discoverability runs both ways.
// ─────────────────────────────────────────────────────────────────────────────

import { Suspense } from 'react'
import { InstitutionLoginForm } from './InstitutionLoginForm'

export const metadata = {
  title: 'Institution Sign In — EdUsaathiAI',
  description: 'For principals, co-principals, and faculty of partner institutions on EdUsaathiAI.',
}

export default function InstitutionLoginPage() {
  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16"
      style={{
        // Deeper navy than /login + a centred gold ribbon glow at the top —
        // reads as "you are entering an institutional space", not consumer.
        background:
          'linear-gradient(180deg, #050B14 0%, #0B1F3A 55%, #050B14 100%)',
      }}
    >
      {/* Ambient gold ribbon — wider than /login's glow, sits higher. */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 820,
          height: 220,
          top: '14%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(ellipse, rgba(201,153,58,0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Thin gold rule across the top of the card area — pure decoration */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 1,
          height: '38%',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          background:
            'linear-gradient(180deg, transparent 0%, rgba(201,153,58,0.45) 60%, transparent 100%)',
        }}
      />

      <Suspense
        fallback={
          <div className="w-full max-w-md">
            <div className="mb-10 text-center">
              <h1 className="font-display text-3xl font-bold text-white">
                Institution Portal
              </h1>
            </div>
            <div
              className="h-64 animate-pulse rounded-2xl p-8"
              style={{
                background: 'rgba(11,31,58,0.85)',
                border: '0.5px solid rgba(201,153,58,0.18)',
              }}
            />
          </div>
        }
      >
        <InstitutionLoginForm />
      </Suspense>
    </main>
  )
}
