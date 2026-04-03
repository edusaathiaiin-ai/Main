'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';

type SessionRow = {
  id: string;
  faculty_id: string;
  session_type: string;
  topic: string;
  confirmed_slot: string | null;
  status: string;
  fee_paise: number;
  meeting_link: string | null;
  student_confirmed_at: string | null;
  created_at: string;
};

type FacultyInfo = { full_name: string; city: string | null };

export default function MySessionsPage() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [facultyMap, setFacultyMap] = useState<Record<string, FacultyInfo>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'pending' | 'past'>('upcoming');
  const [confirming, setConfirming] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();

    async function load() {
      const { data } = await supabase
        .from('faculty_sessions')
        .select('*')
        .eq('student_id', profile!.id)
        .order('created_at', { ascending: false });
      const rows = (data ?? []) as SessionRow[];
      setSessions(rows);

      // Fetch faculty names
      const ids = [...new Set(rows.map((s) => s.faculty_id))];
      if (ids.length > 0) {
        const { data: fData } = await supabase
          .from('profiles')
          .select('id, full_name, city')
          .in('id', ids);
        const map: Record<string, FacultyInfo> = {};
        (fData ?? []).forEach((f: { id: string; full_name: string; city: string | null }) => { map[f.id] = { full_name: f.full_name, city: f.city }; });
        setFacultyMap(map);
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  const upcoming = sessions.filter((s) => ['accepted', 'paid', 'confirmed'].includes(s.status));
  const pending = sessions.filter((s) => s.status === 'requested');
  const past = sessions.filter((s) => ['completed', 'reviewed', 'declined', 'cancelled', 'disputed'].includes(s.status));

  async function payForSession(session: SessionRow) {
    setPaying(session.id);
    const supabase = createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();

    try {
      // Create Razorpay order for this session
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession?.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({ sessionId: session.id }),
        }
      );
      const order = await res.json() as { orderId?: string; amount?: number; currency?: string; keyId?: string; error?: string };
      if (!order.orderId || !order.keyId) throw new Error(order.error ?? 'Order creation failed');

      // Load Razorpay checkout script dynamically
      await new Promise<void>((resolve, reject) => {
        if ((window as unknown as Record<string, unknown>).Razorpay) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Razorpay script failed to load'));
        document.body.appendChild(script);
      });

      const fac = facultyMap[session.faculty_id];

      // Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay({
          key:         order.keyId,
          order_id:    order.orderId,
          amount:      order.amount,
          currency:    order.currency ?? 'INR',
          name:        'EdUsaathiAI',
          description: session.topic,
          prefill:     { name: profile?.full_name ?? '' },
          theme:       { color: '#C9993A' },
          handler: () => {
            // Webhook will update the DB; optimistically reflect in UI
            setSessions((prev) => prev.map((s) =>
              s.id === session.id ? { ...s, status: 'paid' } : s
            ));
            resolve();
          },
          modal: {
            ondismiss: () => reject(new Error('cancelled')),
          },
        });
        rzp.open();
      });
    } catch (err) {
      if (err instanceof Error && err.message !== 'cancelled') {
        console.error('payForSession error', err.message);
      }
    } finally {
      setPaying(null);
    }
  }

  async function confirmSession(sessionId: string) {
    setConfirming(sessionId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ action: 'confirm', sessionId }),
      }
    );
    setSessions((prev) => prev.map((s) =>
      s.id === sessionId ? { ...s, status: 'completed', student_confirmed_at: new Date().toISOString() } : s
    ));
    setConfirming(null);
  }

  if (!profile) return null;

  const tabSessions = tab === 'upcoming' ? upcoming : tab === 'pending' ? pending : past;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/chat" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/chat" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>&larr; Back to Chat</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-playfair text-3xl font-bold text-white mb-2">My Sessions</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Your 1:1 faculty sessions</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          {[
            { id: 'upcoming' as const, label: 'Upcoming', count: upcoming.length },
            { id: 'pending' as const, label: 'Pending', count: pending.length },
            { id: 'past' as const, label: 'Past', count: past.length },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: tab === t.id ? '#C9993A' : 'transparent', color: tab === t.id ? '#060F1D' : 'rgba(255,255,255,0.45)' }}>
              {t.label} {t.count > 0 && `(${t.count})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
          </div>
        ) : tabSessions.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>No {tab} sessions</p>
            <Link href="/faculty-finder" className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: '#C9993A', color: '#060F1D', textDecoration: 'none' }}>
              Find Faculty &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tabSessions.map((s) => {
              const fac = facultyMap[s.faculty_id];
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{fac?.full_name ?? 'Faculty'}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{fac?.city}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: s.status === 'requested' ? 'rgba(234,179,8,0.12)' : s.status === 'declined' ? 'rgba(239,68,68,0.12)' : 'rgba(74,222,128,0.12)',
                        color: s.status === 'requested' ? '#FACC15' : s.status === 'declined' ? '#F87171' : '#4ADE80',
                      }}>
                      {s.status}
                    </span>
                  </div>

                  <p className="text-xs text-white/60 mb-2">{s.topic}</p>

                  {s.confirmed_slot && (
                    <p className="text-xs mb-2" style={{ color: '#4ADE80' }}>
                      {new Date(s.confirmed_slot).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  )}

                  {/* Pay to confirm slot — shown when faculty has accepted but student hasn't paid */}
                  {s.status === 'accepted' && (
                    <div className="mt-3 rounded-xl p-4" style={{ background: 'rgba(201,153,58,0.08)', border: '0.5px solid rgba(201,153,58,0.25)' }}>
                      <p className="text-xs mb-3" style={{ color: '#E5B86A', lineHeight: 1.6 }}>
                        ✓ {facultyMap[s.faculty_id]?.full_name ?? 'Faculty'} accepted your request.
                        Pay now to confirm your slot.
                      </p>
                      <button
                        onClick={() => payForSession(s)}
                        disabled={paying === s.id}
                        className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                        style={{ background: '#C9993A', color: '#060F1D' }}
                      >
                        {paying === s.id ? 'Opening payment…' : `Pay ₹${(s.fee_paise / 100).toLocaleString('en-IN')} to confirm slot →`}
                      </button>
                    </div>
                  )}

                  {s.meeting_link && ['paid', 'confirmed'].includes(s.status) && (
                    <a href={s.meeting_link} target="_blank" rel="noopener noreferrer"
                      className="inline-block text-xs px-3 py-1.5 rounded-lg mb-2 font-semibold"
                      style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8', textDecoration: 'none' }}>
                      Join Meeting &rarr;
                    </a>
                  )}

                  {/* Confirm session happened — calls edge function, sets payout_status=pending for admin review */}
                  {s.status === 'completed' && !s.student_confirmed_at && (
                    <button onClick={() => confirmSession(s.id)} disabled={confirming === s.id}
                      className="text-xs px-4 py-2 rounded-lg font-semibold mt-2 transition-all disabled:opacity-50"
                      style={{ background: '#C9993A', color: '#060F1D' }}>
                      {confirming === s.id ? 'Confirming...' : 'Confirm Session Happened'}
                    </button>
                  )}

                  <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</span>
                    <span className="text-sm font-bold text-white">{'\u20B9'}{(s.fee_paise / 100).toLocaleString('en-IN')}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
