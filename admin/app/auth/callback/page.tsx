'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function CallbackHandler() {
  const router = useRouter();
  const [status, setStatus] = useState('Verifying your login…');

  useEffect(() => {
    const handleCallback = async () => {
      // With implicit flow, Supabase auto-reads tokens from the URL hash.
      // Just call getSession() — the client handles the rest.
      const { data: { session }, error } = await supabaseBrowser.auth.getSession();

      if (error || !session) {
        console.error('Session error:', error?.message);
        router.push('/login?error=no_session');
        return;
      }

      // Check admin role
      const { data: profile } = await supabaseBrowser
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'sans-serif',
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
