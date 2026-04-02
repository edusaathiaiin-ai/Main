'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import Link from 'next/link';

type SessionDetail = {
  id: string;
  faculty_id: string;
  vertical_id: string;
  title: string;
  description: string;
  preparation_notes: string | null;
  tags: string[];
  session_format: string;
  price_per_seat_paise: number;
  bundle_price_paise: number | null;
  early_bird_price_paise: number | null;
  early_bird_seats: number | null;
  total_seats: number;
  seats_booked: number;
  min_seats: number;
  status: string;
  meeting_platform: string | null;
};

type LectureRow = { id: string; lecture_number: number; title: string; scheduled_at: string; duration_minutes: number; status: string };
type FacultyInfo = { full_name: string; institution_name: string; designation: string | null; verification_status: string; session_bio: string | null };

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

export default function LiveSessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;
  const { profile } = useAuthStore();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [lectures, setLectures] = useState<LectureRow[]>([]);
  const [faculty, setFaculty] = useState<FacultyInfo | null>(null);
  const [seatsBooked, setSeatsBooked] = useState(0);
  const [seatsUpdated, setSeatsUpdated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(new Set());
  const [bookingMode, setBookingMode] = useState<'full' | 'single'>('full');

  useEffect(() => {
    const supabase = createClient();
    async function load() {
      const { data: sess } = await supabase.from('live_sessions').select('*').eq('id', sessionId).single();
      if (!sess) { setLoading(false); return; }
      setSession(sess as unknown as SessionDetail);
      setSeatsBooked(sess.seats_booked);

      const { data: lecs } = await supabase
        .from('live_lectures')
        .select('id, lecture_number, title, scheduled_at, duration_minutes, status')
        .eq('session_id', sessionId)
        .order('lecture_number');
      setLectures((lecs ?? []) as LectureRow[]);

      // Faculty info
      const { data: fData } = await supabase.from('profiles').select('full_name').eq('id', sess.faculty_id).single();
      const { data: fpData } = await supabase.from('faculty_profiles').select('institution_name, designation, verification_status, session_bio').eq('user_id', sess.faculty_id).single();
      setFaculty({ full_name: fData?.full_name ?? 'Faculty', ...(fpData as { institution_name: string; designation: string | null; verification_status: string; session_bio: string | null } | null ?? { institution_name: '', designation: null, verification_status: 'pending', session_bio: null }) });

      // Check if already booked
      if (profile) {
        const { data: existing } = await supabase.from('live_bookings').select('id').eq('session_id', sessionId).eq('student_id', profile.id).maybeSingle();
        if (existing) setBooked(true);
      }
      setLoading(false);
    }
    load();

    // Realtime seat counter
    const channel = supabase
      .channel(`live-session-${sessionId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          const newSeats = (payload.new as { seats_booked: number }).seats_booked;
          setSeatsBooked(newSeats);
          setSeatsUpdated(true);
          setTimeout(() => setSeatsUpdated(false), 1000);
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [sessionId, profile]);

  async function handleBook() {
    if (!profile || !session) return;
    setBooking(true);

    let amount: number;
    if (bookingMode === 'full' && session.bundle_price_paise) {
      amount = session.bundle_price_paise;
    } else if (bookingMode === 'single' && selectedLectures.size > 0) {
      amount = session.price_per_seat_paise * selectedLectures.size;
    } else {
      amount = session.price_per_seat_paise;
    }

    // Check early bird
    const earlyBirdAvailable = session.early_bird_seats && session.early_bird_price_paise && seatsBooked < session.early_bird_seats;
    if (earlyBirdAvailable && session.early_bird_price_paise) {
      amount = session.early_bird_price_paise;
    }

    const supabase = createClient();
    const { error } = await supabase.from('live_bookings').insert({
      session_id: session.id,
      student_id: profile.id,
      booking_type: bookingMode,
      lecture_ids: bookingMode === 'single' ? [...selectedLectures] : null,
      amount_paid_paise: amount,
      price_type: earlyBirdAvailable ? 'early_bird' : bookingMode === 'full' && session.bundle_price_paise ? 'bundle' : 'standard',
      payment_status: 'paid', // simplified — would use Razorpay in production
      paid_at: new Date().toISOString(),
    });

    if (!error) {
      // Increment seats
      await supabase.from('live_sessions').update({ seats_booked: seatsBooked + 1 }).eq('id', session.id);
      setBooked(true);
      setSeatsBooked((p) => p + 1);

      // Notify faculty via Edge Function (fire-and-forget)
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.access_token) {
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            action: 'notify-live-booking',
            sessionId: session.id,
            facultyId: session.faculty_id,
          }),
        }).catch(() => {});
      }
    }
    setBooking(false);
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
      <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
    </main>;
  }

  if (!session) {
    return <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
      <div className="text-center">
        <p className="text-5xl mb-4">{'\u{1F4FA}'}</p>
        <h2 className="font-playfair text-2xl text-white mb-2">Session not found</h2>
        <Link href="/live" style={{ color: '#C9993A' }}>&larr; Back to Live</Link>
      </div>
    </main>;
  }

  const saathi = SAATHIS.find((s) => s.id === session.vertical_id);
  const color = saathi?.primary ?? '#C9993A';
  const isFull = seatsBooked >= session.total_seats;
  const remaining = session.total_seats - seatsBooked;
  const pct = (seatsBooked / session.total_seats) * 100;
  const urgencyColor = pct >= 80 ? '#F87171' : pct >= 50 ? '#FBBF24' : '#4ADE80';

  const earlyBirdActive = session.early_bird_seats && session.early_bird_price_paise && seatsBooked < session.early_bird_seats;
  const earlyBirdRemaining = earlyBirdActive ? session.early_bird_seats! - seatsBooked : 0;

  return (
    <main className="min-h-screen" style={{ background: '#060F1D' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/live" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/live" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>&larr; All Sessions</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-[1fr_360px] gap-8">
          {/* LEFT: Details */}
          <div>
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
              {/* Format badge */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#F87171' }}>Live</span>
                <span className="text-[10px] px-2 py-0.5 rounded-lg" style={{ background: `${color}12`, color }}>{saathi?.emoji} {saathi?.name}</span>
              </div>

              <h1 className="font-playfair text-3xl font-bold text-white mb-3">{session.title}</h1>

              {/* Faculty */}
              {faculty && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: `${color}20`, border: `2px solid ${color}40` }}>
                    {saathi?.emoji ?? '\u{1F393}'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{faculty.full_name}
                      {faculty.verification_status === 'verified' && <span className="ml-1 text-[9px]" style={{ color: '#4ADE80' }}>{'\u2713'} Verified</span>}
                    </p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{faculty.designation} &middot; {faculty.institution_name}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-semibold text-white mb-2">About this session</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap' }}>{session.description}</p>
              </div>

              {/* Lecture schedule */}
              {lectures.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-white mb-3">Schedule</h3>
                  <div className="space-y-2">
                    {lectures.map((l) => (
                      <div key={l.id} className="flex items-center gap-4 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: `${color}20`, color }}>
                          {l.lecture_number}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{l.title}</p>
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {new Date(l.scheduled_at).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            {' \u00B7 '}{l.duration_minutes} min
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: l.status === 'completed' ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)', color: l.status === 'completed' ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}>
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preparation notes */}
              {session.preparation_notes && (
                <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(201,153,58,0.05)', border: '0.5px solid rgba(201,153,58,0.2)' }}>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: '#C9993A' }}>Before you attend</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{session.preparation_notes}</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT: Booking widget */}
          <div className="md:sticky md:top-4 self-start">
            {booked ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-6 text-center" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <p className="text-4xl mb-3">{'\u{1F389}'}</p>
                <h3 className="font-playfair text-xl font-bold text-white mb-2">Seat booked!</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>Meeting link will be shared 24h before the session.</p>
                <Link href="/my-sessions" className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: '#C9993A', color: '#060F1D', textDecoration: 'none' }}>View My Sessions &rarr;</Link>
              </motion.div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
                <div className="p-5">
                  {/* Seat counter */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold" style={{ color: urgencyColor }}>
                        {isFull ? '\u{1F525} Fully booked' : pct >= 80 ? `\u{1F525} Only ${remaining} seats left!` : `${remaining} seats available`}
                      </span>
                      <motion.span className="text-xs font-bold"
                        animate={seatsUpdated ? { scale: [1, 1.3, 1], color: ['#fff', '#C9993A', '#fff'] } : {}}
                        style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {seatsBooked}/{session.total_seats}
                      </motion.span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <motion.div className="h-full rounded-full" animate={{ width: `${Math.min(100, pct)}%` }} style={{ background: urgencyColor }} transition={{ duration: 0.5 }} />
                    </div>
                  </div>

                  {/* Early bird */}
                  {earlyBirdActive && (
                    <div className="rounded-lg p-3 mb-4" style={{ background: 'rgba(251,146,60,0.08)', border: '0.5px solid rgba(251,146,60,0.25)' }}>
                      <p className="text-xs font-bold" style={{ color: '#FB923C' }}>{'\u26A1'} Early bird: {formatFee(session.early_bird_price_paise!)}</p>
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{earlyBirdRemaining} early bird seats left</p>
                    </div>
                  )}

                  {/* Booking mode */}
                  {lectures.length > 1 && session.bundle_price_paise && (
                    <div className="space-y-2 mb-4">
                      <button onClick={() => setBookingMode('full')}
                        className="w-full text-left rounded-xl p-3 transition-all"
                        style={{ background: bookingMode === 'full' ? `${color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${bookingMode === 'full' ? `${color}50` : 'rgba(255,255,255,0.06)'}` }}>
                        <div className="flex justify-between">
                          <span className="text-xs font-semibold" style={{ color: bookingMode === 'full' ? color : 'rgba(255,255,255,0.6)' }}>Full Series ({lectures.length} lectures)</span>
                          <span className="text-xs font-bold text-white">{formatFee(session.bundle_price_paise)}</span>
                        </div>
                        <p className="text-[9px] mt-0.5" style={{ color: '#4ADE80' }}>Save {formatFee(session.price_per_seat_paise * lectures.length - session.bundle_price_paise)}</p>
                      </button>
                      <button onClick={() => setBookingMode('single')}
                        className="w-full text-left rounded-xl p-3 transition-all"
                        style={{ background: bookingMode === 'single' ? `${color}15` : 'rgba(255,255,255,0.03)', border: `1px solid ${bookingMode === 'single' ? `${color}50` : 'rgba(255,255,255,0.06)'}` }}>
                        <span className="text-xs font-semibold" style={{ color: bookingMode === 'single' ? color : 'rgba(255,255,255,0.6)' }}>Individual lectures &mdash; {formatFee(session.price_per_seat_paise)} each</span>
                      </button>
                    </div>
                  )}

                  {/* Individual lecture selection */}
                  {bookingMode === 'single' && lectures.length > 1 && (
                    <div className="space-y-1.5 mb-4">
                      {lectures.map((l) => (
                        <label key={l.id} className="flex items-center gap-3 p-2 rounded-lg cursor-pointer" style={{ background: selectedLectures.has(l.id) ? 'rgba(255,255,255,0.06)' : 'transparent' }}>
                          <input type="checkbox" checked={selectedLectures.has(l.id)}
                            onChange={() => setSelectedLectures((prev) => { const n = new Set(prev); if (n.has(l.id)) n.delete(l.id); else n.add(l.id); return n; })}
                            className="accent-[#C9993A]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white truncate">{l.title}</p>
                            <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {new Date(l.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-white">{formatFee(session.price_per_seat_paise)}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Book CTA */}
                  <button onClick={handleBook} disabled={booking || isFull || (bookingMode === 'single' && selectedLectures.size === 0)}
                    className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40"
                    style={{ background: isFull ? 'rgba(255,255,255,0.1)' : color, color: isFull ? 'rgba(255,255,255,0.5)' : '#0B1F3A' }}>
                    {booking ? 'Booking...' : isFull ? 'Fully Booked' :
                      bookingMode === 'full' ? `Book Seat \u2014 ${formatFee(earlyBirdActive ? session.early_bird_price_paise! : session.bundle_price_paise ?? session.price_per_seat_paise)}` :
                      `Book ${selectedLectures.size} lecture${selectedLectures.size !== 1 ? 's' : ''} \u2014 ${formatFee(session.price_per_seat_paise * selectedLectures.size)}`}
                  </button>
                </div>

                {/* Trust signals */}
                <div className="px-5 py-4 space-y-2" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
                  {[
                    { icon: '\u2713', text: 'Full refund if session cancelled' },
                    { icon: '\u2713', text: 'Meeting link shared 24h before' },
                    { icon: '\u2713', text: 'Payment secure via Razorpay' },
                  ].map((t) => (
                    <p key={t.text} className="text-[10px] flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span style={{ color: '#4ADE80' }}>{t.icon}</span>{t.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
