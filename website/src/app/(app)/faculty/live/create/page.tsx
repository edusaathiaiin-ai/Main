'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { getSubjectChips } from '@/constants/subjectChips';
import Link from 'next/link';

type Step = 'type' | 'content' | 'schedule' | 'pricing' | 'preview';

const FORMATS = [
  { id: 'single', emoji: '\u{1F4C5}', label: 'Single Lecture', desc: 'One standalone session' },
  { id: 'series', emoji: '\u{1F4DA}', label: 'Lecture Series', desc: 'Multiple linked lectures' },
  { id: 'workshop', emoji: '\u{1F528}', label: 'Workshop', desc: 'Hands-on practical session' },
  { id: 'recurring', emoji: '\u{1F504}', label: 'Monthly Recurring', desc: 'Same slot every week/month' },
  { id: 'qa', emoji: '\u{1F4AC}', label: 'Open Q&A', desc: 'Students ask anything' },
];

type LectureInput = { title: string; date: string; duration: number };

export default function CreateLiveSessionPage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [step, setStep] = useState<Step>('type');
  const [format, setFormat] = useState('single');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [prepNotes, setPrepNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [lectures, setLectures] = useState<LectureInput[]>([{ title: 'Lecture 1', date: '', duration: 60 }]);
  const [singleDate, setSingleDate] = useState('');
  const [singleDuration, setSingleDuration] = useState(60);
  const [totalSeats, setTotalSeats] = useState(25);
  const [minSeats, setMinSeats] = useState(5);
  const [pricePerSeat, setPricePerSeat] = useState(500);
  const [bundlePrice, setBundlePrice] = useState(0);
  const [earlyBirdEnabled, setEarlyBirdEnabled] = useState(false);
  const [earlyBirdSeats, setEarlyBirdSeats] = useState(5);
  const [earlyBirdPrice, setEarlyBirdPrice] = useState(0);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [sessionUrl, setSessionUrl] = useState('');

  const saathiId = profile?.primary_saathi_id ?? '';
  const chips = getSubjectChips(saathiId);

  function toggleTag(t: string) { setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 5 ? [...prev, t] : prev); }

  function addLecture() {
    if (lectures.length >= 10) return;
    setLectures([...lectures, { title: `Lecture ${lectures.length + 1}`, date: '', duration: 60 }]);
  }

  function updateLecture(i: number, field: keyof LectureInput, value: string | number) {
    setLectures((prev) => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
  }

  async function handleSubmit() {
    if (!profile) return;
    setSaving(true);

    const supabase = createClient();

    // Create session
    const { data: sess, error } = await supabase.from('live_sessions').insert({
      faculty_id: profile.id,
      vertical_id: profile.primary_saathi_id,
      title: title.trim(),
      description: description.trim(),
      preparation_notes: prepNotes.trim() || null,
      tags,
      session_format: format,
      price_per_seat_paise: pricePerSeat * 100,
      bundle_price_paise: format === 'series' && bundlePrice > 0 ? bundlePrice * 100 : null,
      early_bird_price_paise: earlyBirdEnabled ? earlyBirdPrice * 100 : null,
      early_bird_seats: earlyBirdEnabled ? earlyBirdSeats : null,
      total_seats: totalSeats,
      min_seats: minSeats,
      status: 'published', // auto-publish for verified faculty
    }).select('id').single();

    if (error || !sess) { setSaving(false); return; }

    // Create lectures
    const lectureRows = format === 'single'
      ? [{ session_id: sess.id, lecture_number: 1, title: title.trim(), scheduled_at: new Date(singleDate).toISOString(), duration_minutes: singleDuration }]
      : lectures.filter((l) => l.date).map((l, i) => ({
          session_id: sess.id, lecture_number: i + 1, title: l.title.trim(), scheduled_at: new Date(l.date).toISOString(), duration_minutes: l.duration,
        }));

    await supabase.from('live_lectures').insert(lectureRows);

    // Notify matching-Saathi students via Edge Function (fire-and-forget)
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
          action: 'notify-live-published',
          liveSessionId: sess.id,
          verticalId: profile.primary_saathi_id,
          title: title.trim(),
        }),
      }).catch(() => {});
    }

    setSessionUrl(`${window.location.origin}/live/${sess.id}`);
    setPublished(true);
    setSaving(false);
  }

  const STEPS: Step[] = ['type', 'content', 'schedule', 'pricing', 'preview'];
  const stepIdx = STEPS.indexOf(step);

  if (!profile) return null;

  const inputStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' };
  const labelStyle: React.CSSProperties = { color: 'rgba(255,255,255,0.45)' };

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <Link href="/faculty/live" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>EdUsaathiAI</Link>
        <Link href="/faculty/live" className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', textDecoration: 'none' }}>&larr; My Live Sessions</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-8">
        {published ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
            <p className="text-5xl mb-4">{'\u{1F389}'}</p>
            <h2 className="font-playfair text-3xl font-bold text-white mb-3">Published!</h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Students matching your subject have been notified.</p>
            <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>Share this link:</p>
              <p className="text-sm text-white font-mono break-all">{sessionUrl}</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(sessionUrl)} className="px-6 py-3 rounded-xl text-sm font-bold" style={{ background: '#C9993A', color: '#060F1D' }}>
              Copy Link
            </button>
          </motion.div>
        ) : (
          <>
            <h1 className="font-playfair text-3xl font-bold text-white mb-2">Create Live Session</h1>
            {/* Progress */}
            <div className="flex gap-1.5 mb-8">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1 h-1 rounded-full" style={{ background: i <= stepIdx ? '#C9993A' : 'rgba(255,255,255,0.08)' }} />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* STEP: Type */}
              {step === 'type' && (
                <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <h2 className="text-lg font-semibold text-white mb-4">What kind of session?</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {FORMATS.map((f) => (
                      <button key={f.id} onClick={() => setFormat(f.id)}
                        className="text-left rounded-xl p-4 transition-all"
                        style={{ background: format === f.id ? 'rgba(201,153,58,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${format === f.id ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.06)'}` }}>
                        <span className="text-2xl block mb-1">{f.emoji}</span>
                        <p className="text-sm font-semibold" style={{ color: format === f.id ? '#E5B86A' : 'rgba(255,255,255,0.6)' }}>{f.label}</p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.desc}</p>
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setStep('content')} className="w-full rounded-xl py-3.5 text-sm font-bold" style={{ background: '#C9993A', color: '#060F1D' }}>Next &rarr;</button>
                </motion.div>
              )}

              {/* STEP: Content */}
              {step === 'content' && (
                <motion.div key="content" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Title (80 chars)</label>
                    <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 80))} placeholder="e.g. Mastering Quantum Mechanics — From Classical to Quantum"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} placeholder="What will students learn?"
                      rows={4} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Tags ({tags.length}/5)</label>
                    <div className="flex flex-wrap gap-2">
                      {chips.map((c) => (
                        <button key={c} onClick={() => toggleTag(c)} className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                          style={{ background: tags.includes(c) ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)', border: `1px solid ${tags.includes(c) ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`, color: tags.includes(c) ? '#C9993A' : 'rgba(255,255,255,0.5)' }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Preparation notes (optional)</label>
                    <textarea value={prepNotes} onChange={(e) => setPrepNotes(e.target.value.slice(0, 300))} placeholder="What should students do before attending?"
                      rows={2} className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none" style={inputStyle} />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('type')} className="flex-1 rounded-xl py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>&larr; Back</button>
                    <button onClick={() => setStep('schedule')} disabled={!title.trim()} className="flex-1 rounded-xl py-3 text-sm font-bold disabled:opacity-40" style={{ background: '#C9993A', color: '#060F1D' }}>Next &rarr;</button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Schedule */}
              {step === 'schedule' && (
                <motion.div key="schedule" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="text-lg font-semibold text-white">Schedule</h2>
                  {format === 'single' || format === 'workshop' || format === 'qa' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Date &amp; time</label>
                        <input type="datetime-local" value={singleDate} onChange={(e) => setSingleDate(e.target.value)}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ ...inputStyle, colorScheme: 'dark' }} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Duration (min)</label>
                        <select value={singleDuration} onChange={(e) => setSingleDuration(parseInt(e.target.value))}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}>
                          <option value={30} style={{ background: '#0B1F3A' }}>30 min</option>
                          <option value={60} style={{ background: '#0B1F3A' }}>60 min</option>
                          <option value={90} style={{ background: '#0B1F3A' }}>90 min</option>
                          <option value={120} style={{ background: '#0B1F3A' }}>120 min</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lectures.map((l, i) => (
                        <div key={i} className="grid grid-cols-[1fr_160px_80px] gap-2 items-end">
                          <div>
                            <label className="block text-[10px] mb-1" style={labelStyle}>Title</label>
                            <input value={l.title} onChange={(e) => updateLecture(i, 'title', e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
                          </div>
                          <div>
                            <label className="block text-[10px] mb-1" style={labelStyle}>Date/time</label>
                            <input type="datetime-local" value={l.date} onChange={(e) => updateLecture(i, 'date', e.target.value)}
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ ...inputStyle, colorScheme: 'dark' }} />
                          </div>
                          <div>
                            <label className="block text-[10px] mb-1" style={labelStyle}>Min</label>
                            <input type="number" value={l.duration} onChange={(e) => updateLecture(i, 'duration', parseInt(e.target.value) || 60)}
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={inputStyle} />
                          </div>
                        </div>
                      ))}
                      {lectures.length < 10 && (
                        <button onClick={addLecture} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(201,153,58,0.12)', color: '#C9993A' }}>+ Add lecture</button>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep('content')} className="flex-1 rounded-xl py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>&larr; Back</button>
                    <button onClick={() => setStep('pricing')} className="flex-1 rounded-xl py-3 text-sm font-bold" style={{ background: '#C9993A', color: '#060F1D' }}>Next &rarr;</button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Pricing */}
              {step === 'pricing' && (
                <motion.div key="pricing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="text-lg font-semibold text-white">Seats &amp; Pricing</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Total seats</label>
                      <input type="number" min={1} max={500} value={totalSeats} onChange={(e) => setTotalSeats(parseInt(e.target.value) || 25)}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                      <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Recommended: 15-30</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Minimum to proceed</label>
                      <input type="number" min={1} max={totalSeats} value={minSeats} onChange={(e) => setMinSeats(parseInt(e.target.value) || 1)}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Price per seat ({'\u20B9'})</label>
                    <input type="number" min={50} value={pricePerSeat} onChange={(e) => setPricePerSeat(parseInt(e.target.value) || 500)}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                    <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>You receive 80% ({'\u20B9'}{Math.round(pricePerSeat * 0.8)})</p>
                  </div>
                  {format === 'series' && lectures.length > 1 && (
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Bundle price for full series ({'\u20B9'})</label>
                      <input type="number" min={0} value={bundlePrice} onChange={(e) => setBundlePrice(parseInt(e.target.value) || 0)}
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                      <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                        {lectures.length} lectures {'\u00D7'} {'\u20B9'}{pricePerSeat} = {'\u20B9'}{pricePerSeat * lectures.length} individually.
                        {bundlePrice > 0 && ` Bundle saves students \u20B9${pricePerSeat * lectures.length - bundlePrice}.`}
                      </p>
                    </div>
                  )}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={earlyBirdEnabled} onChange={(e) => setEarlyBirdEnabled(e.target.checked)} className="accent-[#C9993A]" />
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Enable early bird pricing</span>
                  </label>
                  {earlyBirdEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Early bird seats</label>
                        <input type="number" min={1} value={earlyBirdSeats} onChange={(e) => setEarlyBirdSeats(parseInt(e.target.value) || 5)}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Early bird price ({'\u20B9'})</label>
                        <input type="number" min={50} value={earlyBirdPrice} onChange={(e) => setEarlyBirdPrice(parseInt(e.target.value) || 0)}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle} />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button onClick={() => setStep('schedule')} className="flex-1 rounded-xl py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>&larr; Back</button>
                    <button onClick={() => setStep('preview')} className="flex-1 rounded-xl py-3 text-sm font-bold" style={{ background: '#C9993A', color: '#060F1D' }}>Preview &rarr;</button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Preview */}
              {step === 'preview' && (
                <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                  <h2 className="text-lg font-semibold text-white">Preview &amp; Publish</h2>
                  <div className="rounded-xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[10px] font-bold mb-2" style={{ color: '#C9993A' }}>{FORMATS.find((f) => f.id === format)?.emoji} {FORMATS.find((f) => f.id === format)?.label}</p>
                    <h3 className="text-lg font-bold text-white mb-1">{title || 'Untitled'}</h3>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>{description || 'No description'}</p>
                    {tags.length > 0 && <div className="flex flex-wrap gap-1.5 mb-3">{tags.map((t) => <span key={t} className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,153,58,0.12)', color: '#C9993A' }}>{t}</span>)}</div>}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div><p className="text-lg font-bold text-white">{totalSeats}</p><p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>seats</p></div>
                      <div><p className="text-lg font-bold text-white">{'\u20B9'}{pricePerSeat}</p><p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>per seat</p></div>
                      <div><p className="text-lg font-bold" style={{ color: '#4ADE80' }}>{'\u20B9'}{Math.round(pricePerSeat * 0.8)}</p><p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>you earn</p></div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep('pricing')} className="flex-1 rounded-xl py-3 text-sm" style={{ color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>&larr; Edit</button>
                    <button onClick={handleSubmit} disabled={saving || !title.trim()}
                      className="flex-1 rounded-xl py-3.5 text-sm font-bold disabled:opacity-40" style={{ background: '#C9993A', color: '#060F1D' }}>
                      {saving ? 'Publishing...' : 'Publish Session \u{1F680}'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  );
}
