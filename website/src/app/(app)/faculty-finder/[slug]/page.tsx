'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import Link from 'next/link';

type FacultyData = {
  id: string;
  full_name: string;
  city: string | null;
  primary_saathi_id: string | null;
  faculty_profiles: {
    institution_name: string;
    department: string;
    designation: string | null;
    verification_status: string;
    session_bio: string | null;
    expertise_tags: string[];
    research_areas: string | null;
    session_active: boolean;
    session_fee_doubt: number;
    session_fee_research: number;
    session_fee_deepdive: number;
    offers_doubt_session: boolean;
    offers_research_session: boolean;
    offers_deepdive_session: boolean;
    total_sessions_completed: number;
    average_rating: number;
    total_reviews: number;
    open_to_research: boolean;
    availability_note: string | null;
    faculty_slug: string | null;
    years_experience: number;
    response_rate: number;
    avg_response_hours: number;
  } | null;
};

type ReviewRow = { student_rating: number; student_review: string | null; student_reviewed_at: string; };
type AnswerRow = { id: string; body: string; created_at: string; faculty_verified: boolean; };

const SESSION_TYPES = [
  { id: 'doubt', label: 'Doubt Clearing', emoji: '\u{1F4C5}', desc: 'Get a specific concept or question resolved', defaultMins: 60 },
  { id: 'research', label: 'Research Guidance', emoji: '\u{1F52C}', desc: 'Research methodology, paper review, thesis direction', defaultMins: 90 },
  { id: 'deepdive', label: 'Topic Deep Dive', emoji: '\u{1F4DA}', desc: 'Intensive exploration of a complex topic', defaultMins: 90 },
];

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`;
}

export default function FacultyProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const { profile: myProfile } = useAuthStore();

  const [faculty, setFaculty] = useState<FacultyData | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Booking state
  const [selectedType, setSelectedType] = useState('doubt');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [slots, setSlots] = useState(['', '', '']);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Lecture request state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestSubject, setRequestSubject] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [requestPublic, setRequestPublic] = useState(true);
  const [requestSending, setRequestSending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [publicRequests, setPublicRequests] = useState<{ id: string; subject: string; message: string; upvote_count: number; upvoter_ids: string[]; student_id: string; status: string; created_at: string; student_name?: string; student_city?: string }[]>([]);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      // Try slug first, then UUID
      const isUUID = /^[0-9a-f]{8}-/.test(slug);
      let query = supabase
        .from('profiles')
        .select(`id, full_name, city, primary_saathi_id, faculty_profiles (
          institution_name, department, designation, verification_status,
          session_bio, expertise_tags, research_areas, session_active,
          session_fee_doubt, session_fee_research, session_fee_deepdive,
          offers_doubt_session, offers_research_session, offers_deepdive_session,
          total_sessions_completed, average_rating, total_reviews,
          open_to_research, availability_note, faculty_slug, years_experience,
          response_rate, avg_response_hours
        )`)
        .eq('role', 'faculty');

      if (isUUID) {
        query = query.eq('id', slug);
      } else {
        query = query.eq('faculty_profiles.faculty_slug', slug);
      }

      const { data } = await query.maybeSingle();
      setFaculty(data as unknown as FacultyData | null);

      if (data?.id) {
        // Load reviews
        const { data: revData } = await supabase
          .from('session_reviews')
          .select('student_rating, student_review, student_reviewed_at')
          .in('session_id',
            (await supabase.from('faculty_sessions').select('id').eq('faculty_id', data.id).eq('status', 'reviewed')).data?.map((s: { id: string }) => s.id) ?? []
          )
          .not('student_rating', 'is', null)
          .order('student_reviewed_at', { ascending: false })
          .limit(10);
        setReviews((revData ?? []) as ReviewRow[]);

        // Load board answers
        const { data: ansData } = await supabase
          .from('board_answers')
          .select('id, body, created_at, faculty_verified')
          .eq('user_id', data.id)
          .eq('is_faculty_answer', true)
          .order('created_at', { ascending: false })
          .limit(5);
        setAnswers((ansData ?? []) as AnswerRow[]);

        // Load public lecture requests
        const { data: reqData } = await supabase
          .from('lecture_requests')
          .select('id, subject, message, upvote_count, upvoter_ids, student_id, status, created_at')
          .eq('faculty_id', data.id)
          .eq('is_public', true)
          .in('status', ['pending', 'acknowledged', 'accepted'])
          .order('upvote_count', { ascending: false })
          .limit(10);

        if (reqData && reqData.length > 0) {
          // Get student first names + cities
          const sIds = [...new Set(reqData.map((r: { student_id: string }) => r.student_id))];
          const { data: sProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, city')
            .in('id', sIds);
          const nameMap: Record<string, { name: string; city: string | null }> = {};
          (sProfiles ?? []).forEach((p: { id: string; full_name: string; city: string | null }) => {
            nameMap[p.id] = { name: p.full_name?.split(' ')[0] ?? 'Student', city: p.city };
          });
          setPublicRequests(reqData.map((r: { id: string; subject: string; message: string; upvote_count: number; upvoter_ids: string[]; student_id: string; status: string; created_at: string }) => ({
            ...r,
            student_name: nameMap[r.student_id]?.name,
            student_city: nameMap[r.student_id]?.city ?? undefined,
          })));
        }
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  async function handleBooking() {
    if (!myProfile || !faculty || !topic.trim()) return;
    setSubmitting(true);

    const fp = faculty.faculty_profiles!;
    const feeKey = `session_fee_${selectedType}` as keyof typeof fp;
    const feePaise = (fp[feeKey] as number) ?? 100000;
    const platformFee = Math.round(feePaise * 0.2);
    const facultyPayout = feePaise - platformFee;

    const supabase = createClient();
    const { error } = await supabase.from('faculty_sessions').insert({
      student_id: myProfile.id,
      faculty_id: faculty.id,
      session_type: selectedType,
      topic: topic.trim().slice(0, 500),
      student_message: message.trim().slice(0, 1000) || null,
      proposed_slots: slots.filter((s) => s).map((s) => new Date(s).toISOString()),
      fee_paise: feePaise,
      platform_fee_paise: platformFee,
      faculty_payout_paise: facultyPayout,
      status: 'requested',
    });

    setSubmitting(false);
    if (!error) setSubmitted(true);
  }

  async function sendRequest() {
    if (!myProfile || !faculty || !requestSubject.trim()) return;
    setRequestSending(true);
    const supabase = createClient();
    await supabase.from('lecture_requests').insert({
      student_id: myProfile.id,
      faculty_id: faculty.id,
      subject: requestSubject.trim().slice(0, 100),
      message: requestMessage.trim().slice(0, 500),
      is_public: requestPublic,
      upvoter_ids: [myProfile.id],
    });
    setRequestSending(false);
    setRequestSent(true);
  }

  async function upvoteRequest(requestId: string) {
    if (!myProfile) return;
    const supabase = createClient();
    const req = publicRequests.find((r) => r.id === requestId);
    if (!req || req.upvoter_ids.includes(myProfile.id) || req.student_id === myProfile.id) return;
    await supabase.from('lecture_requests').update({
      upvote_count: req.upvote_count + 1,
      upvoter_ids: [...req.upvoter_ids, myProfile.id],
    }).eq('id', requestId);
    setPublicRequests((prev) => prev.map((r) =>
      r.id === requestId ? { ...r, upvote_count: r.upvote_count + 1, upvoter_ids: [...r.upvoter_ids, myProfile.id] } : r
    ));
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </main>
    );
  }

  if (!faculty || !faculty.faculty_profiles) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="text-center">
          <p className="text-5xl mb-4">{'\u{1F50D}'}</p>
          <h2 className="font-playfair text-2xl text-white mb-2">Faculty not found</h2>
          <Link href="/faculty-finder" style={{ color: '#C9993A' }}>&larr; Back to Faculty Finder</Link>
        </div>
      </main>
    );
  }

  const fp = faculty.faculty_profiles;
  const saathi = SAATHIS.find((s) => s.id === faculty.primary_saathi_id);
  const color = saathi?.primary ?? '#C9993A';
  const isVerified = fp.verification_status === 'verified';

  const selectedFee = (fp[`session_fee_${selectedType}` as keyof typeof fp] as number) ?? 100000;

  return (
    <main className="min-h-screen" style={{ background: '#060F1D' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/faculty-finder" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/faculty-finder" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>&larr; All Faculty</Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-[1fr_380px] gap-8">
          {/* LEFT: Profile details */}
          <div>
            {/* Hero */}
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-6 mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${color}25` }}>
              <div className="flex gap-4 items-start mb-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shrink-0"
                  style={{ background: `${color}20`, border: `2px solid ${color}40` }}>
                  {saathi?.emoji ?? '\u{1F393}'}
                </div>
                <div>
                  <h1 className="font-playfair text-2xl font-bold text-white mb-1">{faculty.full_name}</h1>
                  <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {fp.designation} &middot; {fp.institution_name}{faculty.city ? ` \u00B7 ${faculty.city}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {isVerified && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>Verified Faculty</span>}
                    {fp.open_to_research && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.12)', color: '#818CF8' }}>Open to Research</span>}
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{fp.years_experience}y experience</span>
                    {fp.total_sessions_completed > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>{fp.total_sessions_completed} sessions</span>}
                    {fp.average_rating > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,146,60,0.12)', color: '#FB923C' }}>{'\u2B50'} {fp.average_rating.toFixed(1)} ({fp.total_reviews})</span>}
                  </div>
                </div>
              </div>
              {fp.session_bio && <p className="text-sm leading-relaxed mb-4" style={{ color: 'rgba(255,255,255,0.6)' }}>&ldquo;{fp.session_bio}&rdquo;</p>}
              <div className="flex flex-wrap gap-1.5">
                {fp.expertise_tags?.map((t) => <span key={t} className="text-[10px] px-2.5 py-1 rounded-lg" style={{ background: `${color}12`, color, border: `0.5px solid ${color}25` }}>{t}</span>)}
              </div>
            </motion.div>

            {/* Research areas */}
            {fp.research_areas && (
              <div className="rounded-xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                <h3 className="text-sm font-semibold text-white mb-2">{'\u{1F52C}'} Research Areas</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{fp.research_areas}</p>
              </div>
            )}

            {/* Board answers */}
            {answers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white mb-3">Expertise in action</h3>
                <div className="space-y-3">
                  {answers.map((a) => (
                    <div key={a.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-xs text-white/60 line-clamp-3">{a.body}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {a.faculty_verified && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.12)', color: '#4ADE80' }}>Verified</span>}
                        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{new Date(a.created_at).toLocaleDateString('en-IN')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-white mb-3">What students say</h3>
              {reviews.length === 0 ? (
                <p className="text-xs py-8 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>No reviews yet &mdash; be the first!</p>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                      <p className="text-sm mb-1" style={{ color: '#FB923C' }}>{'⭐'.repeat(r.student_rating)}</p>
                      {r.student_review && <p className="text-xs text-white/60 mb-1">{r.student_review}</p>}
                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>{new Date(r.student_reviewed_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-center">
              <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-lg font-bold text-white">{fp.response_rate}%</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Response rate</p>
              </div>
              <div className="flex-1 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <p className="text-lg font-bold text-white">{fp.avg_response_hours}h</p>
                <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Avg response</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Booking widget */}
          <div className="md:sticky md:top-4 self-start">
            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-6 text-center"
                style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.25)' }}>
                <p className="text-4xl mb-3">{'\u{1F389}'}</p>
                <h3 className="font-playfair text-xl font-bold text-white mb-2">Request sent!</h3>
                <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {faculty.full_name} will review your request and confirm a slot. You&apos;ll be notified by email.
                </p>
                <Link href="/my-sessions" className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: '#C9993A', color: '#060F1D', textDecoration: 'none' }}>
                  View My Sessions &rarr;
                </Link>
              </motion.div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
                <div className="p-5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <h3 className="text-sm font-semibold text-white mb-3">Book a session</h3>

                  {/* Session type selector */}
                  <div className="space-y-2 mb-4">
                    {SESSION_TYPES.filter((st) => fp[`offers_${st.id}_session` as keyof typeof fp]).map((st) => {
                      const fee = fp[`session_fee_${st.id}` as keyof typeof fp] as number;
                      const sel = selectedType === st.id;
                      return (
                        <button key={st.id} onClick={() => setSelectedType(st.id)}
                          className="w-full text-left rounded-xl p-3 transition-all"
                          style={{
                            background: sel ? `${color}15` : 'rgba(255,255,255,0.03)',
                            border: `1px solid ${sel ? `${color}50` : 'rgba(255,255,255,0.06)'}`,
                          }}>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold" style={{ color: sel ? color : 'rgba(255,255,255,0.6)' }}>{st.emoji} {st.label}</span>
                            <span className="text-xs font-bold text-white">{formatFee(fee)}</span>
                          </div>
                          <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{st.desc}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Topic */}
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>What do you need help with?</label>
                  <textarea value={topic} onChange={(e) => setTopic(e.target.value.slice(0, 500))}
                    placeholder="Explain your topic or question..."
                    rows={3} className="w-full rounded-xl px-4 py-3 text-xs text-white outline-none resize-none mb-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />

                  {/* Context */}
                  <textarea value={message} onChange={(e) => setMessage(e.target.value.slice(0, 1000))}
                    placeholder="Additional context (optional)"
                    rows={2} className="w-full rounded-xl px-4 py-3 text-xs text-white outline-none resize-none mb-3"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />

                  {/* Time slots */}
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>Suggest time slots</label>
                  <div className="space-y-2 mb-4">
                    {slots.map((s, i) => (
                      <input key={i} type="datetime-local" value={s}
                        onChange={(e) => { const n = [...slots]; n[i] = e.target.value; setSlots(n); }}
                        className="w-full rounded-lg px-3 py-2 text-xs text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', colorScheme: 'dark' }}
                      />
                    ))}
                  </div>

                  {/* Submit */}
                  <button onClick={handleBooking}
                    disabled={submitting || !topic.trim() || !myProfile}
                    className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40"
                    style={{ background: color, color: '#0B1F3A' }}>
                    {submitting ? 'Sending request...' : `Request Session \u2014 ${formatFee(selectedFee)}`}
                  </button>
                </div>

                {/* Trust signals */}
                <div className="px-5 py-4 space-y-2">
                  {[
                    { icon: '\u{1F4B0}', text: `${formatFee(selectedFee)} charged only after faculty accepts` },
                    { icon: '\u{1F512}', text: 'Payment held until session confirmed complete' },
                    { icon: '\u{21A9}\u{FE0F}', text: 'Full refund if faculty declines or session doesn\'t happen' },
                  ].map((t) => (
                    <p key={t.text} className="text-[10px] flex items-start gap-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <span>{t.icon}</span>{t.text}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {fp.availability_note && (
              <p className="text-[10px] mt-3 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {'\u{1F4C5}'} {fp.availability_note}
              </p>
            )}

            {/* Request a Lecture CTA */}
            {myProfile && myProfile.id !== faculty.id && (
              <div className="mt-4 p-4 rounded-[14px]" style={{ background: 'rgba(201,153,58,0.05)', border: '0.5px solid rgba(201,153,58,0.2)' }}>
                <p className="text-xs font-bold mb-1" style={{ color: '#C9993A' }}>{'\u{2709}'} Request a Lecture</p>
                <p className="text-[11px] mb-3" style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
                  Have a topic you&apos;d love {faculty.full_name?.split(' ')[0] ?? 'this faculty'} to teach? Send a personal request. Other students can support it.
                </p>
                <button onClick={() => setShowRequestModal(true)}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'transparent', border: '0.5px solid rgba(201,153,58,0.4)', color: '#C9993A' }}>
                  {'\u{2709}'} Request a topic &rarr;
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Public requests section */}
        {publicRequests.length > 0 && (
          <section className="mt-8 max-w-5xl mx-auto px-6 pb-8">
            <h2 className="text-sm font-semibold text-white mb-4">{'\u{1F4AC}'} What students are requesting</h2>
            <div className="space-y-3">
              {publicRequests.map((r) => {
                const hasVoted = myProfile ? r.upvoter_ids.includes(myProfile.id) : false;
                const isOwn = myProfile?.id === r.student_id;
                return (
                  <div key={r.id} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-sm font-semibold text-white mb-1">{r.subject}</p>
                    <p className="text-[10px] mb-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Requested by {r.student_name ?? 'Student'}{r.student_city ? ` \u00B7 ${r.student_city}` : ''}
                    </p>
                    <p className="text-xs mb-3 line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                      &ldquo;{r.message.slice(0, 150)}{r.message.length > 150 ? '...' : ''}&rdquo;
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: r.upvote_count >= 5 ? '#FB923C' : 'rgba(255,255,255,0.4)' }}>
                        {r.upvote_count >= 5 ? '\u{1F525} ' : '\u25B2 '}{r.upvote_count} student{r.upvote_count !== 1 ? 's' : ''} want{r.upvote_count === 1 ? 's' : ''} this
                      </span>
                      {myProfile && !hasVoted && !isOwn && (
                        <button onClick={() => upvoteRequest(r.id)}
                          className="text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: 'rgba(201,153,58,0.1)', border: '0.5px solid rgba(201,153,58,0.3)', color: '#C9993A' }}>
                          + Me too
                        </button>
                      )}
                      {hasVoted && (
                        <span className="text-[10px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: 'rgba(74,222,128,0.08)', color: '#4ADE80' }}>
                          {'\u2713'} You support this
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Request modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => { if (!requestSending) setShowRequestModal(false); }}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-2xl p-6" style={{ background: '#0B1F3A', border: '0.5px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}>

              {requestSent ? (
                <div className="text-center py-4">
                  <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-5xl mb-3">{'\u{1F393}'}</motion.p>
                  <h3 className="font-playfair text-xl font-bold text-white mb-2">Request sent!</h3>
                  <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
                    {faculty.full_name} will be notified. If other students support your request, it moves to the top of their list.
                  </p>
                  <button onClick={() => { setShowRequestModal(false); setRequestSent(false); setRequestSubject(''); setRequestMessage(''); }}
                    className="text-xs font-semibold px-5 py-2 rounded-lg" style={{ background: '#C9993A', color: '#060F1D' }}>
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="font-playfair text-lg font-bold text-white mb-1">Request a lecture from {faculty.full_name?.split(' ')[0]}</h3>
                  <p className="text-[10px] mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Your name and institution visible to faculty only. Public requests show first name only.</p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Topic you&apos;d like covered *</label>
                      <input value={requestSubject} onChange={(e) => setRequestSubject(e.target.value.slice(0, 100))}
                        placeholder="e.g. Landmark judgements on Right to Privacy"
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
                      <p className="text-[9px] text-right mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{requestSubject.length}/100</p>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>Your message to {faculty.full_name?.split(' ')[0]}</label>
                      <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value.slice(0, 500))}
                        placeholder="Sir/Ma'am, I would be grateful if you could cover this topic. Here's why it matters to me..."
                        rows={4} className="w-full rounded-xl px-4 py-3 text-xs text-white outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
                      <p className="text-[9px] text-right mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{requestMessage.length}/500</p>
                    </div>

                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={requestPublic} onChange={() => setRequestPublic(true)} className="accent-[#C9993A]" />
                        <div>
                          <p className="text-[10px] font-semibold text-white">Public</p>
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Others can support</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={!requestPublic} onChange={() => setRequestPublic(false)} className="accent-[#C9993A]" />
                        <div>
                          <p className="text-[10px] font-semibold text-white">Private</p>
                          <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>Only faculty sees</p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowRequestModal(false)} className="flex-1 py-3 rounded-xl text-xs"
                      style={{ color: 'rgba(255,255,255,0.4)', border: '0.5px solid rgba(255,255,255,0.1)' }}>Cancel</button>
                    <button onClick={sendRequest} disabled={requestSending || !requestSubject.trim()}
                      className="flex-1 py-3 rounded-xl text-xs font-bold disabled:opacity-40"
                      style={{ background: '#C9993A', color: '#060F1D' }}>
                      {requestSending ? 'Sending...' : 'Send Request \u{2709}'}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
