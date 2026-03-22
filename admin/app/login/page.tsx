'use client';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

// Allowed admin emails
const ADMIN_EMAILS = ['edusaathiai.in@gmail.com'];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const signIn = async () => {
    setLoading(true); setError('');
    const sb = getBrowserClient();

    const { data, error: err } = await sb.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (err) { setError(err.message); setLoading(false); return; }

    const userEmail = data.user?.email?.toLowerCase() ?? '';
    if (ADMIN_EMAILS.includes(userEmail)) {
      router.push('/users');
      return;
    }

    // Not an admin email — sign out and block
    await sb.auth.signOut();
    setError('Admin access only.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-amber-400 mb-1">EdUsaathiAI</div>
          <div className="text-sm text-slate-400">Admin Control Centre</div>
        </div>

        <label className="block text-sm text-slate-400 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && signIn()}
          placeholder="admin@edusaathiai.in"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-4"
        />

        <label className="block text-sm text-slate-400 mb-1">Password</label>
        <div className="relative mb-4">
          <input
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && signIn()}
            placeholder="••••••••"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
          <button
            type="button"
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            tabIndex={-1}
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>

        <button
          onClick={signIn}
          disabled={loading || !email || !password}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
