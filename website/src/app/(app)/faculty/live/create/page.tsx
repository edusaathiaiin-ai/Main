'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { resolveVerticalId } from '@/lib/resolveVertical'
import { toSlug } from '@/constants/verticalIds'
import { useAuthStore } from '@/stores/authStore'
import { getSubjectChips } from '@/constants/subjectChips'
import Link from 'next/link'

type Step = 'type' | 'content' | 'schedule' | 'pricing' | 'preview'

const FORMATS = [
  {
    id: 'single',
    emoji: '\u{1F4C5}',
    label: 'Single Lecture',
    desc: 'One standalone session',
  },
  {
    id: 'series',
    emoji: '\u{1F4DA}',
    label: 'Lecture Series',
    desc: 'Multiple linked lectures',
  },
  {
    id: 'workshop',
    emoji: '\u{1F528}',
    label: 'Workshop',
    desc: 'Hands-on practical session',
  },
  {
    id: 'recurring',
    emoji: '\u{1F504}',
    label: 'Monthly Recurring',
    desc: 'Same slot every week/month',
  },
  {
    id: 'qa',
    emoji: '\u{1F4AC}',
    label: 'Open Q&A',
    desc: 'Students ask anything',
  },
]

type LectureInput = { title: string; date: string; duration: number }

export default function CreateLiveSessionPage() {
  const { profile } = useAuthStore()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Intent pre-fill from demand dashboard
  const intentId = searchParams.get('intent')
  const intentTopic = searchParams.get('topic') ?? ''

  const [step, setStep] = useState<Step>('type')
  const [format, setFormat] = useState('single')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [prepNotes, setPrepNotes] = useState('')

  // Role guard — faculty only
  useEffect(() => {
    if (profile && profile.role !== 'faculty') {
      router.replace('/chat')
    }
  }, [profile, router])

  // Pre-fill title from intent topic on mount
  useEffect(() => {
    function run() {
      if (intentTopic && !title) {
        setTitle(intentTopic)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [tags, setTags] = useState<string[]>([])
  const [lectures, setLectures] = useState<LectureInput[]>([
    { title: 'Lecture 1', date: '', duration: 60 },
  ])
  const [singleDate, setSingleDate] = useState('')
  const [singleDuration, setSingleDuration] = useState(60)
  const [totalSeats, setTotalSeats] = useState(25)
  const [minSeats, setMinSeats] = useState(5)
  const [pricePerSeat, setPricePerSeat] = useState(500)
  const [bundlePrice, setBundlePrice] = useState(0)
  const [earlyBirdEnabled, setEarlyBirdEnabled] = useState(false)
  const [earlyBirdSeats, setEarlyBirdSeats] = useState(5)
  const [earlyBirdPrice, setEarlyBirdPrice] = useState(0)
  const [meetingLink, setMeetingLink] = useState('')
  const [saving, setSaving] = useState(false)
  const [published, setPublished] = useState(false)
  const [sessionUrl, setSessionUrl] = useState('')
  const [publishError, setPublishError] = useState<string | null>(null)

  const saathiId = toSlug(profile?.primary_saathi_id) ?? ''
  const chips = getSubjectChips(saathiId)

  function toggleTag(t: string) {
    setTags((prev) =>
      prev.includes(t)
        ? prev.filter((x) => x !== t)
        : prev.length < 5
          ? [...prev, t]
          : prev
    )
  }

  function addLecture() {
    if (lectures.length >= 10) return
    setLectures([
      ...lectures,
      { title: `Lecture ${lectures.length + 1}`, date: '', duration: 60 },
    ])
  }

  function updateLecture(
    i: number,
    field: keyof LectureInput,
    value: string | number
  ) {
    setLectures((prev) =>
      prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l))
    )
  }

  async function handleSubmit() {
    if (!profile) return
    setSaving(true)
    setPublishError(null)

    // Meeting link is MANDATORY for every published session — the reminder
    // cron sends it to students 1 hour before the lecture. Without it,
    // students cannot join. Also enforced by DB CHECK constraint.
    const trimmedMeetingLink = meetingLink.trim()
    if (!trimmedMeetingLink) {
      setPublishError(
        'Please create your meeting link first. Create a Google Meet or Zoom link with the scheduled date/time, then paste the URL in the Meeting link field.'
      )
      setSaving(false)
      return
    }
    // Light URL validation — catches obvious typos before the DB rejects
    try {
      const u = new URL(trimmedMeetingLink)
      if (!['http:', 'https:'].includes(u.protocol)) {
        throw new Error('bad protocol')
      }
    } catch {
      setPublishError(
        'The meeting link doesn\'t look right. It should start with https:// (e.g. https://meet.google.com/xxx-xxxx-xxx).'
      )
      setSaving(false)
      return
    }

    const supabase = createClient()

    // Resolve saathi slug → UUID (live_sessions.vertical_id has FK to verticals.id)
    const verticalUuid = await resolveVerticalId(
      profile.primary_saathi_id ?? ''
    )
    if (!verticalUuid) {
      console.error('[publish] could not resolve vertical', profile.primary_saathi_id)
      setPublishError(
        'Your Saathi profile is incomplete — vertical could not be resolved. Please check your profile.'
      )
      setSaving(false)
      return
    }

    // Description is NOT NULL in live_sessions — default to title if empty
    const safeDescription = description.trim() || `Live session: ${title.trim()}`

    // Build insert payload. intent_id / priority_booking_until are only
    // included when actually fulfilling a learning intent — they live in
    // migration 067 and aren't in PostgREST's schema cache on every env,
    // so sending them as null caused PGRST204 for standard sessions.
    const payload: Record<string, unknown> = {
      faculty_id: profile.id,
      vertical_id: verticalUuid,
      title: title.trim(),
      description: safeDescription,
      preparation_notes: prepNotes.trim() || null,
      tags,
      session_format: format,
      price_per_seat_paise: pricePerSeat * 100,
      bundle_price_paise:
        format === 'series' && bundlePrice > 0 ? bundlePrice * 100 : null,
      early_bird_price_paise: earlyBirdEnabled ? earlyBirdPrice * 100 : null,
      early_bird_seats: earlyBirdEnabled ? earlyBirdSeats : null,
      total_seats: totalSeats,
      min_seats: minSeats,
      meeting_link: trimmedMeetingLink,
      status: 'published', // auto-publish for verified faculty
    }
    if (intentId) {
      payload.intent_id = intentId
      payload.priority_booking_until = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString()
    }

    // Create session
    const { data: sess, error } = await supabase
      .from('live_sessions')
      .insert(payload)
      .select('id')
      .single()

    if (error || !sess) {
      console.error('[publish] live_sessions insert failed', error)
      const detail = error?.message ?? 'Unknown error'
      const hint = error?.hint ? ` · ${error.hint}` : ''
      const code = error?.code ? ` (${error.code})` : ''
      setPublishError(
        `Could not publish your session: ${detail}${hint}${code}. Please try again or contact support.`
      )
      setSaving(false)
      return
    }

    // Fulfill intent if created from demand dashboard
    if (intentId) {
      await supabase
        .from('learning_intents')
        .update({ status: 'fulfilled', resulting_session_id: sess.id })
        .eq('id', intentId)
    }

    // Create lectures
    const lectureRows =
      format === 'single'
        ? [
            {
              session_id: sess.id,
              lecture_number: 1,
              title: title.trim(),
              scheduled_at: new Date(singleDate).toISOString(),
              duration_minutes: singleDuration,
            },
          ]
        : lectures
            .filter((l) => l.date)
            .map((l, i) => ({
              session_id: sess.id,
              lecture_number: i + 1,
              title: l.title.trim(),
              scheduled_at: new Date(l.date).toISOString(),
              duration_minutes: l.duration,
            }))

    if (lectureRows.length === 0) {
      console.error('[publish] no valid lecture rows')
      setPublishError(
        'Please add at least one lecture with a scheduled date before publishing.'
      )
      setSaving(false)
      return
    }

    const { error: lecturesError } = await supabase
      .from('live_lectures')
      .insert(lectureRows)

    if (lecturesError) {
      console.error('[publish] live_lectures insert failed', lecturesError)
      setPublishError(
        `Session was created but adding lectures failed: ${lecturesError.message}. Please edit the session to add them.`
      )
      setSaving(false)
      return
    }

    // Notifications: both to the faculty (confirmation) and to matching-Saathi
    // students (discovery). Fire-and-forget — booking is already committed.
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession()
    if (authSession?.access_token) {
      // 1. Faculty confirmation
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            action: 'notify-faculty-session-created',
            liveSessionId: sess.id,
          }),
        },
      ).catch(() => {})

      // 2. Saathi-matched student broadcast
      fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/session-request`,
        {
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
        }
      ).catch(() => {})
    }

    setSessionUrl(`${window.location.origin}/live/${sess.id}`)
    setPublished(true)
    setSaving(false)
  }

  const STEPS: Step[] = ['type', 'content', 'schedule', 'pricing', 'preview']
  const stepIdx = STEPS.indexOf(step)

  if (!profile) return null

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  }
  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)' }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          'var(--bg-base)',
      }}
    >
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <Link
          href="/faculty/live"
          className="font-playfair text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/faculty/live"
          className="text-sm"
          style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          &larr; My Live Sessions
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-8">
        {published ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 text-center"
          >
            <p className="mb-4 text-5xl">{'\u{1F389}'}</p>
            <h2 className="font-playfair mb-3 text-3xl font-bold text-[var(--text-primary)]">
              Published!
            </h2>
            <p
              className="mb-6 text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {intentId
                ? 'Students who wanted this topic get 24 hours of priority booking access.'
                : 'Students matching your subject have been notified.'}
            </p>
            <div
              className="mb-6 rounded-xl p-4"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <p
                className="mb-1 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Share this link:
              </p>
              <p className="font-mono text-sm break-all text-[var(--text-primary)]">
                {sessionUrl}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => navigator.clipboard.writeText(sessionUrl)}
                className="rounded-xl px-5 py-3 text-sm font-bold"
                style={{ background: '#C9993A', color: '#060F1D' }}
              >
                Copy Link
              </button>
              <Link
                href={sessionUrl.replace(
                  /^https?:\/\/[^/]+/,
                  ''
                )}
                className="rounded-xl px-5 py-3 text-sm font-semibold"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                }}
              >
                View public page →
              </Link>
              <Link
                href="/faculty/live"
                className="rounded-xl px-5 py-3 text-sm font-semibold"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                  color: 'var(--text-primary)',
                }}
              >
                My sessions
              </Link>
              <Link
                href="/faculty/live/create"
                className="rounded-xl px-5 py-3 text-sm font-semibold"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)',
                }}
              >
                Create another
              </Link>
            </div>
          </motion.div>
        ) : (
          <>
            <h1 className="font-playfair mb-2 text-3xl font-bold text-[var(--text-primary)]">
              Create Live Session
            </h1>

            {/* Intent banner */}
            {intentId && intentTopic && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  background: 'rgba(74,222,128,0.08)',
                  border: '0.5px solid rgba(74,222,128,0.3)',
                }}
              >
                <span style={{ fontSize: '18px' }}>🎯</span>
                <div>
                  <p
                    style={{
                      fontSize: '13px',
                      fontWeight: '700',
                      color: '#4ADE80',
                      margin: '0 0 1px',
                    }}
                  >
                    Creating from student demand
                  </p>
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-tertiary)',
                      margin: 0,
                    }}
                  >
                    &quot;{intentTopic}&quot; · Students who declared this
                    intent get 24-hour priority booking
                  </p>
                </div>
              </div>
            )}

            {/* Progress */}
            <div className="mb-8 flex gap-1.5">
              {STEPS.map((s, i) => (
                <div
                  key={s}
                  className="h-1 flex-1 rounded-full"
                  style={{
                    background:
                      i <= stepIdx ? '#C9993A' : 'var(--border-subtle)',
                  }}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* STEP: Type */}
              {step === 'type' && (
                <motion.div
                  key="type"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">
                    What kind of session?
                  </h2>
                  <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {FORMATS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormat(f.id)}
                        className="rounded-xl p-4 text-left transition-all"
                        style={{
                          background:
                            format === f.id
                              ? 'rgba(201,153,58,0.12)'
                              : 'var(--bg-elevated)',
                          border: `1px solid ${format === f.id ? 'rgba(201,153,58,0.5)' : 'var(--bg-elevated)'}`,
                        }}
                      >
                        <span className="mb-1 block text-2xl">{f.emoji}</span>
                        <p
                          className="text-sm font-semibold"
                          style={{
                            color:
                              format === f.id
                                ? '#E5B86A'
                                : 'var(--text-secondary)',
                          }}
                        >
                          {f.label}
                        </p>
                        <p
                          className="text-[13px]"
                          style={{ color: 'var(--text-ghost)' }}
                        >
                          {f.desc}
                        </p>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setStep('content')}
                    className="w-full rounded-xl py-3.5 text-sm font-bold"
                    style={{ background: '#C9993A', color: '#060F1D' }}
                  >
                    Next &rarr;
                  </button>
                </motion.div>
              )}

              {/* STEP: Content */}
              {step === 'content' && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold"
                      style={labelStyle}
                    >
                      Title (80 chars)
                    </label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 80))}
                      placeholder="e.g. Mastering Quantum Mechanics — From Classical to Quantum"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold"
                      style={labelStyle}
                    >
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) =>
                        setDescription(e.target.value.slice(0, 500))
                      }
                      placeholder="What will students learn?"
                      rows={4}
                      className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold"
                      style={labelStyle}
                    >
                      Tags ({tags.length}/5)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {chips.map((c) => (
                        <button
                          key={c}
                          onClick={() => toggleTag(c)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all"
                          style={{
                            background: tags.includes(c)
                              ? 'rgba(201,153,58,0.2)'
                              : 'var(--bg-elevated)',
                            border: `1px solid ${tags.includes(c) ? 'rgba(201,153,58,0.5)' : 'var(--border-subtle)'}`,
                            color: tags.includes(c)
                              ? '#C9993A'
                              : 'var(--text-secondary)',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold"
                      style={labelStyle}
                    >
                      Preparation notes (optional)
                    </label>
                    <textarea
                      value={prepNotes}
                      onChange={(e) =>
                        setPrepNotes(e.target.value.slice(0, 300))
                      }
                      placeholder="What should students do before attending?"
                      rows={2}
                      className="w-full resize-none rounded-xl px-4 py-3 text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('type')}
                      className="flex-1 rounded-xl py-3 text-sm"
                      style={{
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      &larr; Back
                    </button>
                    <button
                      onClick={() => setStep('schedule')}
                      disabled={!title.trim()}
                      className="flex-1 rounded-xl py-3 text-sm font-bold disabled:opacity-40"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Schedule */}
              {step === 'schedule' && (
                <motion.div
                  key="schedule"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Schedule</h2>
                  {format === 'single' ||
                  format === 'workshop' ||
                  format === 'qa' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          className="mb-1.5 block text-xs font-semibold"
                          style={labelStyle}
                        >
                          Date &amp; time
                        </label>
                        <input
                          type="datetime-local"
                          value={singleDate}
                          onChange={(e) => setSingleDate(e.target.value)}
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={{ ...inputStyle, colorScheme: 'dark' }}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block text-xs font-semibold"
                          style={labelStyle}
                        >
                          Duration (min)
                        </label>
                        <select
                          value={singleDuration}
                          onChange={(e) =>
                            setSingleDuration(parseInt(e.target.value))
                          }
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={inputStyle}
                        >
                          <option value={30} style={{ background: 'var(--bg-elevated)' }}>
                            30 min
                          </option>
                          <option value={60} style={{ background: 'var(--bg-elevated)' }}>
                            60 min
                          </option>
                          <option value={90} style={{ background: 'var(--bg-elevated)' }}>
                            90 min
                          </option>
                          <option value={120} style={{ background: 'var(--bg-elevated)' }}>
                            120 min
                          </option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lectures.map((l, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_160px_80px] items-end gap-2"
                        >
                          <div>
                            <label
                              className="mb-1 block text-[13px]"
                              style={labelStyle}
                            >
                              Title
                            </label>
                            <input
                              value={l.title}
                              onChange={(e) =>
                                updateLecture(i, 'title', e.target.value)
                              }
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                              style={inputStyle}
                            />
                          </div>
                          <div>
                            <label
                              className="mb-1 block text-[13px]"
                              style={labelStyle}
                            >
                              Date/time
                            </label>
                            <input
                              type="datetime-local"
                              value={l.date}
                              onChange={(e) =>
                                updateLecture(i, 'date', e.target.value)
                              }
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                              style={{ ...inputStyle, colorScheme: 'dark' }}
                            />
                          </div>
                          <div>
                            <label
                              className="mb-1 block text-[13px]"
                              style={labelStyle}
                            >
                              Min
                            </label>
                            <input
                              type="number"
                              value={l.duration}
                              onChange={(e) =>
                                updateLecture(
                                  i,
                                  'duration',
                                  parseInt(e.target.value) || 60
                                )
                              }
                              className="w-full rounded-lg px-3 py-2 text-xs outline-none"
                              style={inputStyle}
                            />
                          </div>
                        </div>
                      ))}
                      {lectures.length < 10 && (
                        <button
                          onClick={addLecture}
                          className="rounded-lg px-3 py-2 text-xs font-semibold"
                          style={{
                            background: 'rgba(201,153,58,0.12)',
                            color: '#C9993A',
                          }}
                        >
                          + Add lecture
                        </button>
                      )}
                    </div>
                  )}
                  {/* Meeting link — REQUIRED */}
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold"
                      style={labelStyle}
                    >
                      Meeting link <span style={{ color: '#F87171' }}>*</span>
                    </label>
                    <input
                      type="url"
                      value={meetingLink}
                      onChange={(e) => setMeetingLink(e.target.value)}
                      placeholder="https://meet.google.com/xxx-xxxx-xxx or Zoom link"
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={inputStyle}
                      required
                    />
                    <p
                      className="mt-1 text-[9px]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      Please create your Google Meet or Zoom link with the scheduled date/time
                      first, then paste it here. Students receive this link 1 hour before
                      the session. You can update it anytime from your sessions dashboard.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('content')}
                      className="flex-1 rounded-xl py-3 text-sm"
                      style={{
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      &larr; Back
                    </button>
                    <button
                      onClick={() => setStep('pricing')}
                      className="flex-1 rounded-xl py-3 text-sm font-bold"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                    >
                      Next &rarr;
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Pricing */}
              {step === 'pricing' && (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Seats &amp; Pricing
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        className="mb-1.5 block text-xs font-semibold"
                        style={labelStyle}
                      >
                        Total seats
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={totalSeats}
                        onChange={(e) =>
                          setTotalSeats(parseInt(e.target.value) || 25)
                        }
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                      />
                      <p
                        className="mt-1 text-[9px]"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        Recommended: 15-30
                      </p>
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-xs font-semibold"
                        style={labelStyle}
                      >
                        Minimum to proceed
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={totalSeats}
                        value={minSeats}
                        onChange={(e) =>
                          setMinSeats(parseInt(e.target.value) || 1)
                        }
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      className="mb-1.5 block text-xs font-semibold"
                      style={labelStyle}
                    >
                      Price per seat ({'\u20B9'})
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={pricePerSeat}
                      onChange={(e) => {
                        const v = parseInt(e.target.value)
                        setPricePerSeat(Number.isNaN(v) ? 0 : Math.max(0, v))
                      }}
                      className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                      style={inputStyle}
                    />
                    <p
                      className="mt-1 text-[9px]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      {pricePerSeat === 0
                        ? 'Free session — students reserve a seat at no cost'
                        : `You receive 80% (₹${Math.round(pricePerSeat * 0.8)})`}
                    </p>
                    {pricePerSeat > 0 && pricePerSeat < 50 && (
                      <p
                        className="mt-1 text-[10px]"
                        style={{ color: '#F59E0B' }}
                      >
                        ₹{pricePerSeat} is below Razorpay's minimum (₹1). Use 0 for free, or ₹50+ for paid.
                      </p>
                    )}
                  </div>
                  {format === 'series' && lectures.length > 1 && (
                    <div>
                      <label
                        className="mb-1.5 block text-xs font-semibold"
                        style={labelStyle}
                      >
                        Bundle price for full series ({'\u20B9'})
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={bundlePrice}
                        onChange={(e) =>
                          setBundlePrice(parseInt(e.target.value) || 0)
                        }
                        className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                        style={inputStyle}
                      />
                      <p
                        className="mt-1 text-[9px]"
                        style={{ color: 'var(--text-ghost)' }}
                      >
                        {lectures.length} lectures {'\u00D7'} {'\u20B9'}
                        {pricePerSeat} = {'\u20B9'}
                        {pricePerSeat * lectures.length} individually.
                        {bundlePrice > 0 &&
                          ` Bundle saves students \u20B9${pricePerSeat * lectures.length - bundlePrice}.`}
                      </p>
                    </div>
                  )}
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={earlyBirdEnabled}
                      onChange={(e) => setEarlyBirdEnabled(e.target.checked)}
                      className="accent-[#C9993A]"
                    />
                    <span
                      className="text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Enable early bird pricing
                    </span>
                  </label>
                  {earlyBirdEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          className="mb-1.5 block text-xs font-semibold"
                          style={labelStyle}
                        >
                          Early bird seats
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={earlyBirdSeats}
                          onChange={(e) =>
                            setEarlyBirdSeats(parseInt(e.target.value) || 5)
                          }
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label
                          className="mb-1.5 block text-xs font-semibold"
                          style={labelStyle}
                        >
                          Early bird price ({'\u20B9'})
                        </label>
                        <input
                          type="number"
                          min={50}
                          value={earlyBirdPrice}
                          onChange={(e) =>
                            setEarlyBirdPrice(parseInt(e.target.value) || 0)
                          }
                          className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('schedule')}
                      className="flex-1 rounded-xl py-3 text-sm"
                      style={{
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      &larr; Back
                    </button>
                    <button
                      onClick={() => setStep('preview')}
                      className="flex-1 rounded-xl py-3 text-sm font-bold"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                    >
                      Preview &rarr;
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP: Preview */}
              {step === 'preview' && (
                <motion.div
                  key="preview"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-5"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    Preview &amp; Publish
                  </h2>
                  <div
                    className="rounded-xl p-5"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '0.5px solid var(--border-subtle)',
                    }}
                  >
                    <p
                      className="mb-2 text-[13px] font-bold"
                      style={{ color: '#C9993A' }}
                    >
                      {FORMATS.find((f) => f.id === format)?.emoji}{' '}
                      {FORMATS.find((f) => f.id === format)?.label}
                    </p>
                    <h3 className="mb-1 text-lg font-bold text-[var(--text-primary)]">
                      {title || 'Untitled'}
                    </h3>
                    <p
                      className="mb-3 text-xs"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {description || 'No description'}
                    </p>
                    {tags.length > 0 && (
                      <div className="mb-3 flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-2 py-0.5 text-[9px]"
                            style={{
                              background: 'rgba(201,153,58,0.12)',
                              color: '#C9993A',
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {meetingLink.trim() && (
                      <div
                        className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2.5"
                        style={{
                          background: 'rgba(96,165,250,0.08)',
                          border: '0.5px solid rgba(96,165,250,0.25)',
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>🔗</span>
                        <p
                          className="truncate text-[13px]"
                          style={{ color: '#93C5FD' }}
                        >
                          {meetingLink.trim()}
                        </p>
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div>
                        <p className="text-lg font-bold text-[var(--text-primary)]">
                          {totalSeats}
                        </p>
                        <p
                          className="text-[9px]"
                          style={{ color: 'var(--text-ghost)' }}
                        >
                          seats
                        </p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-[var(--text-primary)]">
                          {pricePerSeat === 0 ? 'Free' : `\u20B9${pricePerSeat}`}
                        </p>
                        <p
                          className="text-[9px]"
                          style={{ color: 'var(--text-ghost)' }}
                        >
                          per seat
                        </p>
                      </div>
                      <div>
                        <p
                          className="text-lg font-bold"
                          style={{ color: '#4ADE80' }}
                        >
                          {pricePerSeat === 0 ? '—' : `\u20B9${Math.round(pricePerSeat * 0.8)}`}
                        </p>
                        <p
                          className="text-[9px]"
                          style={{ color: 'var(--text-ghost)' }}
                        >
                          you earn
                        </p>
                      </div>
                    </div>
                  </div>
                  {publishError && (
                    <div
                      className="mb-3 rounded-lg px-4 py-3 text-sm"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#F87171',
                      }}
                    >
                      <strong style={{ fontWeight: 700 }}>Publish failed:</strong>{' '}
                      {publishError}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setStep('pricing')}
                      className="flex-1 rounded-xl py-3 text-sm"
                      style={{
                        color: 'var(--text-tertiary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      &larr; Edit
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={saving || !title.trim() || !meetingLink.trim()}
                      className="flex-1 rounded-xl py-3.5 text-sm font-bold disabled:opacity-40"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                      title={!meetingLink.trim() ? 'Please add a meeting link first' : undefined}
                    >
                      {saving
                        ? 'Publishing...'
                        : !meetingLink.trim()
                          ? 'Add meeting link first'
                          : 'Publish Session \u{1F680}'}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </main>
  )
}
