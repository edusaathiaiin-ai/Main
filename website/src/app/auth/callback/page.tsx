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

// ── Ensure profile row exists ─────────────────────────────────────────────────

type DbUserRole = 'student' | 'faculty' | 'public' | 'institution';

async function ensureProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  email: string,
  roleParam: DbUserRole | null,
): Promise<{ isActive: boolean }> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, is_active')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    // Profile row missing — create it now so onboard never hits a 500
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email,
        full_name: '',          // NOT NULL — onboard will fill this in
        role: roleParam ?? 'student',
        is_active: false,
        plan_id: 'free',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      // Row may already exist (race condition) — ignore duplicate key errors
      if (!insertError.code?.startsWith('23')) {
        throw new Error(`Profile creation failed: ${insertError.message}`);
      }
    }
    return { isActive: false };
  }

  return { isActive: profile.is_active ?? false };
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
            setTimeout(() => router.replace('/login?error=unauthorized'), 1500);
            return;
          }
          resolvedSession = retrySession;
        } else {
          resolvedSession = session;
        }

        // Single-device enforcement — fire-and-forget, must not block redirect
        void callSessionRegister(resolvedSession.access_token);

        // Read role and saathi — sessionStorage (set by login page before OAuth redirect)
        // or URL params as fallback (magic link preserves them in some flows)
        const roleParam = (
          sessionStorage.getItem('pending_role') ??
          searchParams.get('role')
        ) as DbUserRole | null;
        const saathiSlug = sessionStorage.getItem('pending_saathi') ?? searchParams.get('saathi');

        // Clear so they don't persist across future logins
        sessionStorage.removeItem('pending_role');
        sessionStorage.removeItem('pending_saathi');

        // ── Ensure profile row exists before any further DB calls ─────────────
        const { isActive } = await ensureProfile(
          supabase,
          resolvedSession.user.id,
          resolvedSession.user.email ?? '',
          roleParam,
        );

        // ── Saathi instant bonding ────────────────────────────────────────────
        if (saathiSlug) {
          try {
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

        if (!isActive) {
          // Build onboard URL preserving role + saathi params
          const onboardUrl = new URL('/onboard', window.location.origin);
          if (roleParam) onboardUrl.searchParams.set('role', roleParam);
          if (saathiSlug) onboardUrl.searchParams.set('saathi', saathiSlug);
          router.replace(onboardUrl.pathname + onboardUrl.search);
        } else {
          router.replace('/chat');
        }
      } catch (err) {
        setStatus('error');
        setErrorMsg(err instanceof Error ? err.message : 'Unknown error');
        setTimeout(() => router.replace('/login?error=unauthorized'), 1500);
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
