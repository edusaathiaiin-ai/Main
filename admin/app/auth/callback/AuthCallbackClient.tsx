'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { supabaseBrowser } from '@/lib/supabase-browser';

const ADMIN_EMAILS = ['edusaathiai.in@gmail.com'];

function CallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your login…');
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  useEffect(() => {
    // Check URL hash FIRST — Supabase doesn't reliably fire PASSWORD_RECOVERY
    // in all versions; reading the hash directly is the only guaranteed way.
    const hash = new URLSearchParams(window.location.hash.replace('#', ''));
    const isRecoveryLink = hash.get('type') === 'recovery';

    if (isRecoveryLink) {
      // detectSessionInUrl sets the session from the hash automatically.
      // Just show the form — session will be ready by the time user submits.
      setIsRecovery(true);
      return;
    }

    // Regular login / magic-link flow
    const { data: { subscription } } = supabaseBrowser.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (event === 'SIGNED_IN' && session) {
          const email = session.user.email?.toLowerCase() ?? '';
          if (!ADMIN_EMAILS.includes(email)) {
            await supabaseBrowser.auth.signOut();
            router.push('/login?error=unauthorized');
          } else {
            router.push('/users');
          }
          subscription.unsubscribe();
        }
      }
    );

    const timeout = setTimeout(() => {
      subscription.unsubscribe();
      router.push('/login?error=no_session');
    }, 6000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router]);

  async function handleSetPassword() {
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    if (newPassword.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setPwLoading(true); setPwError('');
    const { error } = await supabaseBrowser.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) { setPwError(error.message); return; }
    setPwDone(true);
    setTimeout(() => router.push('/users'), 1500);
  }

  if (isRecovery) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', fontFamily: 'sans-serif', padding: '16px' }}>
        <div style={{ width: '100%', maxWidth: '360px', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>EdUsaathiAI</div>
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>Set new admin password</div>
          </div>
          {pwDone ? (
            <p style={{ color: '#4ade80', textAlign: 'center', fontSize: '14px' }}>Password updated! Redirecting…</p>
          ) : (
            <>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '10px', padding: '12px', color: '#f8fafc', fontSize: '14px', marginBottom: '12px', boxSizing: 'border-box' }}
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                placeholder="Confirm password"
                style={{ width: '100%', background: '#0f172a', border: '1px solid #475569', borderRadius: '10px', padding: '12px', color: '#f8fafc', fontSize: '14px', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <button
                onClick={handleSetPassword}
                disabled={pwLoading || !newPassword || !confirmPassword}
                style={{ width: '100%', background: '#f59e0b', color: '#0c0a09', fontWeight: 600, borderRadius: '10px', padding: '12px', fontSize: '14px', border: 'none', cursor: 'pointer', opacity: pwLoading ? 0.6 : 1 }}
              >
                {pwLoading ? 'Saving…' : 'Set password & sign in →'}
              </button>
              {pwError && <p style={{ color: '#f87171', fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>{pwError}</p>}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif',
    }}>
      <p>{status}</p>
    </div>
  );
}

export function AuthCallbackClient() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#f8fafc' }}>
        <p>Loading…</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
