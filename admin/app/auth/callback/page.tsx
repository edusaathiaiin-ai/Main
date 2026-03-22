'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verifying your login…');

  useEffect(() => {
    const code = searchParams.get('code');

    const handleCallback = async () => {
      if (!code) {
        router.push('/login?error=no_code');
        return;
      }

      // Exchange the PKCE code for a session (browser client has the verifier)
      const { error: exchangeError } = await supabaseBrowser.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error('Exchange error:', exchangeError.message);
        router.push('/login?error=exchange_failed');
        return;
      }

      // Check admin role
      const { data: { user } } = await supabaseBrowser.auth.getUser();
      if (!user) {
        router.push('/login?error=no_user');
        return;
      }

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'sans-serif',
      fontSize: '1rem',
    }}>
      <p>{status}</p>
    </div>
  );
}
