'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function CallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your login…');

  useEffect(() => {
    const handleCallback = async () => {
      // Read code from URL (PKCE flow appends ?code=...)
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        // PKCE: exchange code for session (client-side — verifier is in browser cookies)
        const { error } = await supabaseBrowser.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Exchange error:', error.message);
          router.push('/login?error=exchange_failed');
          return;
        }
      } else {
        // Implicit: session already set via hash, just read it
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session) {
          router.push('/login?error=no_session');
          return;
        }
      }

      // Check admin role
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) { router.push('/login?error=no_user'); return; }

      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setStatus('Access granted! Redirecting…');
        router.push('/users');
      } else {
        await supabaseBrowser.auth.signOut();
        router.push('/login?error=unauthorized');
      }
    };

    handleCallback();
  }, []);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#0f172a', color: '#f8fafc', fontFamily: 'sans-serif',
    }}>
      <p>{status}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
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
