'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';

type RequestRow = {
  id: string;
  student_id: string;
  subject: string;
  message: string;
  upvote_count: number;
  status: string;
  faculty_response: string | null;
  created_at: string;
  student_name?: string;
  student_institution?: string;
  student_city?: string;
};

type TabId = 'pending' | 'responded' | 'declined';

export default function FacultyRequestsPage() {
  const { profile } = useAuthStore();
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('pending');
  const [responding, setResponding] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();
    async function load() {
      const { data } = await supabase
        .from('lecture_requests')
        .select('id, student_id, subject, message, upvote_count, status, faculty_response, created_at')
        .eq('faculty_id', profile!.id)
        .order('upvote_count', { ascending: false });

      const rows = (data ?? []) as RequestRow[];
      if (rows.length > 0) {
        const sIds = [...new Set(rows.map((r) => r.student_id))];
        const { data: sData } = await supabase.from('profiles').select('id, full_name, institution_name, city').in('id', sIds);
        const map: Record<string, { name: string; institution: string | null; city: string | null }> = {};
        (sData ?? []).forEach((p: { id: string; full_name: string; institution_name: string | null; city: string | null }) => {
          map[p.id] = { name: p.full_name, institution: p.institution_name, city: p.city };
        });
        rows.forEach((r) => {
          const s = map[r.student_id];
          if (s) { r.student_name = s.name; r.student_institution = s.institution ?? undefined; r.student_city = s.city ?? undefined; }
        });
      }
      setRequests(rows);
      setLoading(false);
    }
    load();
  }, [profile]);

  const pending = requests.filter((r) => ['pending', 'acknowledged', 'accepted'].includes(r.status));
  const responded = requests.filter((r) => r.faculty_response && r.status !== 'declined');
  const declined = requests.filter((r) => r.status === 'declined');
  const tabMap: Record<TabId, RequestRow[]> = { pending, responded, declined };

  const topTopic = pending.length > 0 ? pending.sort((a, b) => b.upvote_count - a.upvote_count)[0] : null;

  async function respond(requestId: string) {
    const text = responseText[requestId]?.trim();
    if (!text) return;
    setSaving(requestId);
    const supabase = createClient();
    await supabase.from('lecture_requests').update({
      faculty_response: text,
      faculty_responded_at: new Date().toISOString(),
      status: 'acknowledged',
    }).eq('id', requestId);
    setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, faculty_response: text, status: 'acknowledged' } : r));
    setResponding(null);
    setSaving(null);
  }

  async function decline(requestId: string, reason: string) {
    setSaving(requestId);
    const supabase = createClient();
    await supabase.from('lecture_requests').update({
      status: 'declined',
      faculty_response: reason,
      faculty_responded_at: new Date().toISOString(),
    }).eq('id', requestId);
    setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: 'declined', faculty_response: reason } : r));
    setSaving(null);
  }

  if (!profile) return null;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/faculty" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/faculty" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>&larr; Dashboard</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="font-playfair text-3xl font-bold text-white mb-2">Lecture Requests</h1>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Students want to learn from you. Here&apos;s what they&apos;re asking for.</p>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <p className="text-2xl font-bold text-white">{requests.length}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Total requests</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
            <p className="text-2xl font-bold" style={{ color: '#FBBF24' }}>{pending.length}</p>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Pending</p>
          </div>
          <div className="rounded-xl p-4" style={{ background: 'rgba(201,153,58,0.06)', border: '0.5px solid rgba(201,153,58,0.2)' }}>
            <p className="text-xs font-semibold mb-1" style={{ color: '#C9993A' }}>Most requested</p>
            <p className="text-xs text-white truncate">{topTopic?.subject ?? 'None yet'}</p>
            {topTopic && <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{topTopic.upvote_count} students</p>}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          {([
            { id: 'pending' as const, label: 'Pending', count: pending.length },
            { id: 'responded' as const, label: 'Responded', count: responded.length },
            { id: 'declined' as const, label: 'Declined', count: declined.length },
          ]).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
              style={{ background: tab === t.id ? '#C9993A' : 'transparent', color: tab === t.id ? '#060F1D' : 'rgba(255,255,255,0.45)' }}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
          </div>
        ) : tabMap[tab].length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No {tab} requests</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tabMap[tab].map((r) => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-bold text-white">{r.subject}</h3>
                  <span className="text-xs shrink-0 ml-3" style={{ color: r.upvote_count >= 5 ? '#FB923C' : 'rgba(255,255,255,0.4)' }}>
                    {r.upvote_count >= 5 ? '\u{1F525} ' : '\u25B2 '}{r.upvote_count}
                  </span>
                </div>
                <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  {r.student_name ?? 'Student'}{r.student_institution ? ` \u00B7 ${r.student_institution}` : ''}{r.student_city ? ` \u00B7 ${r.student_city}` : ''}
                  {' \u00B7 '}{new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>&ldquo;{r.message}&rdquo;</p>

                {r.faculty_response && (
                  <div className="rounded-lg p-3 mb-3" style={{ background: 'rgba(74,222,128,0.06)', border: '0.5px solid rgba(74,222,128,0.15)' }}>
                    <p className="text-[9px] font-semibold mb-1" style={{ color: '#4ADE80' }}>Your response</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{r.faculty_response}</p>
                  </div>
                )}

                {r.status === 'pending' && (
                  <div className="flex flex-wrap gap-2">
                    {responding === r.id ? (
                      <div className="w-full space-y-2">
                        <textarea value={responseText[r.id] ?? ''} onChange={(e) => setResponseText((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          placeholder="Your response to this student..."
                          rows={3} className="w-full rounded-xl px-4 py-3 text-xs text-white outline-none resize-none"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }} />
                        <div className="flex gap-2">
                          <button onClick={() => respond(r.id)} disabled={saving === r.id || !responseText[r.id]?.trim()}
                            className="text-xs font-semibold px-4 py-2 rounded-lg disabled:opacity-40"
                            style={{ background: '#C9993A', color: '#060F1D' }}>
                            {saving === r.id ? 'Sending...' : 'Send Response'}
                          </button>
                          <button onClick={() => setResponding(null)} className="text-xs px-3 py-2" style={{ color: 'rgba(255,255,255,0.3)' }}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => setResponding(r.id)}
                          className="text-[10px] font-semibold px-3 py-2 rounded-lg"
                          style={{ background: 'rgba(201,153,58,0.12)', border: '0.5px solid rgba(201,153,58,0.25)', color: '#C9993A' }}>
                          Respond
                        </button>
                        <Link href={`/faculty/live/create?topic=${encodeURIComponent(r.subject)}`}
                          className="text-[10px] font-semibold px-3 py-2 rounded-lg"
                          style={{ background: 'rgba(74,222,128,0.1)', border: '0.5px solid rgba(74,222,128,0.25)', color: '#4ADE80', textDecoration: 'none' }}>
                          Create Session &rarr;
                        </Link>
                        <button onClick={() => decline(r.id, 'Scheduling constraints')} disabled={saving === r.id}
                          className="text-[10px] px-3 py-2 rounded-lg disabled:opacity-40"
                          style={{ color: 'rgba(255,255,255,0.3)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                          Decline
                        </button>
                      </>
                    )}
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
