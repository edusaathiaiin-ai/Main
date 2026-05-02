'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

type LiveSessionRow = {
  id: string
  title: string
  session_format: string
  total_seats: number
  seats_booked: number
  price_per_seat_paise: number
  status: string
  created_at: string
  meeting_link: string | null
  meeting_link_shared_at: string | null
  // enriched
  next_scheduled_at: string | null
  student_name: string | null
}

type TabId = 'active' | 'upcoming' | 'completed' | 'drafts'

// ─── Inline meeting-link editor per session card ──────────────────────────────

function MeetingLinkEditor({
  session,
  onSaved,
}: {
  session: LiveSessionRow
  onSaved: (sessionId: string, link: string) => void
}) {
  const { profile } = useAuthStore()
  const [open,    setOpen]    = useState(false)
  const [link,    setLink]    = useState(session.meeting_link ?? '')
  const [saving,  setSaving]  = useState(false)
  const [result,  setResult]  = useState<{ notified: number } | null>(null)
  const [error,   setError]   = useState('')

  async function handleShare() {
    if (!link.trim()) { setError('Paste a meeting link first.'); return }
    try { new URL(link.trim()) } catch { setError('Invalid URL — paste a full link starting with https://'); return }

    setSaving(true)
    setError('')
    setResult(null)

    try {
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.getSession()
      if (!authSession?.access_token) throw new Error('Session expired')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-meeting-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${authSession.access_token}`,
          },
          body: JSON.stringify({ sessionId: session.id, meetingLink: link.trim() }),
        }
      )
      const json = await res.json() as { success?: boolean; notified?: number; error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Failed to share link')

      setResult({ notified: json.notified ?? 0 })
      onSaved(session.id, link.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          fontSize: '13px', fontWeight: 600,
          color: session.meeting_link ? '#4ADE80' : '#C9993A',
          background: session.meeting_link ? 'rgba(74,222,128,0.08)' : 'rgba(201,153,58,0.1)',
          border: `0.5px solid ${session.meeting_link ? 'rgba(74,222,128,0.25)' : 'rgba(201,153,58,0.3)'}`,
          borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
        }}
      >
        {session.meeting_link ? '🔗 Update meeting link' : '+ Add meeting link'}
      </button>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: '12px', padding: '14px 16px', borderRadius: '12px',
        background: 'var(--bg-elevated)',
        border: '0.5px solid var(--border-subtle)',
      }}
    >
      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
        🔗 Meeting link — shared instantly with all enrolled students via email + WhatsApp
      </p>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          value={link}
          onChange={(e) => { setLink(e.target.value); setError('') }}
          placeholder="https://meet.google.com/xxx or Zoom link"
          style={{
            flex: 1, background: 'var(--bg-elevated)',
            border: error ? '1px solid rgba(239,68,68,0.5)' : '0.5px solid var(--border-subtle)',
            color: 'var(--text-primary)', borderRadius: '8px', padding: '8px 12px',
            fontSize: '13px', outline: 'none', fontFamily: 'var(--font-mono)',
          }}
        />
        <button
          onClick={handleShare}
          disabled={saving}
          style={{
            padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
            background: saving ? 'rgba(201,153,58,0.4)' : '#C9993A',
            color: '#060F1D', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {saving ? 'Sharing…' : 'Share now'}
        </button>
        <button
          onClick={() => { setOpen(false); setError(''); setResult(null) }}
          style={{
            padding: '8px 10px', borderRadius: '8px', fontSize: '13px',
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--border-subtle)',
            color: 'var(--text-tertiary)', cursor: 'pointer',
          }}
        >
          ✕
        </button>
      </div>
      {error && (
        <p style={{ fontSize: '13px', color: '#FCA5A5', marginTop: '6px' }}>⚠️ {error}</p>
      )}
      {result && (
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ fontSize: '13px', color: '#4ADE80', marginTop: '6px' }}
        >
          ✓ Link shared with {result.notified} student{result.notified !== 1 ? 's' : ''} via email + WhatsApp
        </motion.p>
      )}
    </motion.div>
  )
}

// ─── Cancel session button + modal ────────────────────────────────────────────

function CancelSessionTrigger({
  sessionId,
  title,
  nextScheduledAt,
  onCancelled,
}: {
  sessionId: string
  title: string
  nextScheduledAt: string | null
  onCancelled: () => void
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr] = useState('')

  const startMs = nextScheduledAt ? new Date(nextScheduledAt).getTime() : null
  const minutesToStart = startMs ? Math.round((startMs - Date.now()) / 60_000) : null
  const hardBlock = minutesToStart !== null && minutesToStart < 60

  async function handleSubmit() {
    setErr('')
    if (reason.trim().length < 10) {
      setErr('Reason must be at least 10 characters — students deserve a real explanation.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/faculty/live-sessions/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, reason: reason.trim() }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Cancellation failed')
      setOpen(false)
      setReason('')
      onCancelled()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          marginTop: '8px',
          marginLeft: '8px',
          padding: '8px 14px',
          borderRadius: '10px',
          background: 'transparent',
          border: '0.5px solid rgba(239,68,68,0.35)',
          color: '#DC2626',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Cancel session
      </button>

      {open && (
        <div
          onClick={() => !submitting && setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(11, 31, 58, 0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px', width: '100%',
              background: 'var(--bg-surface)', borderRadius: '16px',
              border: '0.5px solid var(--border-subtle)',
              padding: '24px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
            }}
          >
            <h3 className="font-display" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              Cancel this session?
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '18px' }}>
              {title}
            </p>

            {hardBlock ? (
              <>
                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.6, marginBottom: '6px' }}>
                    <strong>You can't cancel within 1 hour of start time.</strong>
                  </p>
                  <p style={{ fontSize: '13px', color: '#991B1B', lineHeight: 1.6 }}>
                    Please take the session, or email admin immediately with your reason.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setOpen(false)}
                    style={{
                      padding: '9px 14px', borderRadius: '10px',
                      background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)',
                      color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <a
                    href={`mailto:admin@edusaathiai.in?subject=${encodeURIComponent(`Urgent cancellation: ${title}`)}&body=${encodeURIComponent(`Session ID: ${sessionId}\nReason: `)}`}
                    style={{
                      padding: '9px 14px', borderRadius: '10px',
                      background: '#DC2626', color: '#fff', textDecoration: 'none',
                      fontSize: '13px', fontWeight: 700,
                    }}
                  >
                    Email admin
                  </a>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '12px' }}>
                  Every paid student will be refunded in full and emailed to claim their refund.
                  <br />
                  <strong style={{ color: '#B91C1C' }}>You will receive no payout for this session.</strong>
                </p>
                <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Reason (visible to students, 10–500 chars)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value.slice(0, 500))}
                  rows={4}
                  placeholder="Be honest — students deserve a real explanation."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                    background: 'var(--bg-base)', border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)', fontSize: '13px',
                    fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                  }}
                />
                {err && <p style={{ fontSize: '12px', color: '#B91C1C', marginTop: '8px' }}>{err}</p>}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    style={{
                      padding: '9px 14px', borderRadius: '10px',
                      background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)',
                      color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600,
                      cursor: submitting ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Keep session
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || reason.trim().length < 10}
                    style={{
                      padding: '9px 14px', borderRadius: '10px',
                      background: '#DC2626', color: '#fff', border: 'none',
                      fontSize: '13px', fontWeight: 700,
                      cursor: submitting || reason.trim().length < 10 ? 'not-allowed' : 'pointer',
                      opacity: submitting || reason.trim().length < 10 ? 0.5 : 1,
                    }}
                  >
                    {submitting ? 'Cancelling…' : 'Cancel session'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default function FacultyLiveDashboard() {
  const { profile } = useAuthStore()
  const [sessions, setSessions] = useState<LiveSessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('active')

  useEffect(() => {
    if (!profile) return
    void load()
  }, [profile])

  async function load() {
    const supabase = createClient()

    const { data: raw } = await supabase
      .from('live_sessions')
      .select(
        'id, title, session_format, total_seats, seats_booked, price_per_seat_paise, status, created_at, meeting_link, meeting_link_shared_at'
      )
      .eq('faculty_id', profile!.id)
      .order('created_at', { ascending: false })

    const rows = (raw ?? []) as (LiveSessionRow)[]

    if (rows.length > 0) {
      const ids = rows.map((r) => r.id)

      // Enrichment 1 — next scheduled lecture per session
      const { data: lectures } = await supabase
        .from('live_lectures')
        .select('session_id, scheduled_at')
        .in('session_id', ids)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })

      const nextLecture: Record<string, string> = {}
      ;(lectures ?? []).forEach((l: { session_id: string; scheduled_at: string }) => {
        if (!nextLecture[l.session_id]) nextLecture[l.session_id] = l.scheduled_at
      })

      // Enrichment 2 — paid student name (for 1:1 sessions)
      const { data: bookings } = await supabase
        .from('live_bookings')
        .select('session_id, student_id')
        .in('session_id', ids)
        .eq('payment_status', 'paid')

      const studentIds = [...new Set((bookings ?? []).map((b: { student_id: string }) => b.student_id))]
      const studentName: Record<string, string> = {}

      if (studentIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', studentIds)
        const profileMap: Record<string, string> = {}
        ;(profiles ?? []).forEach((p: { id: string; full_name: string | null }) => {
          if (p.full_name) profileMap[p.id] = p.full_name
        })
        ;(bookings ?? []).forEach((b: { session_id: string; student_id: string }) => {
          if (profileMap[b.student_id]) studentName[b.session_id] = profileMap[b.student_id]
        })
      }

      rows.forEach((r) => {
        r.next_scheduled_at = nextLecture[r.id] ?? null
        r.student_name      = studentName[r.id] ?? null
      })
    }

    setSessions(rows)
    setLoading(false)
  }

  function handleMeetingLinkSaved(sessionId: string, link: string) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, meeting_link: link, meeting_link_shared_at: new Date().toISOString() }
          : s
      )
    )
  }

  const active = sessions.filter((s) => s.status === 'published')
  const completed = sessions.filter((s) => s.status === 'completed')
  const drafts = sessions.filter(
    (s) => s.status === 'draft' || s.status === 'pending_review'
  )
  const tabMap: Record<TabId, LiveSessionRow[]> = {
    active,
    upcoming: active,
    completed,
    drafts,
  }

  const totalEarned = completed.reduce(
    (a, s) => a + Math.round(s.seats_booked * s.price_per_seat_paise * 0.8),
    0
  )
  const totalStudents = sessions.reduce((a, s) => a + s.seats_booked, 0)

  if (!profile) return null

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
          href="/faculty"
          className="font-display text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/faculty/earnings"
            className="rounded-lg px-3 py-2 text-xs font-semibold"
            style={{
              background: 'var(--bg-elevated)',
              border: '0.5px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
            }}
          >
            ₹ Earnings
          </Link>
          <Link
            href="/faculty/live/create"
            className="rounded-lg px-4 py-2 text-xs font-semibold"
            style={{
              background: '#C9993A',
              color: '#060F1D',
              textDecoration: 'none',
            }}
          >
            + Create Session
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-display mb-2 text-3xl font-bold text-[var(--text-primary)]">
          Live Sessions
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Manage your group lectures and workshops
        </p>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            {
              label: 'Active sessions',
              value: active.length,
              color: '#4ADE80',
            },
            {
              label: 'Students reached',
              value: totalStudents,
              color: '#60A5FA',
            },
            {
              label: 'Total earned',
              value: `\u20B9${(totalEarned / 100).toLocaleString('en-IN')}`,
              color: '#C9993A',
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-4"
              style={{
                background: 'var(--bg-elevated)',
                border: '0.5px solid var(--border-subtle)',
              }}
            >
              <p
                className="text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {s.label}
              </p>
              <p className="text-xl font-bold" style={{ color: s.color }}>
                {s.value}
              </p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div
          className="mb-6 flex w-fit gap-1 rounded-xl p-1"
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--bg-elevated)',
          }}
        >
          {(['active', 'completed', 'drafts'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="rounded-lg px-4 py-2 text-xs font-medium capitalize transition-all"
              style={{
                background: tab === t ? '#C9993A' : 'transparent',
                color: tab === t ? 'var(--bg-base)' : 'var(--text-tertiary)',
              }}
            >
              {t} ({tabMap[t].length})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-subtle)]"
              style={{ borderTopColor: '#C9993A' }}
            />
          </div>
        ) : tabMap[tab].length === 0 ? (
          <div className="py-16 text-center">
            <p
              className="mb-4 text-sm"
              style={{ color: 'var(--text-ghost)' }}
            >
              No {tab} sessions
            </p>
            <Link
              href="/faculty/live/create"
              className="rounded-lg px-5 py-2.5 text-xs font-semibold"
              style={{
                background: '#C9993A',
                color: '#060F1D',
                textDecoration: 'none',
              }}
            >
              Create your first session &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {tabMap[tab].map((s) => {
              const revenue = s.seats_booked * s.price_per_seat_paise
              const payout = Math.round(revenue * 0.8)
              const pct =
                s.total_seats > 0 ? (s.seats_booked / s.total_seats) * 100 : 0
              return (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl p-5"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '0.5px solid var(--border-subtle)',
                  }}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--text-primary)]">
                        {s.title}
                      </h3>
                      <p
                        className="text-[13px]"
                        style={{ color: 'var(--text-tertiary)' }}
                      >
                        {s.session_format} &middot;{' '}
                        {new Date(s.created_at).toLocaleDateString('en-IN')}
                      </p>
                      {s.next_scheduled_at && (
                        <p className="text-[13px] mt-0.5" style={{ color: '#C9993A' }}>
                          📅{' '}
                          {new Date(s.next_scheduled_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata', weekday: 'short',
                            day: 'numeric', month: 'short',
                            hour: '2-digit', minute: '2-digit', hour12: true,
                          })} IST
                        </p>
                      )}
                      {s.student_name && s.session_format === 'single' && (
                        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          👤 {s.student_name}
                        </p>
                      )}
                    </div>
                    <span
                      className="rounded-full px-2 py-0.5 text-[13px] font-bold"
                      style={{
                        background:
                          s.status === 'published'
                            ? 'rgba(74,222,128,0.12)'
                            : s.status === 'draft'
                              ? 'rgba(234,179,8,0.12)'
                              : 'var(--bg-elevated)',
                        color:
                          s.status === 'published'
                            ? '#4ADE80'
                            : s.status === 'draft'
                              ? '#FACC15'
                              : 'var(--text-tertiary)',
                      }}
                    >
                      {s.status}
                    </span>
                  </div>
                  {/* Seat bar */}
                  <div className="mb-3">
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {s.seats_booked}/{s.total_seats} seats
                      </span>
                      <span style={{ color: 'var(--text-tertiary)' }}>
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full"
                      style={{ background: 'var(--bg-elevated)' }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background:
                            pct >= 80
                              ? '#F87171'
                              : pct >= 50
                                ? '#FBBF24'
                                : '#4ADE80',
                        }}
                      />
                    </div>
                  </div>
                  {s.status === 'completed' && (
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/faculty/live/${s.id}/notes`}
                        className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                        style={{
                          background: 'rgba(201,153,58,0.12)',
                          border: '0.5px solid rgba(201,153,58,0.25)',
                          color: '#C9993A',
                          textDecoration: 'none',
                        }}
                      >
                        📒 Share notes
                      </Link>
                      {s.seats_booked > 0 && (
                        <Link
                          href={`/faculty/live/${s.id}/audience`}
                          className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '0.5px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                            textDecoration: 'none',
                          }}
                        >
                          👥 Audience ({s.seats_booked})
                        </Link>
                      )}
                    </div>
                  )}
                  {s.status === 'published' && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p
                          className="text-xs"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {'\u20B9'}
                          {(revenue / 100).toLocaleString('en-IN')} collected
                          &middot; {'\u20B9'}
                          {(payout / 100).toLocaleString('en-IN')} your payout
                        </p>
                        {s.seats_booked > 0 && (
                          <Link
                            href={`/faculty/live/${s.id}/audience`}
                            className="rounded-lg px-3 py-1.5 text-[13px] font-semibold"
                            style={{
                              background: 'rgba(201,153,58,0.12)',
                              border: '0.5px solid rgba(201,153,58,0.25)',
                              color: '#C9993A',
                              textDecoration: 'none',
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {'\u{1F465}'} View Audience ({s.seats_booked})
                          </Link>
                        )}
                      </div>
                      <MeetingLinkEditor
                        session={s}
                        onSaved={handleMeetingLinkSaved}
                      />
                      {/* Enter Classroom — faculty goes live */}
                      <Link
                        href={`/classroom/${s.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '8px',
                          padding: '8px 16px',
                          borderRadius: '10px',
                          background: '#C9993A',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontWeight: 700,
                          textDecoration: 'none',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        🎓 Enter Classroom
                      </Link>
                      {s.meeting_link_shared_at && (
                        <p style={{ fontSize: '9px', color: 'var(--text-ghost)', marginTop: '6px' }}>
                          Last shared{' '}
                          {new Date(s.meeting_link_shared_at).toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata', day: 'numeric',
                            month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
                          })} IST
                        </p>
                      )}
                      <CancelSessionTrigger
                        sessionId={s.id}
                        title={s.title}
                        nextScheduledAt={s.next_scheduled_at}
                        onCancelled={() => {
                          setSessions((prev) =>
                            prev.map((row) =>
                              row.id === s.id ? { ...row, status: 'cancelled' } : row,
                            ),
                          )
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
