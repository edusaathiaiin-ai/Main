'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import ForcedLogoutScreen from '@/components/ui/ForcedLogoutScreen';

// ── Google icon ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3.1 0 5.8 1.1 8 2.9l5.7-5.7C34.1 6.7 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-1.9 13.5-5.1l-6.2-5.3C29.4 35.5 26.8 36 24 36c-5.2 0-9.6-3.4-11.2-8H6.5C9.8 37.4 16.4 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.6l6.2 5.3C40.8 35.6 44 30.2 44 24c0-1.3-.1-2.6-.4-3.9z"/>
    </svg>
  );
}

// ── Main login form ───────────────────────────────────────────────────────────
function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState('');
  const isForced = searchParams.get('forced') === '1';

  useEffect(() => {
    const err = searchParams.get('error');
    if (err === 'link_expired') {
      setError('Your login link expired. Links are valid for 24 hours. Request a new one below.');
    } else if (err === 'unauthorized') {
      setError('Authentication failed. Please try again.');
    }
  }, [searchParams]);

  // Show kicked-out screen if redirected from ChatWindow after forced logout
  if (isForced) {
    return <ForcedLogoutScreen />;
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError('');

    // Store role/saathi in sessionStorage — query params on redirectTo
    // cause Google OAuth 400 (redirect_uri mismatch). Callback reads these.
    const role = searchParams.get('role');
    const saathi = searchParams.get('saathi');
    if (role) sessionStorage.setItem('pending_role', role);
    if (saathi) sessionStorage.setItem('pending_saathi', saathi);

    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // On success browser redirects — no code needed
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setMagicLoading(true);
    setError('');

    // Store role/saathi in sessionStorage (same reason as Google OAuth above)
    const role = searchParams.get('role');
    const saathi = searchParams.get('saathi');
    if (role) sessionStorage.setItem('pending_role', role);
    if (saathi) sessionStorage.setItem('pending_saathi', saathi);

    const supabase = createClient();
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        shouldCreateUser: true,
      },
    });
    setMagicLoading(false);
    if (otpError) {
      setError(otpError.message);
    } else {
      setMagicSent(true);
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
      <div className="text-center mb-10">
        <a
          href={process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edusaathiai.in'}
          className="inline-block"
        >
          <h1
            className="font-playfair text-4xl font-bold text-white tracking-tight"
            style={{ letterSpacing: '-0.5px' }}
          >
            EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
          </h1>
        </a>
        <p className="mt-2 text-sm" style={{ color: '#C9993A', letterSpacing: '1.5px', textTransform: 'uppercase', fontWeight: 500, fontSize: '10px' }}>
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
              className="mb-5 px-4 py-3 rounded-xl text-sm"
              style={{ background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
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
              className="text-center py-4"
            >
              <div className="text-3xl mb-4">📬</div>
              <p className="font-playfair text-xl text-white font-semibold mb-2">
                Check your email ✓
              </p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                We sent a magic link to
              </p>
              <p className="text-sm font-medium mt-1" style={{ color: '#C9993A' }}>
                {email}
              </p>
              <button
                onClick={() => { setMagicSent(false); setEmail(''); }}
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
                className="w-full flex items-center justify-center gap-3 rounded-xl py-3.5 text-sm font-medium transition-all duration-200 disabled:opacity-50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  color: '#fff',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                {googleLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                {googleLoading ? 'Connecting...' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={magicLoading}
                  className="w-full rounded-xl px-4 py-3.5 text-sm outline-none transition-all duration-200 disabled:opacity-50"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="submit"
                  disabled={magicLoading || googleLoading || !email.trim()}
                  className="w-full rounded-xl py-3.5 text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                  style={{ background: '#C9993A', color: '#060F1D' }}
                  onMouseEnter={e => { if (!magicLoading) e.currentTarget.style.background = '#E5B86A'; }}
                  onMouseLeave={e => (e.currentTarget.style.background = '#C9993A')}
                >
                  {magicLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D] animate-spin" />
                      Sending...
                    </span>
                  ) : 'Send Magic Link'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile magic link tip */}
      <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'12px', textAlign:'center'}}>
        On mobile? If the magic link doesn&apos;t work, copy it and open in Chrome or Safari.
      </p>

      {/* New user link */}
      <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', textAlign:'center', marginTop:'12px'}}>
        New to EdUsaathiAI?{' '}
        <a href="/" style={{color:'rgba(255,255,255,0.6)', textDecoration:'underline', textUnderlineOffset:'3px'}}>
          Explore the platform →
        </a>
      </p>

      {/* Footer */}
      <p style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', textAlign:'center', marginTop:'12px'}}>
        By signing in you agree to our{' '}
        <a href="/terms" style={{color:'rgba(255,255,255,0.5)'}} className="hover:text-white transition-colors">
          Terms of Service
        </a>
        {' '}and{' '}
        <a href="/privacy" style={{color:'rgba(255,255,255,0.5)'}} className="hover:text-white transition-colors">
          Privacy Policy
        </a>
      </p>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 600,
          height: 600,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -60%)',
          background: 'radial-gradient(circle, rgba(201,153,58,0.06) 0%, transparent 70%)',
        }}
      />

      <Suspense fallback={
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <h1 className="font-playfair text-4xl font-bold text-white">
              EdU<span style={{ color: '#C9993A' }}>saathi</span>AI
            </h1>
          </div>
          <div className="rounded-2xl p-8 h-64 animate-pulse" style={{ background: 'rgba(11,31,58,0.8)', border: '0.5px solid rgba(255,255,255,0.08)' }} />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </main>
  );
}
