'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import ForcedLogoutScreen from '@/components/ui/ForcedLogoutScreen'

// ── Google icon ───────────────────────────────────────────────────────────────
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

// ── Main login form ───────────────────────────────────────────────────────────
function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [error, setError] = useState('')
  const isForced = searchParams.get('forced') === '1'

  useEffect(() => {
    function run() {
      const err = searchParams.get('error')
      if (err === 'link_expired') {
        setError(
          'Your login link expired. Links are valid for 24 hours. Request a new one below.'
        )
      } else if (err === 'unauthorized') {
        setError('Authentication failed. Please try again.')
      }
    }
    run()
  }, [searchParams])

  // Show kicked-out screen if redirected from ChatWindow after forced logout
  if (isForced) {
    return <ForcedLogoutScreen />
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setError('')

    // Store role/saathi in sessionStorage — query params on redirectTo
    // cause Google OAuth 400 (redirect_uri mismatch). Callback reads these.
    const role = searchParams.get('role')
    const saathi = searchParams.get('saathi')
    if (role) sessionStorage.setItem('pending_role', role)
    if (saathi) sessionStorage.setItem('pending_saathi', saathi)

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (oauthError) {
      setError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
    // On success browser redirects — no code needed
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setMagicLoading(true)
    setError('')

    // Store role/saathi in sessionStorage (same reason as Google OAuth above)
    const role = searchParams.get('role')
    const saathi = searchParams.get('saathi')
    if (role) sessionStorage.setItem('pending_role', role)
    if (saathi) sessionStorage.setItem('pending_saathi', saathi)

    const supabase = createClient()
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    })
    setMagicLoading(false)
    if (otpError) {
      setError(otpError.message)
    } else {
      setMagicSent(true)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-sm"
    >
      {/* Logo */}
      <div className="mb-10 text-center">
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edusaathiai.in'}
          className="inline-block"
        >
          <h1
            className="font-playfair text-4xl font-bold tracking-tight text-white"
            style={{ letterSpacing: '-0.5px' }}
          >
            EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
          </h1>
        </a>
        <p
          className="mt-2 text-sm"
          style={{
            color: '#C9993A',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            fontWeight: 500,
            fontSize: '10px',
          }}
        >
          Unified Soul Partnership
        </p>
      </div>

      {/* Card */}
      <div
        className="rounded-2xl p-8"
        style={{
          background: 'rgba(11, 31, 58, 0.8)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Error */}
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

        {/* Magic link sent state */}
        <AnimatePresence mode="wait">
          {magicSent ? (
            <motion.div
              key="sent"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-4 text-center"
            >
              <div className="mb-4 text-3xl">📬</div>
              <p className="font-playfair mb-2 text-xl font-semibold text-white">
                Check your email ✓
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We sent a magic link to
              </p>
              <p
                className="mt-1 text-sm font-medium"
                style={{ color: '#C9993A' }}
              >
                {email}
              </p>
              <button
                onClick={() => {
                  setMagicSent(false)
                  setEmail('')
                }}
                className="mt-6 text-xs underline underline-offset-2"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                Use a different email
              </button>
            </motion.div>
          ) : (
            <motion.div key="form">
              {/* Google OAuth */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading || magicLoading}
                className="flex w-full items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')
                }
              >
                {googleLoading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="my-6 flex items-center gap-4">
                <div
                  className="h-px flex-1"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
                <span
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                >
                  or
                </span>
                <div
                  className="h-px flex-1"
                  style={{ background: 'rgba(255,255,255,0.06)' }}
                />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={magicLoading}
                  className="w-full rounded-xl px-4 py-3.5 text-sm transition-all duration-200 outline-none disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor =
                      'rgba(255,255,255,0.1)')
                  }
                />
                <button
                  type="submit"
                  disabled={magicLoading || googleLoading || !email.trim()}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                  style={{ background: '#C9993A', color: '#060F1D' }}
                  onMouseEnter={(e) => {
                    if (!magicLoading)
                      e.currentTarget.style.background = '#E5B86A'
                  }}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#C9993A')
                  }
                >
                  {magicLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D]" />
                      Sending...
                    </span>
                  ) : (
                    'Send Magic Link'
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* WhatsApp option */}
      <div
        style={{
          margin: '20px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <div
          style={{
            flex: 1,
            height: '0.5px',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
          or
        </span>
        <div
          style={{
            flex: 1,
            height: '0.5px',
            background: 'rgba(255,255,255,0.1)',
          }}
        />
      </div>
      <a
        href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER ?? '919XXXXXXXXX'}?text=Hi`}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          width: '100%',
          padding: '14px',
          borderRadius: '12px',
          marginTop: '12px',
          background: '#25D366',
          color: '#fff',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: '600',
          transition: 'all 0.2s ease',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        Chat on WhatsApp instead
      </a>
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
          marginTop: '8px',
        }}
      >
        No account needed &bull; Just message and start
      </p>

      {/* Mobile magic link tip */}
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '12px',
          textAlign: 'center',
        }}
      >
        On mobile? If the magic link doesn&apos;t work, copy it and open in
        Chrome or Safari.
      </p>

      {/* New user link */}
      <p
        style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.35)',
          textAlign: 'center',
          marginTop: '12px',
        }}
      >
        New to EdUsaathiAI?{' '}
        <Link
          href="/"
          style={{
            color: 'rgba(255,255,255,0.6)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          Explore the platform →
        </Link>
      </p>

      {/* Footer */}
      <p
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.35)',
          textAlign: 'center',
          marginTop: '12px',
        }}
      >
        By signing in you agree to our{' '}
        <a
          href="/terms"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          className="transition-colors hover:text-white"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          className="transition-colors hover:text-white"
        >
          Privacy Policy
        </a>
      </p>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <main
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16"
      style={{
        background:
          'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: 600,
          height: 600,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
          background:
            'radial-gradient(circle, rgba(201,153,58,0.06) 0%, transparent 70%)',
        }}
      />

      <Suspense
        fallback={
          <div className="w-full max-w-sm">
            <div className="mb-10 text-center">
              <h1 className="font-playfair text-4xl font-bold text-white">
                EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
              </h1>
            </div>
            <div
              className="h-64 animate-pulse rounded-2xl p-8"
              style={{
                background: 'rgba(11,31,58,0.8)',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
            />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  )
}
