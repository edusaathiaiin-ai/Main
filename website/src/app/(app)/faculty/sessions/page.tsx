'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import Link from 'next/link'

type SessionRow = {
  id: string
  student_id: string
  session_type: string
  topic: string
  student_message: string | null
  proposed_slots: string[]
  confirmed_slot: string | null
  status: string
  fee_paise: number
  faculty_payout_paise: number
  payout_status: string
  meeting_link: string | null
  created_at: string
  student_name?: string
}

type TabId = 'pending' | 'upcoming' | 'completed' | 'history'

export default function FacultySessionsPage() {
  const { profile } = useAuthStore()
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<TabId>('pending')
  const [meetingLinks, setMeetingLinks] = useState<Record<string, string>>({})
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from('faculty_sessions')
      .select('*')
      .eq('faculty_id', profile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setSessions((data ?? []) as SessionRow[])
        setLoading(false)
      })
  }, [profile])

  const pending = sessions.filter((s) => s.status === 'requested')
  const upcoming = sessions.filter((s) =>
    ['accepted', 'paid', 'confirmed'].includes(s.status)
  )
  const completed = sessions.filter((s) => s.status === 'completed')
  const history = sessions.filter((s) =>
    ['reviewed', 'declined', 'cancelled'].includes(s.status)
  )

  const tabSessions: Record<TabId, SessionRow[]> = {
    pending,
    upcoming,
    completed,
    history,
  }

  async function handleAction(
    sessionId: string,
    action: 'accept' | 'decline',
    slot?: string
  ) {
    setActionLoading(sessionId)
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const token = session?.access_token ?? ''

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
    )

    if (res.ok) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: action === 'accept' ? 'accepted' : 'declined',
                confirmed_slot: slot ?? null,
              }
            : s
        )
      )
    }
    setActionLoading(null)
  }

  async function saveMeetingLink(sessionId: string) {
    const link = meetingLinks[sessionId]
    if (!link?.trim()) return
    const supabase = createClient()
    await supabase
      .from('faculty_sessions')
      .update({ meeting_link: link.trim() })
      .eq('id', sessionId)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, meeting_link: link.trim() } : s
      )
    )
  }

  async function markCompleted(sessionId: string) {
    setActionLoading(sessionId)
    const supabase = createClient()
    await supabase
      .from('faculty_sessions')
      .update({
        status: 'completed',
        faculty_confirmed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, status: 'completed' } : s))
    )
    setActionLoading(null)
  }

  if (!profile) return null

  const TABS: { id: TabId; label: string; count: number }[] = [
    { id: 'pending', label: 'Pending', count: pending.length },
    { id: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { id: 'completed', label: 'Completed', count: completed.length },
    { id: 'history', label: 'History', count: history.length },
  ]

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
          className="font-playfair text-xl font-bold"
          style={{ color: '#C9993A', textDecoration: 'none' }}
        >
          EdUsaathiAI
        </Link>
        <Link
          href="/faculty"
          className="text-sm"
          style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}
        >
          &larr; Dashboard
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-8">
        <h1 className="font-playfair mb-2 text-3xl font-bold text-[var(--text-primary)]">
          My Sessions
        </h1>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          Manage your 1:1 student sessions
        </p>

        {/* Tabs */}
        <div
          className="mb-6 flex w-fit gap-1 rounded-xl p-1"
          style={{
            background: 'var(--bg-elevated)',
            border: '0.5px solid var(--bg-elevated)',
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="rounded-lg px-4 py-2 text-xs font-medium transition-all"
              style={{
                background: tab === t.id ? '#C9993A' : 'transparent',
                color: tab === t.id ? 'var(--bg-base)' : 'var(--text-tertiary)',
              }}
            >
              {t.label}{' '}
              {t.count > 0 && (
                <span className="ml-1 opacity-70">({t.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Sessions */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-subtle)]"
              style={{ borderTopColor: '#C9993A' }}
            />
          </div>
        ) : tabSessions[tab].length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm" style={{ color: 'var(--text-ghost)' }}>
              No {tab} sessions
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tabSessions[tab].map((s) => (
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
                    <span
                      className="mr-2 rounded-full px-2 py-0.5 text-[13px] font-bold"
                      style={{
                        background:
                          s.session_type === 'doubt'
                            ? 'rgba(99,102,241,0.12)'
                            : s.session_type === 'research'
                              ? 'rgba(74,222,128,0.12)'
                              : 'rgba(251,146,60,0.12)',
                        color:
                          s.session_type === 'doubt'
                            ? '#818CF8'
                            : s.session_type === 'research'
                              ? '#4ADE80'
                              : '#FB923C',
                      }}
                    >
                      {s.session_type}
                    </span>
                    <span
                      className="text-[13px]"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      {new Date(s.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {'\u20B9'}
                    {(s.faculty_payout_paise / 100).toLocaleString('en-IN')}
                  </span>
                </div>

                <p className="mb-1 text-sm text-[var(--text-primary)]">{s.topic}</p>
                {s.student_message && (
                  <p
                    className="mb-3 text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    {s.student_message}
                  </p>
                )}

                {/* Pending: accept/decline */}
                {s.status === 'requested' && (
                  <div className="mt-3 space-y-2">
                    <p
                      className="text-[13px] font-semibold"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      Proposed slots:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(s.proposed_slots ?? []).map((slot, i) => (
                        <button
                          key={i}
                          onClick={() => handleAction(s.id, 'accept', slot)}
                          disabled={actionLoading === s.id}
                          className="rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                          style={{
                            background: 'rgba(74,222,128,0.12)',
                            border: '1px solid rgba(74,222,128,0.3)',
                            color: '#4ADE80',
                          }}
                        >
                          Accept:{' '}
                          {new Date(slot).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => handleAction(s.id, 'decline')}
                      disabled={actionLoading === s.id}
                      className="rounded-lg px-3 py-2 text-xs transition-all disabled:opacity-50"
                      style={{
                        color: '#F87171',
                        border: '1px solid rgba(244,63,94,0.2)',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}

                {/* Upcoming: meeting link + mark complete */}
                {['accepted', 'paid', 'confirmed'].includes(s.status) && (
                  <div className="mt-3 space-y-2">
                    {s.confirmed_slot && (
                      <p className="text-xs" style={{ color: '#4ADE80' }}>
                        Confirmed:{' '}
                        {new Date(s.confirmed_slot).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Paste Zoom/Meet link"
                        value={meetingLinks[s.id] ?? s.meeting_link ?? ''}
                        onChange={(e) =>
                          setMeetingLinks((prev) => ({
                            ...prev,
                            [s.id]: e.target.value,
                          }))
                        }
                        className="flex-1 rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      />
                      <button
                        onClick={() => saveMeetingLink(s.id)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold"
                        style={{
                          background: 'rgba(201,153,58,0.15)',
                          color: '#C9993A',
                        }}
                      >
                        Save
                      </button>
                    </div>
                    <button
                      onClick={() => markCompleted(s.id)}
                      disabled={actionLoading === s.id}
                      className="rounded-lg px-4 py-2 text-xs font-semibold transition-all disabled:opacity-50"
                      style={{ background: '#C9993A', color: '#060F1D' }}
                    >
                      Mark Session Complete
                    </button>
                  </div>
                )}

                {/* Completed: payout status */}
                {s.status === 'completed' && (
                  <div className="mt-3">
                    <p
                      className="text-xs"
                      style={{
                        color:
                          s.payout_status === 'released'
                            ? '#4ADE80'
                            : '#FACC15',
                      }}
                    >
                      {s.payout_status === 'released'
                        ? `Payment released: \u20B9${(s.faculty_payout_paise / 100).toLocaleString('en-IN')}`
                        : 'Awaiting student confirmation (auto-release in 48h)'}
                    </p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
