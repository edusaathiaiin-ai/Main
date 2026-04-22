'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'

type SessionDetail = {
  id: string
  faculty_id: string
  vertical_id: string
  title: string
  description: string
  preparation_notes: string | null
  tags: string[]
  session_format: string
  price_per_seat_paise: number
  bundle_price_paise: number | null
  early_bird_price_paise: number | null
  early_bird_seats: number | null
  total_seats: number
  seats_booked: number
  min_seats: number
  status: string
  meeting_platform: string | null
  meeting_link: string | null
  meeting_link_shared_at: string | null
}

type LectureRow = {
  id: string
  lecture_number: number
  title: string
  scheduled_at: string
  duration_minutes: number
  status: string
}
type FacultyInfo = {
  full_name: string
  institution_name: string
  designation: string | null
  verification_status: string
  session_bio: string | null
}

function formatFee(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`
}

export default function LiveSessionDetailPage() {
  const params = useParams()
  const sessionId = params.id as string
  const { profile } = useAuthStore()

  const [session, setSession] = useState<SessionDetail | null>(null)
  const [lectures, setLectures] = useState<LectureRow[]>([])
  const [faculty, setFaculty] = useState<FacultyInfo | null>(null)
  const [seatsBooked, setSeatsBooked] = useState(0)
  const [seatsUpdated, setSeatsUpdated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)
  const [selectedLectures, setSelectedLectures] = useState<Set<string>>(
    new Set()
  )
  const [bookingMode, setBookingMode] = useState<'full' | 'single'>('full')
  const [countdown, setCountdown] = useState('')
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      const { data: sess } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()
      if (!sess) {
        setLoading(false)
        return
      }
      setSession(sess as unknown as SessionDetail)
      setSeatsBooked(sess.seats_booked)

      const { data: lecs } = await supabase
        .from('live_lectures')
        .select(
          'id, lecture_number, title, scheduled_at, duration_minutes, status'
        )
        .eq('session_id', sessionId)
        .order('lecture_number')
      setLectures((lecs ?? []) as LectureRow[])

      // Faculty info
      const { data: fData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', sess.faculty_id)
        .single()
      const { data: fpData } = await supabase
        .from('faculty_profiles')
        .select(
          'institution_name, designation, verification_status, session_bio'
        )
        .eq('user_id', sess.faculty_id)
        .single()
      setFaculty({
        full_name: fData?.full_name ?? 'Faculty',
        ...((fpData as {
          institution_name: string
          designation: string | null
          verification_status: string
          session_bio: string | null
        } | null) ?? {
          institution_name: '',
          designation: null,
          verification_status: 'pending',
          session_bio: null,
        }),
      })

      // Check if already booked
      if (profile) {
        const { data: existing } = await supabase
          .from('live_bookings')
          .select('id')
          .eq('session_id', sessionId)
          .eq('student_id', profile.id)
          .maybeSingle()
        if (existing) setBooked(true)
      }
      setLoading(false)
    }
    load()

    // Realtime seat counter
    const channel = supabase
      .channel(`live-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newSeats = (payload.new as { seats_booked: number })
            .seats_booked
          setSeatsBooked(newSeats)
          setSeatsUpdated(true)
          setTimeout(() => setSeatsUpdated(false), 1000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, profile])

  // ── Countdown to next lecture ───────────────��────────────────────────────────
  useEffect(() => {
    if (!lectures.length) return

    const nextLecture = lectures
      .filter((l) => new Date(l.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

    if (!nextLecture) { setCountdown(''); return }

    function tick() {
      const diff = new Date(nextLecture.scheduled_at).getTime() - Date.now()
      if (diff <= 0) { setCountdown('Starting now'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (d > 0) setCountdown(`${d}d ${h}h ${m}m`)
      else if (h > 0) setCountdown(`${h}h ${m}m ${s}s`)
      else setCountdown(`${m}m ${s}s`)
    }

    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => { if (countdownRef.current) clearInterval(countdownRef.current) }
  }, [lectures])

  function ensureRazorpayLoaded(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        resolve()
        return
      }
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      )
      if (existing) {
        const poll = setInterval(() => {
          if (window.Razorpay) {
            clearInterval(poll)
            resolve()
          }
        }, 100)
        setTimeout(() => {
          clearInterval(poll)
          reject(new Error('Razorpay load timeout'))
        }, 10000)
        return
      }
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Razorpay script failed to load'))
      document.body.appendChild(script)
      setTimeout(() => reject(new Error('Razorpay load timeout')), 10000)
    })
  }

  async function handleBook() {
    if (!profile || !session || booking) return
    setBooking(true)
    setBookError(null)

    try {
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.refreshSession()
      if (!authSession?.access_token) {
        setBookError('Please sign in again to complete your booking.')
        setBooking(false)
        return
      }

      // ── FREE session path — skip Razorpay entirely ──
      // Faculty can set price=0 to offer a free session; we re-verify
      // server-side (book-free-session refuses to book paid sessions).
      if (session.price_per_seat_paise === 0) {
        const freeRes = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/book-free-session`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authSession.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            },
            body: JSON.stringify({
              sessionId: session.id,
              bookingType: bookingMode,
              lectureIds: bookingMode === 'single' ? [...selectedLectures] : [],
            }),
          },
        )
        const freeJson = (await freeRes.json()) as {
          bookingId?: string
          seatsBooked?: number
          totalSeats?: number
          error?: string
        }
        if (!freeRes.ok || !freeJson.bookingId) {
          const map: Record<string, string> = {
            sold_out: 'This session just sold out. Try another one.',
            already_booked: 'You have already booked this session.',
            session_not_bookable: 'This session is no longer open.',
          }
          setBookError(map[freeJson.error ?? ''] ?? freeJson.error ?? 'Could not reserve your seat.')
          setBooking(false)
          return
        }
        setBooked(true)
        if (typeof freeJson.seatsBooked === 'number') setSeatsBooked(freeJson.seatsBooked)
        setBooking(false)
        return
      }

      // ── PAID path ──
      await ensureRazorpayLoaded()

      // Step 1 — server computes price + creates Razorpay order
      const orderRes = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-booking-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authSession.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            sessionId: session.id,
            bookingType: bookingMode,
            lectureIds: bookingMode === 'single' ? [...selectedLectures] : [],
          }),
        },
      )
      const orderJson = (await orderRes.json()) as {
        orderId?: string
        amount?: number
        currency?: string
        keyId?: string
        priceType?: 'standard' | 'early_bird' | 'bundle'
        error?: string
      }

      if (!orderRes.ok || !orderJson.orderId) {
        const map: Record<string, string> = {
          sold_out: 'This session just sold out. Try another one.',
          already_booked: 'You have already booked this session.',
        }
        setBookError(map[orderJson.error ?? ''] ?? orderJson.error ?? 'Could not create payment order.')
        setBooking(false)
        return
      }

      // Step 2 — open Razorpay checkout
      const rzp = new window.Razorpay({
        key: orderJson.keyId ?? process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
        amount: orderJson.amount ?? 0,
        currency: orderJson.currency ?? 'INR',
        order_id: orderJson.orderId,
        name: 'EdUsaathiAI',
        description: session.title,
        prefill: {
          name: profile.full_name ?? '',
          email: profile.email ?? '',
        },
        theme: { color: '#C9993A' },
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id: string
          razorpay_signature: string
        }) => {
          // Step 3 — verify and reserve seat atomically
          try {
            const verifyRes = await fetch(
              `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/verify-live-booking`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authSession.access_token}`,
                  apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
                },
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                  sessionId: session.id,
                  bookingType: bookingMode,
                  lectureIds: bookingMode === 'single' ? [...selectedLectures] : [],
                  priceType: orderJson.priceType ?? 'standard',
                  amountPaise: orderJson.amount,
                }),
              },
            )
            const verifyJson = (await verifyRes.json()) as {
              bookingId?: string
              seatsBooked?: number
              totalSeats?: number
              error?: string
            }
            if (!verifyRes.ok || !verifyJson.bookingId) {
              const map: Record<string, string> = {
                sold_out: 'Session filled while you were paying. Your payment will be refunded within 5-7 days. Please contact support.',
                already_booked: 'You already have a booking for this session.',
                session_not_bookable: 'This session is no longer open.',
              }
              setBookError(map[verifyJson.error ?? ''] ?? 'Payment verification failed. Contact support@edusaathiai.in with your payment ID.')
              setBooking(false)
              return
            }
            setBooked(true)
            if (typeof verifyJson.seatsBooked === 'number') setSeatsBooked(verifyJson.seatsBooked)
          } catch (err) {
            console.error('verify-live-booking call failed', err)
            setBookError('Payment confirmed but confirmation failed. Contact support@edusaathiai.in with your payment ID.')
          } finally {
            setBooking(false)
          }
        },
        modal: {
          ondismiss: () => {
            setBooking(false)
          },
        },
      })
      rzp.open()
    } catch (err) {
      console.error('handleBook failed', err)
      setBookError(
        err instanceof Error && (err.message.includes('timeout') || err.message.includes('load'))
          ? 'Payment could not load. Please refresh and try again.'
          : 'Booking failed. Please try again.'
      )
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-white/10"
          style={{ borderTopColor: '#C9993A' }}
        />
      </main>
    )
  }

  if (!session) {
    return (
      <main
        className="flex min-h-screen items-center justify-center"
        style={{ background: 'var(--bg-base)' }}
      >
        <div className="text-center">
          <p className="mb-4 text-5xl">{'\u{1F4FA}'}</p>
          <h2 className="font-playfair mb-2 text-2xl text-white">
            Session not found
          </h2>
          <Link href="/live" style={{ color: '#C9993A' }}>
            &larr; Back to Live
          </Link>
        </div>
      </main>
    )
  }

  const saathi = SAATHIS.find((s) => s.id === toSlug(session.vertical_id))
  const color = saathi?.primary ?? '#C9993A'
  const isFull = seatsBooked >= session.total_seats
  const remaining = session.total_seats - seatsBooked
  const pct = (seatsBooked / session.total_seats) * 100
  const urgencyColor = pct >= 80 ? '#F87171' : pct >= 50 ? '#FBBF24' : '#4ADE80'

  const earlyBirdActive =
    session.early_bird_seats &&
    session.early_bird_price_paise &&
    seatsBooked < session.early_bird_seats
  const earlyBirdRemaining = earlyBirdActive
    ? session.early_bird_seats! - seatsBooked
    : 0

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <Link
          href="/live"
          className="font-playfair text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/live"
          className="text-sm"
          style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          &larr; All Sessions
        </Link>
      </nav>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="grid gap-8 md:grid-cols-[1fr_360px]">
          {/* LEFT: Details */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Format badge */}
              <div className="mb-3 flex items-center gap-2">
                <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                <span
                  className="text-[10px] font-bold tracking-wider uppercase"
                  style={{ color: '#F87171' }}
                >
                  Live
                </span>
                <span
                  className="rounded-lg px-2 py-0.5 text-[10px]"
                  style={{ background: `${color}12`, color }}
                >
                  {saathi?.emoji} {saathi?.name}
                </span>
              </div>

              <h1 className="font-playfair mb-3 text-3xl font-bold text-white">
                {session.title}
              </h1>

              {/* Faculty */}
              {faculty && (
                <div className="mb-6 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
                    style={{
                      background: `${color}20`,
                      border: `2px solid ${color}40`,
                    }}
                  >
                    {saathi?.emoji ?? '\u{1F393}'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {faculty.full_name}
                      {faculty.verification_status === 'verified' && (
                        <span
                          className="ml-1 text-[9px]"
                          style={{ color: '#4ADE80' }}
                        >
                          {'\u2713'} Verified
                        </span>
                      )}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {faculty.designation} &middot; {faculty.institution_name}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Meeting link card — shown only to enrolled students ── */}
              {booked && session.meeting_link && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-6 rounded-2xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(74,222,128,0.08), rgba(74,222,128,0.03))',
                    border: '1px solid rgba(74,222,128,0.3)',
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🔗</span>
                      <p className="text-sm font-bold text-white">Your meeting link</p>
                    </div>
                    {countdown && (
                      <div
                        className="rounded-full px-3 py-1 text-xs font-bold"
                        style={{
                          background: 'rgba(201,153,58,0.15)',
                          border: '0.5px solid rgba(201,153,58,0.4)',
                          color: '#C9993A',
                          fontFamily: 'DM Mono, monospace',
                        }}
                      >
                        ⏱ {countdown}
                      </div>
                    )}
                  </div>
                  {(() => {
                    const now = Date.now()
                    const inClassroomWindow = lectures.some((l) => {
                      const start = new Date(l.scheduled_at).getTime()
                      const end = start + l.duration_minutes * 60000
                      return now >= start - 10 * 60000 && now <= end
                    })
                    if (inClassroomWindow) {
                      return (
                        <Link
                          href={`/classroom/${sessionId}`}
                          className="mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90"
                          style={{ background: '#4ADE80', color: '#060F1D', textDecoration: 'none' }}
                        >
                          <span>Enter Classroom →</span>
                        </Link>
                      )
                    }
                    return (
                      <a
                        href={session.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-opacity hover:opacity-90"
                        style={{ background: '#4ADE80', color: '#060F1D', textDecoration: 'none' }}
                      >
                        <span>Join Session →</span>
                      </a>
                    )
                  })()}
                  <p
                    className="truncate text-[10px]"
                    style={{ color: 'var(--text-ghost)', fontFamily: 'DM Mono, monospace' }}
                  >
                    {session.meeting_link}
                  </p>
                  {session.meeting_link_shared_at && (
                    <p className="mt-1 text-[9px]" style={{ color: 'var(--text-ghost)' }}>
                      Shared by faculty on{' '}
                      {new Date(session.meeting_link_shared_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata', day: 'numeric',
                        month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
                      })} IST
                    </p>
                  )}
                </motion.div>
              )}

              {/* Link pending — enrolled but no link yet */}
              {booked && !session.meeting_link && (
                <div
                  className="mb-6 rounded-2xl p-4"
                  style={{
                    background: 'rgba(201,153,58,0.06)',
                    border: '0.5px solid rgba(201,153,58,0.2)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span>⏳</span>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      Your meeting link will appear here once faculty shares it.
                      You&apos;ll also receive it via email and WhatsApp.
                    </p>
                  </div>
                  {countdown && (
                    <p className="mt-2 text-xs font-semibold" style={{ color: '#C9993A' }}>
                      Session starts in {countdown}
                    </p>
                  )}
                </div>
              )}

              {/* Description */}
              <div
                className="mb-6 rounded-xl p-5"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--bg-elevated)',
                }}
              >
                <h3 className="mb-2 text-sm font-semibold text-white">
                  About this session
                </h3>
                <p
                  className="text-xs leading-relaxed"
                  style={{
                    color: 'var(--text-secondary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {session.description}
                </p>
              </div>

              {/* Lecture schedule */}
              {lectures.length > 0 && (
                <div className="mb-6">
                  <h3 className="mb-3 text-sm font-semibold text-white">
                    Schedule
                  </h3>
                  <div className="space-y-2">
                    {lectures.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-4 rounded-xl p-4"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '0.5px solid var(--bg-elevated)',
                        }}
                      >
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{ background: `${color}20`, color }}
                        >
                          {l.lecture_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {l.title}
                          </p>
                          <p
                            className="text-[10px]"
                            style={{ color: 'var(--text-tertiary)' }}
                          >
                            {new Date(l.scheduled_at).toLocaleDateString(
                              'en-IN',
                              {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                            {' \u00B7 '}
                            {l.duration_minutes} min
                          </p>
                        </div>
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            background:
                              l.status === 'completed'
                                ? 'rgba(74,222,128,0.12)'
                                : 'var(--bg-elevated)',
                            color:
                              l.status === 'completed'
                                ? '#4ADE80'
                                : 'var(--text-tertiary)',
                          }}
                        >
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preparation notes */}
              {session.preparation_notes && (
                <div
                  className="mb-6 rounded-xl p-5"
                  style={{
                    background: 'rgba(201,153,58,0.05)',
                    border: '0.5px solid rgba(201,153,58,0.2)',
                  }}
                >
                  <h3
                    className="mb-2 text-sm font-semibold"
                    style={{ color: '#C9993A' }}
                  >
                    Before you attend
                  </h3>
                  <p
                    className="text-xs leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {session.preparation_notes}
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* RIGHT: Booking widget */}
          <div className="self-start md:sticky md:top-4">
            {booked ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl p-6 text-center"
                style={{
                  background: 'rgba(74,222,128,0.06)',
                  border: '1px solid rgba(74,222,128,0.25)',
                }}
              >
                <p className="mb-3 text-4xl">{'\u{1F389}'}</p>
                <h3 className="font-playfair mb-2 text-xl font-bold text-white">
                  Seat booked!
                </h3>
                <p
                  className="mb-4 text-xs"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Meeting link will be shared 24h before the session.
                </p>
                <Link
                  href="/my-sessions"
                  className="rounded-lg px-4 py-2 text-xs font-semibold"
                  style={{
                    background: '#C9993A',
                    color: '#060F1D',
                    textDecoration: 'none',
                  }}
                >
                  View My Sessions &rarr;
                </Link>
              </motion.div>
            ) : (
              <div
                className="overflow-hidden rounded-2xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-medium)',
                }}
              >
                <div className="p-5">
                  {/* Seat counter */}
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: urgencyColor }}
                      >
                        {isFull
                          ? '\u{1F525} Fully booked'
                          : pct >= 80
                            ? `\u{1F525} Only ${remaining} seats left!`
                            : `${remaining} seats available`}
                      </span>
                      <motion.span
                        className="text-xs font-bold"
                        animate={
                          seatsUpdated
                            ? {
                                scale: [1, 1.3, 1],
                                color: ['#fff', '#C9993A', '#fff'],
                              }
                            : {}
                        }
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {seatsBooked}/{session.total_seats}
                      </motion.span>
                    </div>
                    <div
                      className="h-2 overflow-hidden rounded-full"
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        animate={{ width: `${Math.min(100, pct)}%` }}
                        style={{ background: urgencyColor }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>

                  {/* Early bird */}
                  {earlyBirdActive && (
                    <div
                      className="mb-4 rounded-lg p-3"
                      style={{
                        background: 'rgba(251,146,60,0.08)',
                        border: '0.5px solid rgba(251,146,60,0.25)',
                      }}
                    >
                      <p
                        className="text-xs font-bold"
                        style={{ color: '#FB923C' }}
                      >
                        {'\u26A1'} Early bird:{' '}
                        {formatFee(session.early_bird_price_paise!)}
                      </p>
                      <p
                        className="text-[10px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {earlyBirdRemaining} early bird seats left
                      </p>
                    </div>
                  )}

                  {/* Booking mode */}
                  {lectures.length > 1 && session.bundle_price_paise && (
                    <div className="mb-4 space-y-2">
                      <button
                        onClick={() => setBookingMode('full')}
                        className="w-full rounded-xl p-3 text-left transition-all"
                        style={{
                          background:
                            bookingMode === 'full'
                              ? `${color}15`
                              : 'var(--bg-elevated)',
                          border: `1px solid ${bookingMode === 'full' ? `${color}50` : 'var(--bg-elevated)'}`,
                        }}
                      >
                        <div className="flex justify-between">
                          <span
                            className="text-xs font-semibold"
                            style={{
                              color:
                                bookingMode === 'full'
                                  ? color
                                  : 'var(--text-secondary)',
                            }}
                          >
                            Full Series ({lectures.length} lectures)
                          </span>
                          <span className="text-xs font-bold text-white">
                            {formatFee(session.bundle_price_paise)}
                          </span>
                        </div>
                        <p
                          className="mt-0.5 text-[9px]"
                          style={{ color: '#4ADE80' }}
                        >
                          Save{' '}
                          {formatFee(
                            session.price_per_seat_paise * lectures.length -
                              session.bundle_price_paise
                          )}
                        </p>
                      </button>
                      <button
                        onClick={() => setBookingMode('single')}
                        className="w-full rounded-xl p-3 text-left transition-all"
                        style={{
                          background:
                            bookingMode === 'single'
                              ? `${color}15`
                              : 'var(--bg-elevated)',
                          border: `1px solid ${bookingMode === 'single' ? `${color}50` : 'var(--bg-elevated)'}`,
                        }}
                      >
                        <span
                          className="text-xs font-semibold"
                          style={{
                            color:
                              bookingMode === 'single'
                                ? color
                                : 'var(--text-secondary)',
                          }}
                        >
                          Individual lectures &mdash;{' '}
                          {formatFee(session.price_per_seat_paise)} each
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Individual lecture selection */}
                  {bookingMode === 'single' && lectures.length > 1 && (
                    <div className="mb-4 space-y-1.5">
                      {lectures.map((l) => (
                        <label
                          key={l.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg p-2"
                          style={{
                            background: selectedLectures.has(l.id)
                              ? 'var(--bg-elevated)'
                              : 'transparent',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedLectures.has(l.id)}
                            onChange={() =>
                              setSelectedLectures((prev) => {
                                const n = new Set(prev)
                                if (n.has(l.id)) n.delete(l.id)
                                else n.add(l.id)
                                return n
                              })
                            }
                            className="accent-[#C9993A]"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs text-white">
                              {l.title}
                            </p>
                            <p
                              className="text-[9px]"
                              style={{ color: 'var(--text-ghost)' }}
                            >
                              {new Date(l.scheduled_at).toLocaleDateString(
                                'en-IN',
                                { day: 'numeric', month: 'short' }
                              )}
                            </p>
                          </div>
                          <span className="text-xs font-bold text-white">
                            {formatFee(session.price_per_seat_paise)}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {bookError && (
                    <div
                      className="mb-3 rounded-lg px-3 py-2 text-xs"
                      style={{
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#F87171',
                        lineHeight: 1.5,
                      }}
                    >
                      {bookError}
                    </div>
                  )}
                  {/* Book CTA */}
                  <button
                    onClick={handleBook}
                    disabled={
                      booking ||
                      isFull ||
                      (bookingMode === 'single' && selectedLectures.size === 0)
                    }
                    className="w-full rounded-xl py-3.5 text-sm font-bold transition-all disabled:opacity-40"
                    style={{
                      background: isFull ? 'var(--border-medium)' : color,
                      color: isFull ? 'var(--text-secondary)' : '#0B1F3A',
                    }}
                  >
                    {(() => {
                      const isFree = session.price_per_seat_paise === 0
                      if (booking) {
                        return isFree ? 'Reserving…' : 'Opening Razorpay…'
                      }
                      if (isFull) return 'Fully Booked'
                      if (isFree) return 'Reserve Free Seat'
                      if (bookingMode === 'full') {
                        return `Book Seat \u2014 ${formatFee(earlyBirdActive ? session.early_bird_price_paise! : (session.bundle_price_paise ?? session.price_per_seat_paise))}`
                      }
                      return `Book ${selectedLectures.size} lecture${selectedLectures.size !== 1 ? 's' : ''} \u2014 ${formatFee(session.price_per_seat_paise * selectedLectures.size)}`
                    })()}
                  </button>
                </div>

                {/* Trust signals */}
                <div
                  className="space-y-2 px-5 py-4"
                  style={{ borderTop: '0.5px solid var(--bg-elevated)' }}
                >
                  {(session.price_per_seat_paise === 0
                    ? [
                        { icon: '\u2713', text: 'Free session — no payment needed' },
                        { icon: '\u2713', text: 'Meeting link shared 24h before' },
                        { icon: '\u2713', text: 'Seat reserved the moment you click' },
                      ]
                    : [
                        { icon: '\u2713', text: 'Full refund if session cancelled' },
                        { icon: '\u2713', text: 'Meeting link shared 24h before' },
                        { icon: '\u2713', text: 'Payment secure via Razorpay' },
                      ]
                  ).map((t) => (
                    <p
                      key={t.text}
                      className="flex items-start gap-2 text-[10px]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      <span style={{ color: '#4ADE80' }}>{t.icon}</span>
                      {t.text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
