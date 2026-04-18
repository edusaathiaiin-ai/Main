'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'
import Link from 'next/link'
import { ClassroomRoomProvider } from '@/components/classroom/ClassroomRoomProvider'
import { FormulaBar } from '@/components/classroom/FormulaBar'
import { CommandBar } from '@/components/classroom/CommandBar'
import { CanvasOverlay } from '@/components/classroom/CanvasOverlay'
import { ClassroomDivider } from '@/components/classroom/ClassroomDivider'
import { ModeSwitch, ModeSyncBridge } from '@/components/classroom/ModeSwitch'
import { NoteBuilder } from '@/components/classroom/NoteBuilder'
import { StudentAskPanel, FacultyQuestionQueue } from '@/components/classroom/QuestionQueue'
import type { HomeworkItem } from '@/components/classroom/QuestionQueue'
import { SourceBadge } from '@/components/classroom/SourceBadge'
import { useArtifactLog } from '@/hooks/useArtifactLog'
import { AutoQueryProvider } from '@/lib/classroom-plugins/AutoQueryContext'
import type { ResearchArtifact } from '@/hooks/useArtifactLog'
import type { SaathiPlugin } from '@/lib/classroom-plugins/types'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

type SessionRow = {
  id: string
  faculty_id: string
  vertical_id: string
  title: string
  description: string
  session_format: string
  status: string
  total_seats: number
  seats_booked: number
  delivery_type: 'external' | 'in_app'
  external_url: string | null
  classroom_mode: string | null
  meeting_link: string | null
  meeting_platform: string | null
  started_at: string | null
  ended_at: string | null
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
}

type ClassroomState = 'loading' | 'not_found' | 'not_booked' | 'lobby' | 'live' | 'summary'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Helpers                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

function formatCountdown(diffMs: number): string {
  if (diffMs <= 0) return 'Starting now'
  const d = Math.floor(diffMs / 86400000)
  const h = Math.floor((diffMs % 86400000) / 3600000)
  const m = Math.floor((diffMs % 3600000) / 60000)
  const s = Math.floor((diffMs % 60000) / 1000)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m ${s}s`
  return `${m}m ${s}s`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main Component                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function ClassroomPage() {
  const params = useParams()
  const sessionId = params.id as string
  const { profile } = useAuthStore()

  const [state, setState] = useState<ClassroomState>('loading')
  const [session, setSession] = useState<SessionRow | null>(null)
  const [lectures, setLectures] = useState<LectureRow[]>([])
  const [faculty, setFaculty] = useState<FacultyInfo | null>(null)
  const [countdown, setCountdown] = useState('')
  const [elapsed, setElapsed] = useState('')
  const [participantCount, setParticipantCount] = useState(0)
  const [sessionDuration, setSessionDuration] = useState(0)
  const [rating, setRating] = useState<'up' | 'down' | null>(null)
  const [classroomMode, setClassroomMode] = useState<'standard' | 'interactive'>('standard')
  const [plugin, setPlugin] = useState<SaathiPlugin | null>(null)
  const [pendingToolLoad, setPendingToolLoad] = useState<{ tool: string; params: Record<string, unknown> } | null>(null)
  const [activeTab, setActiveTab] = useState<string>('')
  const [panelRatio, setPanelRatio] = useState(40) // left panel % width
  const [notesOpen, setNotesOpen] = useState(false)
  const [questionsOpen, setQuestionsOpen] = useState(false)
  const [homeworkItems, setHomeworkItems] = useState<HomeworkItem[]>([])
  const [homeworkSending, setHomeworkSending] = useState(false)
  const [homeworkSent, setHomeworkSent] = useState(false)
  const [sessionQuestions, setSessionQuestions] = useState<{ text: string; studentName: string; timestamp: string }[]>([])

  const { emit: emitArtifact } = useArtifactLog(sessionId)

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const joinedAtRef = useRef<string | null>(null)

  // ── Load session data ──────────────────────────────────────────────────

  useEffect(() => {
    // Don't re-run load if user has already joined or left
    if (state === 'live' || state === 'summary') return

    const supabase = createClient()

    async function load() {
      const { data: sess } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single()

      if (!sess) {
        setState('not_found')
        return
      }

      const s = sess as unknown as SessionRow
      setSession(s)

      // Restore saved classroom mode from DB
      if (s.classroom_mode === 'interactive' || s.classroom_mode === 'standard') {
        setClassroomMode(s.classroom_mode as 'standard' | 'interactive')
      }

      // Fetch lectures
      const { data: lecs } = await supabase
        .from('live_lectures')
        .select('id, lecture_number, title, scheduled_at, duration_minutes, status')
        .eq('session_id', sessionId)
        .order('lecture_number')

      setLectures((lecs ?? []) as LectureRow[])

      // Fetch faculty info
      const { data: fData } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', s.faculty_id)
        .single()

      const { data: fpData } = await supabase
        .from('faculty_profiles')
        .select('institution_name, designation, verification_status')
        .eq('user_id', s.faculty_id)
        .maybeSingle()

      setFaculty({
        full_name: fData?.full_name ?? 'Faculty',
        institution_name: (fpData as unknown as { institution_name: string } | null)?.institution_name ?? '',
        designation: (fpData as unknown as { designation: string | null } | null)?.designation ?? null,
        verification_status: (fpData as unknown as { verification_status: string } | null)?.verification_status ?? 'pending',
      })

      // Check if user is booked for this session
      if (!profile) {
        setState('not_booked')
        return
      }

      // Faculty always has access to their own session
      if (profile.id === s.faculty_id) {
        setState(s.ended_at ? 'summary' : 'lobby')
        return
      }

      const { data: booking } = await supabase
        .from('live_bookings')
        .select('id')
        .eq('session_id', sessionId)
        .eq('student_id', profile.id)
        .maybeSingle()

      if (!booking) {
        setState('not_booked')
        return
      }

      setState(s.ended_at ? 'summary' : 'lobby')
    }

    load()
  }, [sessionId, profile, state])

  // ── Countdown to next lecture ──────────────────────────────────────────

  useEffect(() => {
    if (!lectures.length) return

    const nextLecture = lectures
      .filter((l) => new Date(l.scheduled_at) > new Date())
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

    if (!nextLecture) {
      setCountdown('')
      return
    }

    function tick() {
      const diff = new Date(nextLecture.scheduled_at).getTime() - Date.now()
      setCountdown(formatCountdown(diff))
    }

    tick()
    countdownRef.current = setInterval(tick, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [lectures])

  // ── Elapsed timer (live state) ─────────────────────────────────────────

  useEffect(() => {
    if (state !== 'live' || !joinedAtRef.current) return

    function tick() {
      const diff = Date.now() - new Date(joinedAtRef.current!).getTime()
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setElapsed(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }

    tick()
    elapsedRef.current = setInterval(tick, 1000)
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [state])

  // ── Realtime presence count ────────────────────────────────────────────

  useEffect(() => {
    if (state !== 'live') return
    const supabase = createClient()

    async function fetchCount() {
      const { count } = await supabase
        .from('classroom_presence')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .is('left_at', null)
      setParticipantCount(count ?? 0)
    }

    fetchCount()

    const channel = supabase
      .channel(`classroom-presence-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'classroom_presence',
          filter: `session_id=eq.${sessionId}`,
        },
        () => fetchCount()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [state, sessionId])

  // ── Join session ───────────────────────────────────────────────────────

  const handleJoin = useCallback(async () => {
    if (!profile || !session) return

    const supabase = createClient()
    joinedAtRef.current = new Date().toISOString()

    // Record presence
    await supabase.from('classroom_presence').upsert(
      {
        session_id: sessionId,
        user_id: profile.id,
        role: profile.id === session.faculty_id ? 'faculty' : 'student',
        joined_at: joinedAtRef.current,
        device_type: /Mobi/.test(navigator.userAgent) ? 'mobile' : 'desktop',
      },
      { onConflict: 'session_id,user_id' }
    )

    // Load subject plugin for interactive mode
    if (classroomMode === 'interactive' && session.vertical_id) {
      try {
        const slug = toSlug(session.vertical_id) ?? 'default'
        const { loadPlugin } = await import('@/lib/classroom-plugins')
        const loaded = await loadPlugin(slug)
        setPlugin(loaded)
      } catch (err) {
        console.error('[Classroom] Plugin load failed, falling back to default:', err)
        const { loadPlugin } = await import('@/lib/classroom-plugins')
        const fallback = await loadPlugin('default')
        setPlugin(fallback)
      }
    }

    setState('live')
  }, [profile, session, sessionId, classroomMode])

  // ── Leave session ──────────────────────────────────────────────────────

  const handleLeave = useCallback(async () => {
    if (!profile) return

    const supabase = createClient()
    const leftAt = new Date().toISOString()

    // Update presence
    await supabase
      .from('classroom_presence')
      .update({ left_at: leftAt })
      .eq('session_id', sessionId)
      .eq('user_id', profile.id)

    // Calculate duration
    if (joinedAtRef.current) {
      const dur = Math.round(
        (new Date(leftAt).getTime() - new Date(joinedAtRef.current).getTime()) / 60000
      )
      setSessionDuration(dur)
    }

    // ── Persist notes + canvas state to session_artifacts ──
    try {
      const notesHtml = localStorage.getItem(`classroom-notes-${sessionId}`) ?? ''
      const artifacts: Record<string, unknown> = {}

      if (notesHtml) {
        const tempDiv = document.createElement('div')
        tempDiv.innerHTML = notesHtml
        artifacts.session_notes = {
          html: notesHtml,
          plain_text: tempDiv.textContent ?? '',
          saved_at: leftAt,
        }
      }

      // Capture canvas state from Liveblocks localStorage cache
      try {
        const canvasKey = `liveblocks:classroom-${sessionId}`
        const canvasData = localStorage.getItem(canvasKey)
        if (canvasData) artifacts.canvas_snapshot = JSON.parse(canvasData)
      } catch { /* canvas capture is best-effort */ }

      if (Object.keys(artifacts).length > 0) {
        await supabase
          .from('live_sessions')
          .update({ session_artifacts: artifacts })
          .eq('id', sessionId)
      }
    } catch { /* artifacts save is best-effort */ }

    // ── Persist question log to classroom_commands ──
    if (sessionQuestions.length > 0) {
      try {
        const rows = sessionQuestions.map(q => ({
          session_id: sessionId,
          user_id: profile.id,
          command_text: q.text,
          tool_triggered: 'question',
          tool_query: `${q.studentName}: ${q.text}`,
          created_at: q.timestamp,
        }))
        await supabase.from('classroom_commands').insert(rows)
      } catch { /* question log is best-effort */ }
    }

    // ── Persist homework items (faculty only) ──
    if (profile.id === session?.faculty_id && homeworkItems.length > 0) {
      try {
        const rows = homeworkItems.map(item => ({
          session_id: sessionId,
          faculty_id: profile.id,
          student_name: item.studentName,
          question_text: item.text,
          status: 'draft',
          due_date: item.dueDate ?? null,
        }))
        await supabase.from('homework').insert(rows)
      } catch { /* homework save is best-effort */ }
    }

    // ── Archive session (faculty only — creates research_archives + updates soul) ──
    if (profile.id === session?.faculty_id) {
      try {
        await fetch('/api/classroom/archive-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
      } catch { /* archive is best-effort */ }
    }

    setState('summary')
  }, [profile, session, sessionId, sessionQuestions, homeworkItems])

  // ── Mid-session mode switch ───────────────────────────────────────────

  const handleModeChange = useCallback(async (mode: 'standard' | 'interactive') => {
    if (mode === classroomMode) return
    setClassroomMode(mode)

    // Load plugin when switching to interactive
    if (mode === 'interactive' && session?.vertical_id && !plugin) {
      try {
        const slug = toSlug(session.vertical_id) ?? 'default'
        const { loadPlugin } = await import('@/lib/classroom-plugins')
        const loaded = await loadPlugin(slug)
        setPlugin(loaded)
      } catch {
        const { loadPlugin } = await import('@/lib/classroom-plugins')
        const fallback = await loadPlugin('default')
        setPlugin(fallback)
      }
    }

    // Faculty saves to DB
    if (profile?.id === session?.faculty_id) {
      const supabase = createClient()
      await supabase
        .from('live_sessions')
        .update({ classroom_mode: mode })
        .eq('id', sessionId)
    }
  }, [classroomMode, session, sessionId, profile, plugin])

  // ── Derived values ─────────────────────────────────────────────────────

  const saathi = session ? SAATHIS.find((s) => s.id === toSlug(session.vertical_id)) ?? null : null
  const color = saathi?.primary ?? 'var(--gold)'
  const saathiBg = 'var(--bg-base)'
  const isFaculty = profile?.id === session?.faculty_id

  // Next upcoming lecture (for countdown display in lobby)
  const nextLecture = lectures
    .filter((l) => l.scheduled_at && new Date(l.scheduled_at) > new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]

  // Phase 1: if ended_at is null → session is joinable.
  // Lectures with scheduled_at provide countdown but don't gate join.
  const canJoin = !session?.ended_at

  // ── Render states ──────────────────────────────────────────────────────

  // Loading
  if (state === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div
          className="h-10 w-10 animate-spin rounded-full border-2"
          style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--gold)' }}
        />
      </main>
    )
  }

  // Not found
  if (state === 'not_found') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-base)' }}>
        <div className="text-center">
          <p className="mb-4 text-5xl">📺</p>
          <h2
            className="mb-2 text-2xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            Session not found
          </h2>
          <p className="mb-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            This classroom link may have expired or the session was removed.
          </p>
          <Link
            href="/live"
            className="text-sm font-semibold"
            style={{ color: 'var(--gold)', textDecoration: 'none' }}
          >
            &larr; Browse live sessions
          </Link>
        </div>
      </main>
    )
  }

  // Not booked
  if (state === 'not_booked') {
    return (
      <main className="flex min-h-screen items-center justify-center" style={{ background: saathiBg }}>
        <div className="mx-auto max-w-md rounded-2xl p-8 text-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' }}>
          {saathi && <p className="mb-3 text-4xl">{saathi.emoji}</p>}
          <h2
            className="mb-2 text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
          >
            {session?.title}
          </h2>
          <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
            You need a booking to enter this classroom.
          </p>
          <Link
            href={`/live/${sessionId}`}
            className="inline-block rounded-xl px-6 py-3 text-sm font-bold"
            style={{
              background: color,
              color: '#fff',
              textDecoration: 'none',
            }}
          >
            View session details &rarr;
          </Link>
        </div>
      </main>
    )
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────

  if (state === 'lobby') {
    return (
      <main className="min-h-screen" style={{ background: saathiBg }}>
        {/* Top bar */}
        <nav
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Link
            href="/live"
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', textDecoration: 'none' }}
          >
            EdUsaathiAI
          </Link>
          <div className="flex items-center gap-3">
            {saathi && (
              <span
                className="rounded-lg px-2.5 py-1 text-xs font-semibold"
                style={{ background: saathi.bg, color: saathi.primary }}
              >
                {saathi.emoji} {saathi.name}
              </span>
            )}
          </div>
        </nav>

        {/* Lobby content */}
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full text-center"
          >
            {/* Saathi avatar */}
            <div
              className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl text-5xl"
              style={{
                background: saathi ? `${saathi.primary}10` : 'var(--bg-elevated)',
                border: `2px solid ${saathi ? `${saathi.primary}30` : 'var(--border-medium)'}`,
              }}
            >
              {saathi?.emoji ?? '📚'}
            </div>

            {/* Session info */}
            <h1
              className="mb-2 text-3xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              {session?.title}
            </h1>

            {faculty && (
              <div className="mb-6 flex items-center justify-center gap-2">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {faculty.full_name}
                  {faculty.verification_status === 'verified' && (
                    <span className="ml-1 text-xs" style={{ color: 'var(--success)' }}>
                      ✓ Verified
                    </span>
                  )}
                </p>
                {faculty.institution_name && (
                  <>
                    <span style={{ color: 'var(--text-ghost)' }}>&middot;</span>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      {faculty.institution_name}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* Countdown */}
            {countdown && (
              <div
                className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full px-5 py-2.5"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Starts in
                </span>
                <span
                  className="text-lg font-bold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                >
                  {countdown}
                </span>
              </div>
            )}

            {/* Schedule card */}
            {lectures.length > 0 && (
              <div
                className="mx-auto mb-8 max-w-md rounded-2xl p-5 text-left"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h3
                  className="mb-3 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Schedule
                </h3>
                <div className="space-y-2">
                  {lectures.map((l) => {
                    const isNext = nextLecture?.id === l.id
                    return (
                      <div
                        key={l.id}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{
                          background: isNext ? `${color}08` : 'transparent',
                          border: isNext ? `1px solid ${color}20` : '1px solid transparent',
                        }}
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                          style={{
                            background: isNext ? `${color}15` : 'var(--bg-elevated)',
                            color: isNext ? color : 'var(--text-tertiary)',
                          }}
                        >
                          {l.lecture_number}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="truncate text-sm font-medium"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {l.title}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                            {formatDateTime(l.scheduled_at)} &middot; {formatDuration(l.duration_minutes)}
                          </p>
                        </div>
                        {isNext && (
                          <span
                            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: `${color}15`, color }}
                          >
                            Next
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Mode selector — faculty only */}
            {isFaculty && (canJoin || isFaculty) && (
              <div className="mb-6">
                <p
                  className="mb-2 text-xs font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--text-ghost)' }}
                >
                  Session mode
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setClassroomMode('standard')}
                    className="rounded-xl px-5 py-3 text-sm font-semibold transition-all"
                    style={{
                      background: classroomMode === 'standard' ? `${color}12` : 'var(--bg-elevated)',
                      border: `2px solid ${classroomMode === 'standard' ? color : 'var(--border-subtle)'}`,
                      color: classroomMode === 'standard' ? color : 'var(--text-tertiary)',
                    }}
                  >
                    Standard
                    <span className="mt-0.5 block text-[10px] font-normal" style={{ color: 'var(--text-ghost)' }}>
                      Video only
                    </span>
                  </button>
                  <button
                    onClick={() => setClassroomMode('interactive')}
                    className="rounded-xl px-5 py-3 text-sm font-semibold transition-all"
                    style={{
                      background: classroomMode === 'interactive' ? `${color}12` : 'var(--bg-elevated)',
                      border: `2px solid ${classroomMode === 'interactive' ? color : 'var(--border-subtle)'}`,
                      color: classroomMode === 'interactive' ? color : 'var(--text-tertiary)',
                    }}
                  >
                    Interactive
                    <span className="mt-0.5 block text-[10px] font-normal" style={{ color: 'var(--text-ghost)' }}>
                      Video + Canvas
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Join button */}
            <motion.button
              onClick={handleJoin}
              disabled={!canJoin && !isFaculty}
              whileHover={canJoin || isFaculty ? { scale: 1.02 } : {}}
              whileTap={canJoin || isFaculty ? { scale: 0.98 } : {}}
              className="rounded-2xl px-10 py-4 text-base font-bold transition-all disabled:opacity-40"
              style={{
                background: canJoin || isFaculty ? color : 'var(--bg-elevated)',
                color: canJoin || isFaculty ? '#fff' : 'var(--text-ghost)',
                cursor: canJoin || isFaculty ? 'pointer' : 'not-allowed',
              }}
            >
              {canJoin || isFaculty
                ? classroomMode === 'interactive' ? 'Join Interactive Classroom' : 'Join Classroom'
                : countdown
                  ? `Opens ${countdown.includes('d') ? 'in ' + countdown : 'in ' + countdown}`
                  : 'Session not yet scheduled'}
            </motion.button>

            {!canJoin && !isFaculty && countdown && (
              <p className="mt-3 text-xs" style={{ color: 'var(--text-ghost)' }}>
                Join button activates 10 minutes before the session.
              </p>
            )}

            {/* Delivery type hint */}
            <div className="mt-8 flex items-center justify-center gap-4">
              {session?.delivery_type === 'external' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🔗</span>
                  <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                    {session.meeting_platform ?? 'Google Meet'} &middot; opens inside EdUsaathiAI
                  </span>
                </div>
              )}
              {session?.delivery_type === 'in_app' && (
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">📹</span>
                  <span className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                    In-app video &middot; powered by EdUsaathiAI
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    )
  }

  // ── LIVE — External Delivery (iframe) ──────────────────────────────────

  if (state === 'live') {
    const embedUrl = session?.meeting_link ?? session?.external_url

    return (
      <main
        className="flex h-screen flex-col"
        style={{ background: 'var(--bg-base)' }}
      >
        {/* Classroom chrome — top bar */}
        <div
          className="flex shrink-0 items-center justify-between px-4 py-2"
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: Saathi badge + title */}
          <div className="flex items-center gap-3">
            {saathi && (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg text-base"
                style={{ background: `${saathi.primary}10` }}
              >
                {saathi.emoji}
              </div>
            )}
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {session?.title}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-ghost)' }}>
                {faculty?.full_name}
                {isFaculty && (
                  <span className="ml-1" style={{ color }}>
                    (You)
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Center: Timer + mode switch + participants */}
          <div className="flex items-center gap-3">
            {elapsed && (
              <div
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: 'var(--bg-elevated)' }}
              >
                <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span
                  className="text-xs font-bold"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}
                >
                  {elapsed}
                </span>
              </div>
            )}
            <ModeSwitch
              isFaculty={isFaculty}
              classroomMode={classroomMode}
              onModeChange={handleModeChange}
              accentColor={color}
            />
            {participantCount > 0 && (
              <div
                className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                👤 {participantCount}
              </div>
            )}
          </div>

          {/* Right: Questions + Notes + End */}
          <div className="flex items-center gap-2">
            {isFaculty && (
              <button
                onClick={() => { setQuestionsOpen(o => !o); if (notesOpen) setNotesOpen(false) }}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
                style={{
                  background: questionsOpen ? `${color}15` : 'var(--bg-elevated)',
                  border: `1px solid ${questionsOpen ? color : 'var(--border-subtle)'}`,
                  color: questionsOpen ? color : 'var(--text-tertiary)',
                  cursor: 'pointer',
                }}
                title="Student questions"
              >
                🙋 Q&A
              </button>
            )}
            <button
              onClick={() => { setNotesOpen(o => !o); if (questionsOpen) setQuestionsOpen(false) }}
              className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all"
              style={{
                background: notesOpen ? `${color}15` : 'var(--bg-elevated)',
                border: `1px solid ${notesOpen ? color : 'var(--border-subtle)'}`,
                color: notesOpen ? color : 'var(--text-tertiary)',
                cursor: 'pointer',
              }}
              title="Toggle notes panel"
            >
              ✏️ Notes
            </button>
            <button
              onClick={handleLeave}
              className="rounded-xl px-4 py-2 text-xs font-bold transition-colors"
              style={{
                background: 'var(--error-bg)',
                color: 'var(--error)',
              }}
            >
              {isFaculty ? 'End Session' : 'Leave'}
            </button>
          </div>
        </div>

        {/* Content area — wrapped in Liveblocks for mode broadcast */}
        <ClassroomRoomProvider
          sessionId={sessionId}
          userName={profile?.full_name ?? 'Student'}
          userRole={isFaculty ? 'faculty' : 'student'}
          classroomMode={classroomMode}
        >
          <ModeSyncBridge isFaculty={isFaculty} classroomMode={classroomMode} onModeChange={handleModeChange} />

          <div
            className="flex flex-1 flex-col md:flex-row"
            style={{ position: 'relative', transition: 'all 200ms ease' }}
          >
            {/* Video panel — always present, width adjusts by mode */}
            <div
              className="w-full md:h-full"
              style={{
                flex: classroomMode === 'interactive' ? `0 0 ${panelRatio}%` : '1 1 100%',
                display: classroomMode === 'interactive' && panelRatio === 0 ? 'none' : undefined,
                transition: 'flex 200ms ease',
              }}
            >
              {embedUrl ? (
                classroomMode === 'standard' ? (
                  <iframe
                    src={embedUrl}
                    allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write; encrypted-media"
                    allowFullScreen
                    className="h-full w-full border-0"
                    style={{ background: '#000' }}
                  />
                ) : (
                  <div
                    className="flex h-full w-full flex-col items-center justify-center gap-4"
                    style={{ background: 'var(--bg-sunken, #f5f5f0)' }}
                  >
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{ background: `${saathi?.primary ?? '#C9993A'}12` }}
                    >
                      <span style={{ fontSize: '28px' }}>📹</span>
                    </div>
                    <div style={{ textAlign: 'center', maxWidth: '280px' }}>
                      <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                        Open Google Meet
                      </p>
                      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.6, margin: '0 0 16px' }}>
                        Your meeting opens in a new tab.
                        Return here for the interactive canvas, tools, and AI assistant.
                      </p>
                      <a
                        href={embedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
                        style={{
                          background: saathi?.primary ?? '#C9993A',
                          color: '#fff',
                          textDecoration: 'none',
                        }}
                      >
                        Open Meet →
                      </a>
                    </div>
                    <p style={{ fontSize: '11px', color: 'var(--text-ghost)', marginTop: '8px' }}>
                      Canvas, command bar, and all tools stay here
                    </p>
                  </div>
                )
              ) : session?.delivery_type === 'in_app' ? (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: 'var(--bg-sunken)' }}
                >
                  <div className="text-center">
                    <p className="mb-2 text-4xl">📹</p>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      In-app video coming soon
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                      100ms.live integration — future phase
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center"
                  style={{ background: 'var(--bg-sunken)' }}
                >
                  <div className="text-center">
                    <p className="mb-2 text-4xl">⏳</p>
                    <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                      Meeting link not yet available.
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                      Faculty will share it before the session starts.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Draggable divider + Plugin panel — interactive mode only */}
            {classroomMode === 'interactive' && (
              <>
                <ClassroomDivider
                  sessionId={sessionId}
                  onRatioChange={setPanelRatio}
                  initialRatio={panelRatio}
                />

                <div
                  className="relative flex w-full flex-1 flex-col"
                  style={{
                    display: panelRatio === 100 ? 'none' : undefined,
                    transition: 'flex 200ms ease',
                  }}
                >
                  {isFaculty && (
                    <CommandBar
                      sessionId={sessionId}
                      saathiSlug={saathi?.id ?? 'default'}
                      saathiColor={saathi?.primary ?? '#C9993A'}
                      onToolLoad={(result) => {
                        setPendingToolLoad({ tool: result.tool, params: result.params })
                        const tabId = plugin?.toolToTab?.[result.tool]
                        if (tabId) setActiveTab(tabId)
                      }}
                    />
                  )}

                  <div
                    className="flex shrink-0 items-center gap-2 px-3 py-1.5"
                    style={{ borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <FormulaBar
                      onInsert={(latex, html) => {
                        emitArtifact({
                          type: 'formula_katex',
                          source: 'Faculty',
                          data: { latex, rendered_svg: html, display_mode: true },
                          timestamp: new Date().toISOString(),
                        })
                      }}
                    />
                    <span
                      className="ml-auto text-[10px]"
                      style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}
                    >
                      {saathi?.name ?? 'Interactive'}
                    </span>
                  </div>

                  <div className="relative flex-1">
                    {plugin ? (
                      <AutoQueryProvider
                        value={pendingToolLoad}
                        onClear={() => setPendingToolLoad(null)}
                      >
                        <plugin.Component
                          roomId={sessionId}
                          role={isFaculty ? 'faculty' : 'student'}
                          saathiSlug={saathi?.id ?? 'default'}
                          pendingToolLoad={pendingToolLoad}
                          onToolConsumed={() => setPendingToolLoad(null)}
                          activeTab={activeTab}
                          onTabChange={setActiveTab}
                          onArtifact={(a) => emitArtifact(a as ResearchArtifact)}
                        />
                        <CanvasOverlay
                          role={isFaculty ? 'faculty' : 'student'}
                          saathiColor={saathi?.primary ?? '#C9993A'}
                        />
                      </AutoQueryProvider>
                    ) : (
                      <div className="flex h-full items-center justify-center" style={{ background: 'var(--bg-elevated)' }}>
                        <div
                          className="h-8 w-8 animate-spin rounded-full border-2"
                          style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--gold)' }}
                        />
                      </div>
                    )}
                    {plugin?.sourceLabel && <SourceBadge label={plugin.sourceLabel} />}
                  </div>
                </div>
              </>
            )}
            {/* Student ask panel — bottom of content area */}
            {!isFaculty && (
              <StudentAskPanel studentName={profile?.full_name ?? 'Student'} />
            )}

            {/* Faculty question queue — right edge */}
            {isFaculty && (
              <FacultyQuestionQueue
                open={questionsOpen}
                onClose={() => setQuestionsOpen(false)}
                onHomeworkAdd={(item) => setHomeworkItems(prev => [...prev, item])}
                onQuestionReceived={(q) => setSessionQuestions(prev => [...prev, q])}
                accentColor={color}
              />
            )}

            {/* Note builder — private per user, right edge */}
            <NoteBuilder
              sessionId={sessionId}
              sessionTitle={session?.title ?? 'Classroom Session'}
              open={notesOpen}
              onClose={() => setNotesOpen(false)}
            />
          </div>
        </ClassroomRoomProvider>

        {/* Bottom bar */}
        <div
          className="flex shrink-0 items-center justify-between px-4 py-2"
          style={{
            background: 'var(--bg-surface)',
            borderTop: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2">
            {saathi && (
              <span
                className="rounded-md px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: saathi.bg, color: saathi.primary }}
              >
                {saathi.name}
              </span>
            )}
            {session?.delivery_type === 'external' && (
              <span
                className="text-[10px]"
                style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}
              >
                External &middot; {session.meeting_platform ?? 'Google Meet'}
              </span>
            )}
          </div>
          <span
            className="text-[10px]"
            style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}
          >
            EdUsaathiAI Classroom
          </span>
        </div>
      </main>
    )
  }

  // ── SESSION SUMMARY ────────────────────────────────────────────────────

  if (state === 'summary') {
    return (
      <main className="min-h-screen" style={{ background: saathiBg }}>
        <nav
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <Link
            href="/live"
            className="text-xl font-bold"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--gold)', textDecoration: 'none' }}
          >
            EdUsaathiAI
          </Link>
        </nav>

        <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-center"
          >
            {/* Completion badge */}
            <div
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl text-4xl"
              style={{
                background: 'var(--success-bg)',
                border: '2px solid rgba(22, 101, 52, 0.2)',
              }}
            >
              ✓
            </div>

            <h1
              className="mb-2 text-2xl font-bold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}
            >
              Session complete
            </h1>

            <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {session?.title}
            </p>

            {/* Summary card */}
            <div
              className="mb-8 rounded-2xl p-6 text-left"
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div className="space-y-4">
                {/* Faculty + Saathi */}
                <div className="flex items-center gap-3">
                  {saathi && (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                      style={{ background: `${saathi.primary}10` }}
                    >
                      {saathi.emoji}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {faculty?.full_name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                      {saathi?.name} &middot; {faculty?.institution_name}
                    </p>
                  </div>
                </div>

                {/* Stats row */}
                <div
                  className="flex items-center gap-6 rounded-xl px-4 py-3"
                  style={{ background: 'var(--bg-elevated)' }}
                >
                  {sessionDuration > 0 && (
                    <div>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {formatDuration(sessionDuration)}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>Duration</p>
                    </div>
                  )}
                  {lectures.length > 0 && (
                    <div>
                      <p className="text-lg font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {lectures.length}
                      </p>
                      <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                        {lectures.length === 1 ? 'Lecture' : 'Lectures'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Description */}
                {session?.description && (
                  <div>
                    <p
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-ghost)' }}
                    >
                      About
                    </p>
                    <p
                      className="mt-1 text-sm leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {session.description}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Homework review — faculty only */}
            {isFaculty && homeworkItems.length > 0 && (
              <div
                className="mb-8 rounded-2xl p-6 text-left"
                style={{ background: 'var(--bg-surface)', border: `1.5px solid ${color}30` }}
              >
                <p className="mb-3 text-xs font-bold uppercase tracking-wider" style={{ color }}>
                  📝 Homework ({homeworkItems.length} items)
                </p>
                <div className="space-y-2">
                  {homeworkItems.map((item, i) => (
                    <div key={item.id} className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-bold" style={{ color: 'var(--text-ghost)' }}>{i + 1}.</span>
                      <input
                        defaultValue={item.text}
                        onChange={(e) => {
                          setHomeworkItems(prev => prev.map(h => h.id === item.id ? { ...h, text: e.target.value } : h))
                        }}
                        className="flex-1 border-0 bg-transparent text-sm outline-none"
                        style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-subtle)', padding: '2px 0' }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!homeworkSent ? (
                    <>
                      <button
                        onClick={async () => {
                          setHomeworkSending(true)
                          const supabase = createClient()
                          await supabase.from('homework').update({ status: 'sent', sent_at: new Date().toISOString(), send_at: new Date().toISOString() }).eq('session_id', sessionId).eq('status', 'draft')
                          try {
                            await fetch('/api/classroom/send-homework', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ sessionId, sessionTitle: session?.title ?? 'Classroom Session', items: homeworkItems }),
                            })
                          } catch { /* best-effort */ }
                          setHomeworkSent(true)
                          setHomeworkSending(false)
                        }}
                        disabled={homeworkSending}
                        className="rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                        style={{ background: color, color: '#fff', cursor: 'pointer' }}
                      >
                        {homeworkSending ? 'Sending...' : 'Send Now'}
                      </button>
                      <button
                        onClick={async () => {
                          const sendAt = new Date(Date.now() + 30 * 60_000).toISOString()
                          const supabase = createClient()
                          await supabase.from('homework').update({ status: 'pending', send_at: sendAt }).eq('session_id', sessionId).eq('status', 'draft')
                          setHomeworkSent(true)
                        }}
                        disabled={homeworkSending}
                        className="rounded-xl px-4 py-2 text-xs font-semibold transition-all"
                        style={{ background: `${color}15`, color, border: `1px solid ${color}40`, cursor: 'pointer' }}
                      >
                        Send in 30 min
                      </button>
                      <button
                        onClick={() => setHomeworkItems([])}
                        className="rounded-xl px-4 py-2 text-xs font-semibold"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <p className="text-xs font-semibold" style={{ color: 'var(--success)' }}>
                      ✓ Homework {homeworkSending ? 'sent' : 'scheduled'}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Thumbs up / down */}
            {!isFaculty && (
              <div className="mb-8">
                <p className="mb-3 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  How was this session?
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setRating(rating === 'up' ? null : 'up')}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all"
                    style={{
                      background: rating === 'up' ? 'var(--success-bg)' : 'var(--bg-elevated)',
                      border: rating === 'up'
                        ? '2px solid var(--success)'
                        : '2px solid var(--border-subtle)',
                      transform: rating === 'up' ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label="Thumbs up"
                  >
                    👍
                  </button>
                  <button
                    onClick={() => setRating(rating === 'down' ? null : 'down')}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl transition-all"
                    style={{
                      background: rating === 'down' ? 'var(--error-bg)' : 'var(--bg-elevated)',
                      border: rating === 'down'
                        ? '2px solid var(--error)'
                        : '2px solid var(--border-subtle)',
                      transform: rating === 'down' ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label="Thumbs down"
                  >
                    👎
                  </button>
                </div>
                {rating && (
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-ghost)' }}>
                    {rating === 'up' ? 'Glad you enjoyed it!' : 'Thanks for the feedback.'}
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/my-sessions"
                className="rounded-xl px-6 py-3 text-sm font-bold"
                style={{
                  background: color,
                  color: '#fff',
                  textDecoration: 'none',
                }}
              >
                My Sessions
              </Link>
              <Link
                href="/live"
                className="rounded-xl px-6 py-3 text-sm font-semibold"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
              >
                Browse more
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    )
  }

  return null
}
