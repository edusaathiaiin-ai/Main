'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type Lecture = {
  id: string
  lecture_number: number
  title: string
  scheduled_at: string
  status: string
  notes_url: string | null
  notes_uploaded_at: string | null
  notes_sent_to_students: boolean
}

type SessionRow = {
  id: string
  title: string
  faculty_id: string
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export default function FacultyNotesPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { profile } = useAuthStore()
  const [session, setSession] = useState<SessionRow | null>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [studentCount, setStudentCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile || !sessionId) return
    let cancel = false
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: sess, error: sErr } = await supabase
          .from('live_sessions')
          .select('id, title, faculty_id')
          .eq('id', sessionId)
          .maybeSingle()
        if (sErr) throw new Error(sErr.message)
        if (!sess) throw new Error('Session not found')
        if (sess.faculty_id !== profile.id) throw new Error('Not your session')
        if (cancel) return
        setSession(sess)

        const { data: lecs, error: lErr } = await supabase
          .from('live_lectures')
          .select('id, lecture_number, title, scheduled_at, status, notes_url, notes_uploaded_at, notes_sent_to_students')
          .eq('session_id', sessionId)
          .order('lecture_number', { ascending: true })
        if (lErr) throw new Error(lErr.message)
        if (cancel) return
        setLectures((lecs ?? []) as Lecture[])

        const { count } = await supabase
          .from('live_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', sessionId)
          .eq('payment_status', 'paid')
        if (cancel) return
        setStudentCount(count ?? 0)
      } catch (err) {
        if (!cancel) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => { cancel = true }
  }, [profile, sessionId])

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      <nav
        className="flex items-center justify-between border-b px-6 py-4"
        style={{ borderColor: 'var(--bg-elevated)' }}
      >
        <Link href="/faculty/live" className="font-playfair text-xl font-bold" style={{ color: '#C9993A', textDecoration: 'none' }}>
          EdUsaathiAI
        </Link>
        <Link href="/faculty/live" className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          ← Back to sessions
        </Link>
      </nav>

      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="font-playfair mb-2 text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Share session notes
        </h1>
        <p className="mb-8 text-sm" style={{ color: 'var(--text-tertiary)' }}>
          {studentCount} student{studentCount === 1 ? '' : 's'} will receive these notes by email.
        </p>

        {loading && <p style={{ color: 'var(--text-tertiary)' }}>Loading…</p>}
        {error && (
          <div className="mb-6 rounded-xl p-4" style={{ background: '#FEE2E2', border: '1px solid #FECACA' }}>
            <p className="text-sm" style={{ color: '#991B1B' }}>{error}</p>
          </div>
        )}

        {!loading && !error && session && (
          <>
            <div
              className="mb-6 rounded-xl p-5"
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
            >
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
                Session
              </p>
              <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                {session.title}
              </p>
            </div>

            {lectures.length === 0 && (
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                No lectures yet for this session.
              </p>
            )}

            <div className="flex flex-col gap-5">
              {lectures.map((lec) => (
                <LectureNotesCard
                  key={lec.id}
                  lecture={lec}
                  studentCount={studentCount}
                  onSent={(updated) => {
                    setLectures((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function LectureNotesCard({
  lecture,
  studentCount,
  onSent,
}: {
  lecture: Lecture
  studentCount: number
  onSent: (l: Lecture) => void
}) {
  const [url,  setUrl]  = useState(lecture.notes_url ?? '')
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [resultMsg, setResultMsg] = useState('')
  const [err, setErr] = useState('')

  const alreadySent = lecture.notes_sent_to_students && !!lecture.notes_uploaded_at

  async function handleShare() {
    setErr('')
    setResultMsg('')
    if (!url.trim() && !text.trim()) {
      setErr('Paste a notes link, or type a brief summary.')
      return
    }
    if (url.trim()) {
      try { new URL(url.trim()) } catch {
        setErr('That doesn\'t look like a valid link. Include https://')
        return
      }
    }
    setSending(true)
    try {
      const res = await fetch('/api/faculty/live-notes/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lectureId: lecture.id,
          notesUrl:  url.trim() || undefined,
          notesText: text.trim() || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to send')
      setResultMsg(`Sent to ${json.sent ?? 0} student${json.sent === 1 ? '' : 's'}.`)
      onSent({
        ...lecture,
        notes_url: url.trim() || lecture.notes_url,
        notes_uploaded_at: new Date().toISOString(),
        notes_sent_to_students: true,
      })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg-surface)', border: '0.5px solid var(--border-subtle)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
            Lecture {lecture.lecture_number} · {lecture.status}
          </p>
          <p className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            {lecture.title}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
            {fmtDate(lecture.scheduled_at)} IST
          </p>
        </div>
        {alreadySent && (
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: '#DCFCE7', color: '#15803D' }}
          >
            Notes shared
          </span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Notes link (Drive / PDF / Notion)
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          />
        </label>
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          Brief summary (optional, max 2000 chars)
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            rows={4}
            placeholder="One paragraph that students will remember a year from now."
            className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
            style={{
              background: 'var(--bg-base)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
            }}
          />
        </label>
      </div>

      {err && (
        <p className="mt-3 text-xs" style={{ color: '#B91C1C' }}>
          {err}
        </p>
      )}
      {resultMsg && (
        <p className="mt-3 text-xs" style={{ color: '#15803D' }}>
          {resultMsg}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          {studentCount === 0
            ? 'No paid students booked yet.'
            : `Will email ${studentCount} student${studentCount === 1 ? '' : 's'}.`}
        </p>
        <button
          type="button"
          onClick={handleShare}
          disabled={sending || studentCount === 0}
          className="rounded-lg px-4 py-2 text-xs font-semibold"
          style={{
            background: studentCount === 0 ? 'var(--bg-elevated)' : '#C9993A',
            color: studentCount === 0 ? 'var(--text-tertiary)' : '#060F1D',
            cursor: sending || studentCount === 0 ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.6 : 1,
          }}
        >
          {sending ? 'Sending…' : alreadySent ? 'Resend notes' : 'Share notes'}
        </button>
      </div>
    </div>
  )
}
