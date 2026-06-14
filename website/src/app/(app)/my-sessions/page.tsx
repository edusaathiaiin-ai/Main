'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

type SessionRow = {
  id: string
  faculty_id: string
  session_type: string
  topic: string
  confirmed_slot: string | null
  status: string
  fee_paise: number
  meeting_link: string | null
  student_confirmed_at: string | null
  created_at: string
}

type FacultyInfo = { full_name: string; city: string | null }

type LiveBookingRow = {
  id: string
  session_id: string
  booking_type: string
  amount_paid_paise: number
  payment_status: string
  created_at: string
  live_sessions: {
    id: string
    title: string
    description: string
    faculty_id: string
    meeting_link: string | null
    status: string
  } | null
}

export default function MySessionsPage() {
  const { profile } = useAuthStore()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [liveBookings, setLiveBookings] = useState<LiveBookingRow[]>([])
  const [liveLecturesMap, setLiveLecturesMap] = useState<Record<string, string>>({})
  const [facultyMap, setFacultyMap] = useState<Record<string, FacultyInfo>>({})
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'upcoming' | 'pending' | 'past'>('upcoming')
  const [confirming, setConfirming] = useState<string | null>(null)
  const [paying, setPaying] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      // 1. Fetch 1:1 sessions
      const { data: sessData } = await supabase
        .from('faculty_sessions')
        .select('*')
        .eq('student_id', profile!.id)
        .order('created_at', { ascending: false })
      const rows = (sessData ?? []) as SessionRow[]
      setSessions(rows)

      // 2. Fetch live bookings
      const { data: bookData } = await supabase
        .from('live_bookings')
        .select(`
          id,
          session_id,
          booking_type,
          amount_paid_paise,
          payment_status,
          created_at,
          live_sessions (
            id,
            title,
            description,
            faculty_id,
            meeting_link,
            status
          )
        `)
        .eq('student_id', profile!.id)
        .order('created_at', { ascending: false })
      const bookings = (bookData ?? []) as unknown as LiveBookingRow[]
      setLiveBookings(bookings)

      // 3. Fetch scheduled lecture times for bookings
      const bookedSessionIds = bookings.map((b) => b.session_id).filter(Boolean)
      if (bookedSessionIds.length > 0) {
        const { data: lecData } = await supabase
          .from('live_lectures')
          .select('session_id, scheduled_at')
          .in('session_id', bookedSessionIds)
          .eq('status', 'scheduled')
          .order('scheduled_at')
        
        const lecMap: Record<string, string> = {}
        ;(lecData ?? []).forEach((l) => {
          if (!lecMap[l.session_id]) {
            lecMap[l.session_id] = l.scheduled_at
          }
        })
        setLiveLecturesMap(lecMap)
      }

      // 4. Fetch faculty names
      const ids = [
        ...new Set([
          ...rows.map((s) => s.faculty_id),
          ...bookings.map((b) => b.live_sessions?.faculty_id).filter(Boolean) as string[]
        ])
      ]
      if (ids.length > 0) {
        const { data: fData } = await supabase
          .from('profiles')
          .select('id, full_name, city')
          .in('id', ids)
        const map: Record<string, FacultyInfo> = {}
        ;(fData ?? []).forEach(
          (f: { id: string; full_name: string; city: string | null }) => {
            map[f.id] = { full_name: f.full_name, city: f.city }
          }
        )
        setFacultyMap(map)
      }
      setLoading(false)
    }
    load()
  }, [profile])

  const upcoming1to1 = sessions.filter((s) =>
    ['accepted', 'paid', 'confirmed'].includes(s.status)
  )
  const pending1to1 = sessions.filter((s) => s.status === 'requested')
  const past1to1 = sessions.filter((s) =>
    ['completed', 'reviewed', 'declined', 'cancelled', 'disputed'].includes(
      s.status
    )
  )

  const upcomingLive = liveBookings.filter((b) =>
    b.payment_status === 'paid' &&
    b.live_sessions &&
    !['completed', 'cancelled'].includes(b.live_sessions.status)
  )
  const pendingLive = liveBookings.filter((b) => b.payment_status === 'pending')
  const pastLive = liveBookings.filter((b) =>
    ['refunded', 'failed'].includes(b.payment_status) ||
    (b.live_sessions && ['completed', 'cancelled'].includes(b.live_sessions.status))
  )

  // Map 1:1 sessions to unified view
  const unified1to1 = (rowsList: SessionRow[]) => rowsList.map((s) => ({
    id: s.id,
    isGroupLive: false,
    title: s.topic,
    facultyId: s.faculty_id,
    confirmedSlot: s.confirmed_slot,
    status: s.status,
    feePaise: s.fee_paise,
    meetingLink: s.meeting_link,
    createdAt: s.created_at,
    raw1to1: s,
  }))

  // Map live bookings to unified view
  const unifiedLive = (rowsList: LiveBookingRow[]) => rowsList.map((b) => ({
    id: b.id,
    isGroupLive: true,
    title: b.live_sessions?.title ?? 'Live Group Lecture',
    facultyId: b.live_sessions?.faculty_id ?? '',
    confirmedSlot: b.session_id ? liveLecturesMap[b.session_id] ?? null : null,
    status: b.payment_status,
    feePaise: b.amount_paid_paise,
    meetingLink: b.live_sessions?.meeting_link ?? null,
    createdAt: b.created_at,
    rawGroup: b,
  }))

  const upcomingMerged = [
    ...unified1to1(upcoming1to1),
    ...unifiedLive(upcomingLive),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const pendingMerged = [
    ...unified1to1(pending1to1),
    ...unifiedLive(pendingLive),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const pastMerged = [
    ...unified1to1(past1to1),
    ...unifiedLive(pastLive),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  async function payForSession(session: SessionRow) {
    setPaying(session.id)
    const supabase = createClient()
    const {
      data: { session: authSession },
    } = await supabase.auth.getSession()

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
      )
      const order = (await res.json()) as {
        orderId?: string
        amount?: number
        currency?: string
        keyId?: string
        error?: string
      }
      if (!order.orderId || !order.keyId)
        throw new Error(order.error ?? 'Order creation failed')

      // Load Razorpay checkout script dynamically (idempotent — skip if already loaded)
      await new Promise<void>((resolve, reject) => {
        if ((window as unknown as Record<string, unknown>).Razorpay) {
          resolve()
          return
        }
        const existing = document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        )
        if (existing) {
          const poll = setInterval(() => {
            if ((window as unknown as Record<string, unknown>).Razorpay) {
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
        script.onerror = () =>
          reject(new Error('Razorpay script failed to load'))
        document.body.appendChild(script)
        setTimeout(() => reject(new Error('Razorpay load timeout')), 10000)
      })

      const fac = facultyMap[session.faculty_id]

      // Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rzp = new (window as any).Razorpay({
          key: order.keyId,
          order_id: order.orderId,
          amount: order.amount,
          currency: order.currency ?? 'INR',
          name: 'EdUsaathiAI',
          description: session.topic,
          prefill: { name: profile?.full_name ?? '' },
          theme: { color: '#C9993A' },
          handler: () => {
            // Webhook will update the DB; optimistically reflect in UI
            setSessions((prev) =>
              prev.map((s) =>
                s.id === session.id ? { ...s, status: 'paid' } : s
              )
            )
            resolve()
          },
          modal: {
            ondismiss: () => reject(new Error('cancelled')),
          },
        })
        rzp.open()
      })
    } catch (err) {
      if (err instanceof Error && err.message !== 'cancelled') {
        console.error('payForSession error', err.message)
      }
    } finally {
      setPaying(null)
    }
  }

  async function confirmSession(sessionId: string) {
    setConfirming(sessionId)
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const res = await fetch(
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
    )
    if (res.ok) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: 'completed',
                student_confirmed_at: new Date().toISOString(),
              }
            : s
        )
      )
    }
    setConfirming(null)
  }

  if (!profile) return null

  const tabSessions =
    tab === 'upcoming' ? upcomingMerged : tab === 'pending' ? pendingMerged : pastMerged

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)',
      }}
    >
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}
      >
        <Link
          href="/chat"
          className="font-playfair text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/chat"
          className="text-sm"
          style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}
        >
          &larr; Back to Chat
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-playfair mb-2 text-3xl font-bold" style={{ color: '#FFFFFF' }}>
          My Sessions
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Your 1:1 and group live session bookings
        </p>

        {/* Tabs */}
        <div
          className="mb-6 flex w-fit gap-1 rounded-xl p-1"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.08)',
          }}
        >
          {[
            {
              id: 'upcoming' as const,
              label: 'Upcoming',
              count: upcomingMerged.length,
            },
            { id: 'pending' as const, label: 'Pending', count: pendingMerged.length },
            { id: 'past' as const, label: 'Past', count: pastMerged.length },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="rounded-lg px-4 py-2 text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? '#C9993A' : 'transparent',
                color: tab === t.id ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              }}
            >
              {t.label} {t.count > 0 && `(${t.count})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-white/10"
              style={{ borderTopColor: '#C9993A' }}
            />
          </div>
        ) : tabSessions.length === 0 ? (
          <div className="py-20 text-center">
            <p
              className="mb-4 text-sm"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              No {tab} sessions
            </p>
            <Link
              href="/faculty-finder"
              className="rounded-lg px-4 py-2 text-xs font-semibold"
              style={{
                background: '#C9993A',
                color: '#FFFFFF',
                textDecoration: 'none',
              }}
            >
              Find Faculty &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tabSessions.map((s) => {
              const fac = facultyMap[s.facultyId]
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '0.5px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="mb-2 flex items-start justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                          {fac?.full_name ?? 'Faculty'}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[9px] font-bold"
                          style={{
                            background: s.isGroupLive
                              ? 'rgba(59,130,246,0.15)'
                              : 'rgba(192,132,252,0.15)',
                            color: s.isGroupLive ? '#60A5FA' : '#C084FC',
                          }}
                        >
                          {s.isGroupLive ? 'Group Live' : '1:1 Session'}
                        </span>
                      </div>
                      <p
                        className="text-[10px]"
                        style={{ color: 'rgba(255,255,255,0.4)' }}
                      >
                        {fac?.city}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      style={{
                        background:
                          s.status === 'requested' || s.status === 'pending'
                            ? 'rgba(234,179,8,0.12)'
                            : s.status === 'declined' || s.status === 'failed' || s.status === 'refunded'
                              ? 'rgba(239,68,68,0.12)'
                              : 'rgba(74,222,128,0.12)',
                        color:
                          s.status === 'requested' || s.status === 'pending'
                            ? '#FACC15'
                            : s.status === 'declined' || s.status === 'failed' || s.status === 'refunded'
                              ? '#F87171'
                              : '#4ADE80',
                      }}
                    >
                      {s.status}
                    </span>
                  </div>

                  <p className="mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{s.title}</p>

                  {s.confirmedSlot && (
                    <p className="mb-2 text-xs font-semibold" style={{ color: '#4ADE80' }}>
                      {s.isGroupLive ? 'Next Lecture: ' : 'Scheduled slot: '}
                      {new Date(s.confirmedSlot).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                  )}

                  {/* Pay to confirm slot — only for 1:1 sessions */}
                  {!s.isGroupLive && s.raw1to1 && s.status === 'accepted' && (
                    <div
                      className="mt-3 rounded-xl p-4"
                      style={{
                        background: 'rgba(201,153,58,0.08)',
                        border: '0.5px solid rgba(201,153,58,0.25)',
                      }}
                    >
                      <p
                        className="mb-3 text-xs"
                        style={{ color: '#E5B86A', lineHeight: 1.6 }}
                      >
                        ✓ {fac?.full_name ?? 'Faculty'}{' '}
                        accepted your request. Pay now to confirm your slot.
                      </p>
                      <button
                        onClick={() => payForSession(s.raw1to1!)}
                        disabled={paying === s.id}
                        className="w-full rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
                        style={{ background: '#C9993A', color: '#FFFFFF' }}
                      >
                        {paying === s.id
                          ? 'Opening payment…'
                          : `Pay ₹${(s.feePaise / 100).toLocaleString('en-IN')} to confirm slot →`}
                      </button>
                    </div>
                  )}

                  {s.meetingLink &&
                    ['paid', 'confirmed'].includes(s.status) && (
                      <a
                        href={s.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-2 inline-block rounded-lg px-3 py-1.5 text-xs font-semibold"
                        style={{
                          background: 'rgba(99,102,241,0.12)',
                          color: '#818CF8',
                          textDecoration: 'none',
                        }}
                      >
                        Join Meeting &rarr;
                      </a>
                    )}

                  {/* Confirm session happened — only for 1:1 sessions */}
                  {!s.isGroupLive && s.status === 'completed' && s.raw1to1 && !s.raw1to1.student_confirmed_at && (
                    <button
                      onClick={() => confirmSession(s.id)}
                      disabled={confirming === s.id}
                      className="mt-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: '#C9993A', color: '#FFFFFF' }}
                    >
                      {confirming === s.id
                        ? 'Confirming...'
                        : 'Confirm Session Happened'}
                    </button>
                  )}

                  <div
                    className="mt-3 flex items-center justify-between pt-3"
                    style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      Booked on {new Date(s.createdAt).toLocaleDateString('en-IN')}
                    </span>
                    <span className="text-sm font-bold" style={{ color: '#FFFFFF' }}>
                      {'\u20B9'}
                      {(s.feePaise / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
