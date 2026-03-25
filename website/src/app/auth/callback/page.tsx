'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Session } from '@supabase/supabase-js';

// ── Session register (fire-and-forget after every successful login) ─────────

async function callSessionRegister(accessToken: string): Promise<void> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-register`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ deviceInfo: { platform: 'web' } }),
    });
  } catch {
    // fire-and-forget — silently swallow; login flow must not be blocked
  }
}

// ─────────────────────────────────────────────────────────────────────────────

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const supabase = createClient();

    async function handleCallback() {
      try {
        // Give Supabase a moment to exchange the PKCE code
        let resolvedSession: Session | null = null;

        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // Session may not be ready yet — wait 800ms and retry once
          await new Promise((r) => setTimeout(r, 800));
          const { data: { session: retrySession }, error: retryError } =
            await supabase.auth.getSession();

          if (retryError || !retrySession) {
            setStatus('error');
            setErrorMsg(retryError?.message ?? 'Session not found');
            setTimeout(() => router.push('/login?error=unauthorized'), 1500);
            return;
          }
          resolvedSession = retrySession;
        } else {
          resolvedSession = session;
        }

        // Single-device enforcement — fire-and-forget, must not block redirect
        void callSessionRegister(resolvedSession.access_token);

        // ── Saathi instant bonding ────────────────────────────────────────────
        // If student clicked "Can I be your Saathi?" from the hero grid,
        // the saathi slug is passed as ?saathi= through the login URL.
        // We pre-set primary_saathi_id before they hit onboarding.
        const saathiSlug = searchParams.get('saathi');
        if (saathiSlug) {
          try {
            // Look up the vertical by slug in Supabase
            const { data: vertical } = await supabase
              .from('verticals')
              .select('id')
              .eq('slug', saathiSlug)
              .single();

            if (vertical?.id) {
              await supabase
                .from('profiles')
                .update({ primary_saathi_id: vertical.id })
                .eq('id', resolvedSession.user.id);
            }
          } catch {
            // Non-critical — onboarding will let user pick anyway
          }
        }
        // ─────────────────────────────────────────────────────────────────────

        // Check profile completion — use is_active as the canonical onboard signal
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', resolvedSession.user.id)
          .single();

        if (!profile || !profile.is_active) {
          // If saathi was pre-set, skip directly to profile step
          router.push(saathiSlug ? '/onboard?step=profile' : '/onboard');
        } else {
          router.push('/chat');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        setTimeout(() => router.push('/login?error=unauthorized'), 1500);
      }
    }

    handleCallback();
  }, [router, searchParams]);

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
      style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 100%)' }}
    >
      {status === 'verifying' ? (
        <>
          {/* Spinner */}
          <div
            className="w-12 h-12 rounded-full border-2 border-white/10 animate-spin"
            style={{ borderTopColor: '#C9993A' }}
          />
          <div className="text-center">
            <p className="font-playfair text-xl text-white font-semibold mb-1">
              Verifying your identity...
            </p>
            <p className="text-white/40 text-sm">
              Connecting you to your Saathi
            </p>
          </div>
        </>
      ) : (
        <div className="text-center">
          <p className="text-red-400 text-sm mb-2">Authentication failed</p>
          <p className="text-white/30 text-xs">{errorMsg}</p>
          <p className="text-white/40 text-xs mt-2">Redirecting to login...</p>
        </div>
      )}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="w-12 h-12 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </main>
    }>
      <CallbackInner />
    </Suspense>
  );
}
