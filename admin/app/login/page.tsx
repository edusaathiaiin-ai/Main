'use client';
import { useState } from 'react';
import { getBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendOtp = async () => {
    setLoading(true); setError('');
    const sb = getBrowserClient();
    const { error: err } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    if (err) { setError(err.message); setLoading(false); return; }
    setStep('otp');
    setLoading(false);
  };

  const verifyOtp = async () => {
    setLoading(true); setError('');
    const sb = getBrowserClient();
    const { error: err } = await sb.auth.verifyOtp({ email, token: otp, type: 'email' });
    if (err) { setError(err.message); setLoading(false); return; }
    router.push('/users');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <div className="mb-8 text-center">
          <div className="text-2xl font-bold text-amber-400 mb-1">EdUsaathiAI</div>
          <div className="text-sm text-slate-400">Admin Control Centre</div>
        </div>

        {step === 'email' ? (
          <>
            <label className="block text-sm text-slate-400 mb-1">Admin email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendOtp()}
              placeholder="admin@edusaathiai.in"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-4"
            />
            <button
              onClick={sendOtp}
              disabled={loading || !email}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-400 mb-4">Code sent to <span className="text-white">{email}</span></p>
            <input
              type="text"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyOtp()}
              placeholder="6-digit code"
              maxLength={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 mb-4 tracking-widest text-center text-xl"
            />
            <button
              onClick={verifyOtp}
              disabled={loading || otp.length < 6}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {loading ? 'Verifying…' : 'Sign in'}
            </button>
            <button onClick={() => { setStep('email'); setOtp(''); }} className="w-full mt-2 text-slate-500 text-sm hover:text-slate-300">
              ← Back
            </button>
          </>
        )}

        {error && <p className="mt-3 text-red-400 text-sm text-center">{error}</p>}
      </div>
    </div>
  );
}
