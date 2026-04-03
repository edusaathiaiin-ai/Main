'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';

type LiveSessionRow = {
  id: string;
  title: string;
  session_format: string;
  total_seats: number;
  seats_booked: number;
  price_per_seat_paise: number;
  status: string;
  created_at: string;
};

type TabId = 'active' | 'upcoming' | 'completed' | 'drafts';

export default function FacultyLiveDashboard() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('active');

  useEffect(() => {
    if (!profile) return;
    createClient()
      .from('live_sessions')
      .select('id, title, session_format, total_seats, seats_booked, price_per_seat_paise, status, created_at')
      .eq('faculty_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as LiveSessionRow[]);
        setLoading(false);
      });
  }, [profile]);

  const active = sessions.filter((s) => s.status === 'published');
  const completed = sessions.filter((s) => s.status === 'completed');
  const drafts = sessions.filter((s) => s.status === 'draft' || s.status === 'pending_review');
  const tabMap: Record<TabId, LiveSessionRow[]> = { active, upcoming: active, completed, drafts };

  const totalEarned = completed.reduce((a, s) => a + Math.round(s.seats_booked * s.price_per_seat_paise * 0.8), 0);
  const totalStudents = sessions.reduce((a, s) => a + s.seats_booked, 0);

  if (!profile) return null;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/faculty" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/faculty/live/create" className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: '#C9993A', color: '#060F1D', textDecoration: 'none' }}>
          + Create Session
        </Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-playfair text-3xl font-bold text-white mb-2">Live Sessions</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage your group lectures and workshops</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active sessions', value: active.length, color: '#4ADE80' },
            { label: 'Students reached', value: totalStudents, color: '#60A5FA' },
            { label: 'Total earned', value: `\u20B9${(totalEarned / 100).toLocaleString('en-IN')}`, color: '#C9993A' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          {(['active', 'completed', 'drafts'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all capitalize"
              style={{ background: tab === t ? '#C9993A' : 'transparent', color: tab === t ? '#060F1D' : 'rgba(255,255,255,0.45)' }}>
              {t} ({tabMap[t].length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
          </div>
        ) : tabMap[tab].length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.25)' }}>No {tab} sessions</p>
            <Link href="/faculty/live/create" className="text-xs font-semibold px-5 py-2.5 rounded-lg" style={{ background: '#C9993A', color: '#060F1D', textDecoration: 'none' }}>
              Create your first session &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tabMap[tab].map((s) => {
              const revenue = s.seats_booked * s.price_per_seat_paise;
              const payout = Math.round(revenue * 0.8);
              const pct = s.total_seats > 0 ? (s.seats_booked / s.total_seats) * 100 : 0;
              return (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{s.title}</h3>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{s.session_format} &middot; {new Date(s.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: s.status === 'published' ? 'rgba(74,222,128,0.12)' : s.status === 'draft' ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.06)', color: s.status === 'published' ? '#4ADE80' : s.status === 'draft' ? '#FACC15' : 'rgba(255,255,255,0.4)' }}>
                      {s.status}
                    </span>
                  </div>
                  {/* Seat bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{s.seats_booked}/{s.total_seats} seats</span>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>{Math.round(pct)}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: pct >= 80 ? '#F87171' : pct >= 50 ? '#FBBF24' : '#4ADE80' }} />
                    </div>
                  </div>
                  {s.status === 'published' && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {'\u20B9'}{(revenue / 100).toLocaleString('en-IN')} collected &middot; {'\u20B9'}{(payout / 100).toLocaleString('en-IN')} your payout
                      </p>
                      {s.seats_booked > 0 && (
                        <Link href={`/faculty/live/${s.id}/audience`}
                          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: 'rgba(201,153,58,0.12)', border: '0.5px solid rgba(201,153,58,0.25)', color: '#C9993A', textDecoration: 'none' }}
                          onClick={(e) => e.stopPropagation()}>
                          {'\u{1F465}'} View Audience ({s.seats_booked})
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
