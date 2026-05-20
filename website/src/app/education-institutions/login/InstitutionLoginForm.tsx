'use client'

// Phase 1.4d — client form for the Institution Portal door. Same auth
// primitives as /login (Supabase signInWithOtp + signInWithOAuth); the
// callback handles routing by user_metadata.institution_role.
//
// Distinct from /login deliberately:
//   • Heavier gold border on the card (institutional, not consumer)
//   • Serif "Institution Portal" headline + EdUsaathiAI wordmark below
//   • Subtitle names the three roles served, in order of authority
//   • Different copy in the "sent" state — addresses returning members
//   • Footer links both ways: student → /login, register new institution → /education-institutions/register

import { useState, useEffect, type FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { trackSignupStarted } from '@/lib/analytics'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.4-11.2-8H6.5C9.8 37.4 16.4 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.3C40.8 35.6 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  )
}

export function InstitutionLoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [resendCountdown, setResendCountdown] = useState(60)
  const [error, setError] = useState('')

  // Mirror /login's error-code surfacing so accept-invite failures (sent via
  // ?error=… on the redirect) read cleanly even if the user lands here
  // instead of /login. Same codes, institution-tinted copy.
  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'invite_invalid') {
      setError('This invite link is not valid. Please ask your principal to send a new invitation.')
    } else if (err === 'invite_expired') {
      setError('This invite link has expired (links are valid for 7 days). Please ask your principal to send a new invitation.')
    } else if (err === 'invite_institution_inactive') {
      setError('This institution is not currently active on EdUsaathiAI. Please contact admin@edusaathiai.in')
    } else if (err === 'link_expired') {
      setError('Your sign-in link expired. Links are valid for 24 hours. Request a new one below.')
    } else if (err === 'unauthorized') {
      setError('Authentication failed. Please try again.')
    }
  }, [searchParams])

  useEffect(() => {
    if (!magicSent || resendCountdown <= 0) return
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [magicSent, resendCountdown])

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')
    trackSignupStarted('google')
    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthError) {
      setError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setMagicLoading(true)
    setError('')
    trackSignupStarted('email')
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        // shouldCreateUser is intentionally TRUE — a faculty who lost the
        // original invite and tries the door directly should still be able
        // to sign in (the members row already binds the institution to
        // their email, so the callback will link the profile on first run).
        shouldCreateUser: true,
      },
    })
    setMagicLoading(false)
    if (otpError) {
      setError(otpError.message)
    } else {
      setMagicSent(true)
      setResendCountdown(60)
    }
  }

  async function handleResend() {
    if (resendCountdown > 0 || !email.trim()) return
    setMagicLoading(true)
    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })
    setMagicLoading(false)
    if (otpError) setError(otpError.message)
    else setResendCountdown(60)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="w-full max-w-md"
    >
      {/* ── Header: serif crown over EdUsaathiAI wordmark ───────────────── */}
      <div className="mb-8 text-center">
        <p
          className="text-[10.5px] font-semibold uppercase"
          style={{ color: '#C9993A', letterSpacing: '2.5px' }}
        >
          EdUsaathiAI
        </p>
        <h1
          className="font-display mt-1 text-3xl font-bold text-white"
          style={{
            fontFamily: 'Fraunces, Georgia, serif',
            letterSpacing: '-0.4px',
          }}
        >
          Institution Portal
        </h1>
        <p
          className="mx-auto mt-3 max-w-sm text-sm leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.55)' }}
        >
          For principals, co-principals, and invited faculty of partner
          institutions. Same email you registered with — we&rsquo;ll route you
          to the right dashboard.
        </p>
      </div>

      {/* ── Card ──────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: 'rgba(11, 31, 58, 0.85)',
          // Slightly heavier gold-tinted border vs /login's neutral border —
          // small choice, but it makes the door read as institutional.
          border: '0.5px solid rgba(201,153,58,0.22)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 30px 60px -30px rgba(0,0,0,0.55), 0 0 0 1px rgba(201,153,58,0.04) inset',
        }}
      >
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5 rounded-xl px-4 py-3 text-sm"
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '0.5px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5',
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {magicSent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 text-center"
            >
              <div className="mb-3 text-3xl">✉️</div>
              <p
                className="mb-1 text-xl font-semibold text-white"
                style={{ fontFamily: 'Fraunces, Georgia, serif' }}
              >
                Sign-in link sent to
              </p>
              <p className="text-sm font-medium" style={{ color: '#C9993A' }}>
                {email}
              </p>
              <p
                className="mt-4 text-sm leading-relaxed"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Click the link in your inbox to open your institution dashboard.
                It usually arrives within 2 minutes.
              </p>
              <div
                className="mx-auto mt-4 max-w-xs rounded-xl px-4 py-3 text-left text-xs leading-relaxed"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <p
                  className="mb-1 font-medium"
                  style={{ color: 'rgba(255,255,255,0.55)' }}
                >
                  Using an institutional email?
                </p>
                <p>
                  Mail servers sometimes hold these links for up to 15 minutes.
                  Check the spam folder if it&rsquo;s slow.
                </p>
              </div>
              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  onClick={handleResend}
                  disabled={resendCountdown > 0 || magicLoading}
                  className="text-sm font-medium disabled:opacity-40"
                  style={{
                    color: resendCountdown > 0 ? 'rgba(255,255,255,0.25)' : '#C9993A',
                  }}
                >
                  {magicLoading
                    ? 'Sending…'
                    : resendCountdown > 0
                      ? `Resend link → (${resendCountdown}s)`
                      : 'Resend link →'}
                </button>
                <button
                  onClick={() => {
                    setMagicSent(false)
                    setEmail('')
                  }}
                  className="text-xs underline underline-offset-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Try a different email instead →
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form">
              {/* Google */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading || magicLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                {googleLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Connecting…' : 'Continue with Google'}
              </button>

              <div className="my-6 flex items-center gap-4">
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  or
                </span>
                <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Magic link */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <label htmlFor="inst-login-email" className="sr-only">
                  Email
                </label>
                <input
                  id="inst-login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your institutional email"
                  required
                  disabled={magicLoading}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.55)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="submit"
                  disabled={magicLoading || googleLoading || !email.trim()}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold transition-colors duration-200"
                  style={{
                    background: !email.trim() ? '#1F2937' : '#C9993A',
                    color: !email.trim() ? '#D1D5DB' : '#060F1D',
                    cursor: !email.trim() ? 'not-allowed' : 'pointer',
                    border: !email.trim() ? '1px solid #374151' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (email.trim() && !magicLoading) e.currentTarget.style.background = '#E5B86A'
                  }}
                  onMouseLeave={(e) => {
                    if (email.trim() && !magicLoading) e.currentTarget.style.background = '#C9993A'
                  }}
                >
                  {magicLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D]" />
                      Sending…
                    </span>
                  ) : !email.trim() ? (
                    'Enter your email above'
                  ) : (
                    'Send sign-in link →'
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Footers (both directions of discoverability) ────────────────── */}
      <p
        className="mt-6 text-center text-[13px]"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        Are you a student?{' '}
        <Link
          href="/login"
          style={{
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Sign in here →
        </Link>
      </p>
      <p
        className="mt-2 text-center text-[13px]"
        style={{ color: 'rgba(255,255,255,0.4)' }}
      >
        New institution?{' '}
        <Link
          href="/education-institutions/register"
          style={{
            color: 'rgba(255,255,255,0.7)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Register your institution →
        </Link>
      </p>

      <p
        className="mt-6 text-center text-[11px]"
        style={{ color: 'rgba(255,255,255,0.3)' }}
      >
        By signing in you agree to our{' '}
        <a href="/terms" style={{ color: 'rgba(255,255,255,0.5)' }}>Terms</a>{' '}
        and{' '}
        <a href="/privacy" style={{ color: 'rgba(255,255,255,0.5)' }}>Privacy Policy</a>.
      </p>
    </motion.div>
  )
}
