'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';

type SessionRow = {
  id: string;
  student_id: string;
  session_type: string;
  topic: string;
  student_message: string | null;
  proposed_slots: string[];
  confirmed_slot: string | null;
  status: string;
  fee_paise: number;
  faculty_payout_paise: number;
  payout_status: string;
  meeting_link: string | null;
  created_at: string;
  student_name?: string;
};

type TabId = 'pending' | 'upcoming' | 'completed' | 'history';

export default function FacultySessionsPage() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('pending');
  const [meetingLinks, setMeetingLinks] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    supabase.from('faculty_sessions')
      .select('*')
      .eq('faculty_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as SessionRow[]);
        setLoading(false);
      });
  }, [profile]);

  const pending = sessions.filter((s) => s.status === 'requested');
  const upcoming = sessions.filter((s) => ['accepted', 'paid', 'confirmed'].includes(s.status));
  const completed = sessions.filter((s) => s.status === 'completed');
  const history = sessions.filter((s) => ['reviewed', 'declined', 'cancelled'].includes(s.status));

  const tabSessions: Record<TabId, SessionRow[]> = { pending, upcoming, completed, history };

  async function handleAction(sessionId: string, action: 'accept' | 'decline', slot?: string) {
    setActionLoading(sessionId);
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token ?? '';

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-request`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, sessionId, slot: slot ?? null }),
      }
    );

    if (res.ok) {
      setSessions((prev) => prev.map((s) =>
        s.id === sessionId ? { ...s, status: action === 'accept' ? 'accepted' : 'declined', confirmed_slot: slot ?? null } : s
      ));
    }
    setActionLoading(null);
  }

  async function saveMeetingLink(sessionId: string) {
    const link = meetingLinks[sessionId];
    if (!link?.trim()) return;
    const supabase = createClient();
    await supabase.from('faculty_sessions').update({ meeting_link: link.trim() }).eq('id', sessionId);
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, meeting_link: link.trim() } : s));
  }

  async function markCompleted(sessionId: string) {
    setActionLoading(sessionId);
    const supabase = createClient();
    await supabase.from('faculty_sessions').update({
      status: 'completed',
      faculty_confirmed_at: new Date().toISOString(),
    }).eq('id', sessionId);
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'completed' } : s));
    setActionLoading(null);
  }

  if (!profile) return null;

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Completed', count: completed.length },
    { id: 'history', label: 'History', count: history.length },
  ];

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/faculty" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/faculty" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>&larr; Dashboard</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-playfair text-3xl font-bold text-white mb-2">My Sessions</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Manage your 1:1 student sessions</p>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: tab === t.id ? '#C9993A' : 'transparent', color: tab === t.id ? '#060F1D' : 'rgba(255,255,255,0.45)' }}>
              {t.label} {t.count > 0 && <span className="ml-1 opacity-70">({t.count})</span>}
            </button>
          ))}
        </div>

        {/* Sessions */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
          </div>
        ) : tabSessions[tab].length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No {tab} sessions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tabSessions[tab].map((s) => (
              <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full mr-2"
                      style={{ background: s.session_type === 'doubt' ? 'rgba(99,102,241,0.12)' : s.session_type === 'research' ? 'rgba(74,222,128,0.12)' : 'rgba(251,146,60,0.12)', color: s.session_type === 'doubt' ? '#818CF8' : s.session_type === 'research' ? '#4ADE80' : '#FB923C' }}>
                      {s.session_type}
                    </span>
                    <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{new Date(s.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{'\u20B9'}{(s.faculty_payout_paise / 100).toLocaleString('en-IN')}</span>
                </div>

                <p className="text-sm text-white mb-1">{s.topic}</p>
                {s.student_message && <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.student_message}</p>}

                {/* Pending: accept/decline */}
                {s.status === 'requested' && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[10px] font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>Proposed slots:</p>
                    <div className="flex flex-wrap gap-2">
                      {(s.proposed_slots ?? []).map((slot, i) => (
                        <button key={i} onClick={() => handleAction(s.id, 'accept', slot)}
                          disabled={actionLoading === s.id}
                          className="text-xs px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                          style={{ background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ADE80' }}>
                          Accept: {new Date(slot).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => handleAction(s.id, 'decline')} disabled={actionLoading === s.id}
                      className="text-xs px-3 py-2 rounded-lg transition-all disabled:opacity-50"
                      style={{ color: '#F87171', border: '1px solid rgba(244,63,94,0.2)' }}>
                      Decline
                    </button>
                  </div>
                )}

                {/* Upcoming: meeting link + mark complete */}
                {['accepted', 'paid', 'confirmed'].includes(s.status) && (
                  <div className="mt-3 space-y-2">
                    {s.confirmed_slot && (
                      <p className="text-xs" style={{ color: '#4ADE80' }}>
                        Confirmed: {new Date(s.confirmed_slot).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input type="text" placeholder="Paste Zoom/Meet link"
                        value={meetingLinks[s.id] ?? s.meeting_link ?? ''}
                        onChange={(e) => setMeetingLinks((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        className="flex-1 rounded-lg px-3 py-2 text-xs text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                      />
                      <button onClick={() => saveMeetingLink(s.id)} className="text-xs px-3 py-2 rounded-lg font-semibold"
                        style={{ background: 'rgba(201,153,58,0.15)', color: '#C9993A' }}>Save</button>
                    </div>
                    <button onClick={() => markCompleted(s.id)} disabled={actionLoading === s.id}
                      className="text-xs px-4 py-2 rounded-lg font-semibold transition-all disabled:opacity-50"
                      style={{ background: '#C9993A', color: '#060F1D' }}>
                      Mark Session Complete
                    </button>
                  </div>
                )}

                {/* Completed: payout status */}
                {s.status === 'completed' && (
                  <div className="mt-3">
                    <p className="text-xs" style={{ color: s.payout_status === 'released' ? '#4ADE80' : '#FACC15' }}>
                      {s.payout_status === 'released' ? `Payment released: \u20B9${(s.faculty_payout_paise / 100).toLocaleString('en-IN')}` : 'Awaiting student confirmation (auto-release in 48h)'}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
