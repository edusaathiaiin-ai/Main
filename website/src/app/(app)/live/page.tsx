'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import Link from 'next/link';

type LiveSession = {
  id: string;
  faculty_id: string;
  vertical_id: string;
  title: string;
  description: string;
  session_format: string;
  price_per_seat_paise: number;
  bundle_price_paise: number | null;
  early_bird_price_paise: number | null;
  early_bird_seats: number | null;
  total_seats: number;
  seats_booked: number;
  tags: string[];
  status: string;
  created_at: string;
  faculty_name?: string;
  faculty_verified?: boolean;
  faculty_emeritus?: boolean;
};

type LectureRow = { session_id: string; scheduled_at: string; title: string };

const FORMAT_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  single: { label: 'Lecture', emoji: '\u{1F4C5}', color: '#60A5FA' },
  series: { label: 'Series', emoji: '\u{1F4DA}', color: '#C084FC' },
  workshop: { label: 'Workshop', emoji: '\u{1F528}', color: '#FB923C' },
  recurring: { label: 'Recurring', emoji: '\u{1F504}', color: '#34D399' },
  qa: { label: 'Q&A', emoji: '\u{1F4AC}', color: '#F472B6' },
};

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

function seatUrgency(booked: number, total: number): { color: string; label: string } {
  const pct = (booked / total) * 100;
  if (pct >= 80) return { color: '#F87171', label: 'Almost full!' };
  if (pct >= 50) return { color: '#FBBF24', label: `${total - booked} seats left` };
  return { color: '#4ADE80', label: `${total - booked} seats available` };
}

export default function LivePage() {
  const { profile } = useAuthStore();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [lectures, setLectures] = useState<LectureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSaathi, setFilterSaathi] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: sessData } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      const rows = (sessData ?? []) as LiveSession[];

      // Fetch faculty names
      const facultyIds = [...new Set(rows.map((s) => s.faculty_id))];
      if (facultyIds.length > 0) {
        const { data: fData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', facultyIds);
        const { data: fpData } = await supabase
          .from('faculty_profiles')
          .select('user_id, verification_status, is_emeritus')
          .in('user_id', facultyIds);

        const nameMap: Record<string, string> = {};
        const verMap: Record<string, boolean> = {};
        const emeritusMap: Record<string, boolean> = {};
        (fData ?? []).forEach((f: { id: string; full_name: string }) => { nameMap[f.id] = f.full_name; });
        (fpData ?? []).forEach((f: { user_id: string; verification_status: string; is_emeritus: boolean }) => { verMap[f.user_id] = f.verification_status === 'verified'; emeritusMap[f.user_id] = f.is_emeritus === true; });

        rows.forEach((s) => { s.faculty_name = nameMap[s.faculty_id]; s.faculty_verified = verMap[s.faculty_id]; s.faculty_emeritus = emeritusMap[s.faculty_id]; });
      }

      setSessions(rows);

      // Fetch next lectures for scheduling info
      const sessionIds = rows.map((s) => s.id);
      if (sessionIds.length > 0) {
        const { data: lecData } = await supabase
          .from('live_lectures')
          .select('session_id, scheduled_at, title')
          .in('session_id', sessionIds)
          .eq('status', 'scheduled')
          .order('scheduled_at')
          .limit(100);
        setLectures((lecData ?? []) as LectureRow[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (filterSaathi !== 'all' && s.vertical_id !== filterSaathi) return false;
      if (filterFormat !== 'all' && s.session_format !== filterFormat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!s.title.toLowerCase().includes(q) && !(s.faculty_name ?? '').toLowerCase().includes(q) && !s.tags?.some((t) => t.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [sessions, filterSaathi, filterFormat, search]);

  // Soul-matched: sessions matching student's Saathi
  const forYou = useMemo(() => {
    if (!profile?.primary_saathi_id) return [];
    return filtered.filter((s) => s.vertical_id === profile.primary_saathi_id).slice(0, 4);
  }, [filtered, profile]);

  const nextLecture = (sessionId: string): LectureRow | undefined => lectures.find((l) => l.session_id === sessionId);

  const selectStyle: React.CSSProperties = {
    padding: '8px 14px', background: 'rgba(255,255,255,0.06)',
    border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#fff', fontSize: '12px', outline: 'none', cursor: 'pointer',
  };

  return (
    <main className="min-h-screen" style={{ background: '#060F1D' }}>
      {/* Hero */}
      <div style={{ background: 'linear-gradient(180deg, #0B1F3A 0%, #060F1D 100%)', padding: '40px 24px 32px', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <p className="text-[11px] font-bold tracking-[2px] uppercase" style={{ color: '#F87171' }}>EdUsaathiAI Live</p>
              </div>
              <h1 className="font-playfair font-black text-white mb-2" style={{ fontSize: 'clamp(28px, 4vw, 48px)', lineHeight: 1.15 }}>
                Learn live from<br /><span style={{ color: '#C9993A' }}>India&apos;s best faculty.</span>
              </h1>
              <p className="text-sm max-w-[500px]" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                Group lectures, workshops, and Q&amp;A sessions. Book your seat. Show up. Learn deeply.
              </p>
            </div>
            <div className="flex gap-6">
              {[
                { num: sessions.length, label: 'Sessions' },
                { num: sessions.reduce((a, s) => a + s.seats_booked, 0), label: 'Seats Booked' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="font-playfair text-[28px] font-bold" style={{ color: '#C9993A' }}>{s.num}</p>
                  <p className="text-[10px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-[500px]">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg opacity-40">{'\u{1F50D}'}</span>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions, topics, faculty..."
              className="w-full py-3 pl-12 pr-4 rounded-[14px] text-sm text-white outline-none"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)' }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-2.5 items-center mb-6">
          <select value={filterSaathi} onChange={(e) => setFilterSaathi(e.target.value)} style={selectStyle}>
            <option value="all" style={{ background: '#0B1F3A' }}>All Subjects</option>
            {SAATHIS.map((s) => <option key={s.id} value={s.id} style={{ background: '#0B1F3A' }}>{s.emoji} {s.name}</option>)}
          </select>
          <select value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} style={selectStyle}>
            <option value="all" style={{ background: '#0B1F3A' }}>All Formats</option>
            {Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k} style={{ background: '#0B1F3A' }}>{v.emoji} {v.label}</option>)}
          </select>
          <div className="flex-1" />
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{filtered.length} sessions</p>
        </div>

        {/* For You section */}
        {forYou.length > 0 && (
          <section className="mb-10">
            <h2 className="font-playfair text-xl font-bold text-white mb-4">For You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {forYou.map((s, i) => <SessionCard key={s.id} session={s} index={i} nextLecture={nextLecture(s.id)} />)}
            </div>
          </section>
        )}

        {/* All sessions */}
        <section>
          <h2 className="font-playfair text-xl font-bold text-white mb-4">All Upcoming</h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-[240px] rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">{'\u{1F3AC}'}</p>
              <p className="font-playfair text-xl text-white/30 mb-1">No live sessions yet</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Check back soon — faculty announce new sessions every week.</p>
            </div>
          ) : (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((s, i) => <SessionCard key={s.id} session={s} index={i} nextLecture={nextLecture(s.id)} />)}
              </AnimatePresence>
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}

function SessionCard({ session: s, index, nextLecture }: { session: LiveSession; index: number; nextLecture?: LectureRow }) {
  const saathi = SAATHIS.find((sa) => sa.id === s.vertical_id);
  const color = saathi?.primary ?? '#C9993A';
  const format = FORMAT_LABELS[s.session_format] ?? FORMAT_LABELS.single;
  const urgency = seatUrgency(s.seats_booked, s.total_seats);
  const isFull = s.seats_booked >= s.total_seats;
  const isEmeritus = s.faculty_emeritus === true;
  const borderDefault = isEmeritus ? 'rgba(201,153,58,0.3)' : 'rgba(255,255,255,0.08)';
  const borderHover = isEmeritus ? 'rgba(201,153,58,0.5)' : `${color}40`;

  return (
    <motion.div layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }} transition={{ delay: index * 0.04 }} whileHover={{ y: -3 }}
      className="rounded-[18px] overflow-hidden flex flex-col"
      style={{ background: isEmeritus ? 'rgba(201,153,58,0.03)' : 'rgba(255,255,255,0.03)', border: `${isEmeritus ? '1px' : '0.5px'} solid ${borderDefault}`, transition: 'border-color 0.2s' }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = borderHover)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = borderDefault)}
    >
      <div style={{ height: isEmeritus ? '5px' : '4px', background: isEmeritus ? 'linear-gradient(90deg, #C9993A, #E5B86A)' : `linear-gradient(90deg, ${format.color}, ${format.color}60)` }} />

      <div className="p-5 flex-1">
        {/* Format + Saathi */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ background: `${format.color}18`, color: format.color }}>{format.emoji} {format.label}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: `${color}12`, color }}>{saathi?.emoji} {saathi?.name}</span>
        </div>

        <h3 className="text-[15px] font-bold text-white mb-1 line-clamp-2 leading-tight">{s.title}</h3>

        {/* Faculty */}
        <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {s.faculty_name ?? 'Faculty'}
          {isEmeritus && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}>{'\u2726'} Emeritus</span>}
          {s.faculty_verified && !isEmeritus && <span className="ml-1 text-[9px]" style={{ color: '#4ADE80' }}>{'\u2713'}</span>}
        </p>

        {/* Next lecture date */}
        {nextLecture && (
          <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {'\u{1F4C5}'} {new Date(nextLecture.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </p>
        )}

        {/* Tags */}
        {s.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {s.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{t}</span>
            ))}
          </div>
        )}

        {/* Seat counter */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-semibold" style={{ color: urgency.color }}>{isFull ? '\u{1F525} Fully booked' : urgency.label}</span>
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.seats_booked}/{s.total_seats}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (s.seats_booked / s.total_seats) * 100)}%`, background: urgency.color }} />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.15)' }}>
        <div>
          <p className="text-lg font-bold text-white">{formatFee(s.bundle_price_paise ?? s.price_per_seat_paise)}</p>
          {s.bundle_price_paise && s.bundle_price_paise < s.price_per_seat_paise * 3 && (
            <p className="text-[9px]" style={{ color: '#4ADE80' }}>Bundle saves {'\u20B9'}{((s.price_per_seat_paise * 3 - s.bundle_price_paise) / 100).toLocaleString('en-IN')}</p>
          )}
        </div>
        <Link href={`/live/${s.id}`} onClick={(e) => e.stopPropagation()}
          className="px-5 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: isFull ? 'rgba(255,255,255,0.1)' : color, color: isFull ? 'rgba(255,255,255,0.5)' : '#0B1F3A', textDecoration: 'none' }}>
          {isFull ? '\u{1F514} Notify me' : 'Book Seat \u2192'}
        </Link>
      </div>
    </motion.div>
  );
}
