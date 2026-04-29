// ─────────────────────────────────────────────────────────────────────────────
// /api/classroom/create-whereby-room — Phase 2 video-provider lock.
//
// Called once when faculty clicks Join on a session. Reads the actual
// booking count, picks Whereby vs Google Meet, persists the choice, and
// (for Whereby) creates the room lazily. The result is locked — repeat
// calls return the cached room without burning a new one.
//
// POST { session_id: string, session_type: 'faculty_session' | 'live_session' }
// Auth: Bearer token. Faculty role enforced via ownership
// (session.faculty_id === user.id) — same pattern as /share-notes.
//
// Returns:
//   { provider: 'whereby',     roomUrl, hostRoomUrl }
//   { provider: 'google_meet'                       }
//   { provider: 'google_meet', fallback: true       }   ← Whereby API failed
//
// Failure semantics: a Whereby outage must NEVER block a faculty Join.
// We log to Sentry, fall back to google_meet, and let the existing
// MeetLinkGate prompt the faculty for a Meet URL the way it does today.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createWherebyRoom } from '@/lib/classroom/createWherebyRoom'
import {
  selectVideoProvider,
  type SessionType,
  type VideoProvider,
} from '@/lib/classroom/selectVideoProvider'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY         = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const DEFAULT_DURATION_MINUTES = 90

type FacultySessionRow = {
  faculty_id:            string
  topic:                 string | null
  confirmed_slot:        string | null
  duration_minutes:      number | null
  fee_paise:             number | null
  video_provider:        VideoProvider | null
  video_provider_locked: boolean | null
  whereby_room_id:       string | null
  whereby_room_url:      string | null
  whereby_host_url:      string | null
}

type LiveSessionRow = {
  faculty_id:            string
  title:                 string | null
  video_provider:        VideoProvider | null
  video_provider_locked: boolean | null
  whereby_room_id:       string | null
  whereby_room_url:      string | null
  whereby_host_url:      string | null
}

async function captureToSentry(err: unknown, context: Record<string, unknown>) {
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err instanceof Error ? err : new Error(String(err)), {
      tags: { route: 'classroom/create-whereby-room' },
      extra: context,
    })
  } catch {
    // Sentry unavailable — already logged via console.error
  }
}

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createClient(SUPABASE_URL, ANON_KEY)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const sessionId   = body.session_id   as string | undefined
    const sessionType = body.session_type as SessionType | undefined
    if (!sessionId || !sessionType) {
      return NextResponse.json({ error: 'session_id and session_type required' }, { status: 400 })
    }
    if (sessionType !== 'faculty_session' && sessionType !== 'live_session') {
      return NextResponse.json({ error: 'session_type must be faculty_session or live_session' }, { status: 400 })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const tableName = sessionType === 'faculty_session' ? 'faculty_sessions' : 'live_sessions'

    // ── Fetch session + verify faculty ownership ────────────────────────
    let title: string
    let scheduledAt: string
    let durationMinutes: number
    let feePaise = 0
    let row: FacultySessionRow | LiveSessionRow

    if (sessionType === 'faculty_session') {
      const { data, error } = await admin
        .from('faculty_sessions')
        .select('faculty_id, topic, confirmed_slot, duration_minutes, fee_paise, video_provider, video_provider_locked, whereby_room_id, whereby_room_url, whereby_host_url')
        .eq('id', sessionId)
        .single<FacultySessionRow>()
      if (error || !data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      if (data.faculty_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      row             = data
      title           = data.topic ?? 'EdUsaathiAI 1:1 session'
      scheduledAt     = data.confirmed_slot ?? new Date().toISOString()
      durationMinutes = data.duration_minutes ?? 60
      feePaise        = data.fee_paise ?? 0
    } else {
      const { data, error } = await admin
        .from('live_sessions')
        .select('faculty_id, title, video_provider, video_provider_locked, whereby_room_id, whereby_room_url, whereby_host_url')
        .eq('id', sessionId)
        .single<LiveSessionRow>()
      if (error || !data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      if (data.faculty_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      row   = data
      title = data.title ?? 'EdUsaathiAI live session'

      // live_sessions has no scheduled_at on the row itself — it lives on
      // live_lectures (one row per lecture in a series). Use the next
      // upcoming lecture as the room window; fall back to the earliest
      // lecture if everything is past.
      const { data: lecture } = await admin
        .from('live_lectures')
        .select('scheduled_at, duration_minutes')
        .eq('session_id', sessionId)
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      scheduledAt     = lecture?.scheduled_at ?? new Date().toISOString()
      durationMinutes = lecture?.duration_minutes ?? DEFAULT_DURATION_MINUTES
    }

    // ── Idempotency: already locked + Whereby room cached → return it ──
    // Lazy creation invariant: refresh / second device must reuse the
    // same room. Locked + has URL means Phase 2 already ran successfully.
    if (row.video_provider_locked && row.video_provider === 'whereby' && row.whereby_room_url && row.whereby_host_url) {
      return NextResponse.json({
        provider:    'whereby',
        roomUrl:     row.whereby_room_url,
        hostRoomUrl: row.whereby_host_url,
      })
    }
    if (row.video_provider_locked && row.video_provider === 'google_meet') {
      return NextResponse.json({ provider: 'google_meet' })
    }

    // ── Decide provider from actual booking count ──────────────────────
    let bookedStudentCount = 1
    if (sessionType === 'live_session') {
      const { count } = await admin
        .from('live_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .not('paid_at', 'is', null)
        .is('refunded_at', null)
        .is('cancelled_by_student_at', null)
      bookedStudentCount = count ?? 0
    }

    const provider = selectVideoProvider(sessionType, bookedStudentCount, feePaise)

    // ── Google Meet path: no API call, just persist + lock ─────────────
    if (provider === 'google_meet') {
      await admin
        .from(tableName)
        .update({ video_provider: 'google_meet', video_provider_locked: true })
        .eq('id', sessionId)
      return NextResponse.json({ provider: 'google_meet' })
    }

    // ── Whereby path: create room lazily, persist + lock ───────────────
    try {
      // Reuse existing room if one was already provisioned but never locked
      // (e.g. Phase 1 created it speculatively). Otherwise create fresh.
      let roomId:      string
      let roomUrl:     string
      let hostRoomUrl: string

      if (row.whereby_room_id && row.whereby_room_url && row.whereby_host_url) {
        roomId      = row.whereby_room_id
        roomUrl     = row.whereby_room_url
        hostRoomUrl = row.whereby_host_url
      } else {
        const created = await createWherebyRoom({
          sessionId,
          title,
          scheduledAt,
          durationMinutes,
        })
        roomId      = created.roomId
        roomUrl     = created.roomUrl
        hostRoomUrl = created.hostRoomUrl
      }

      await admin
        .from(tableName)
        .update({
          video_provider:        'whereby',
          video_provider_locked: true,
          whereby_room_id:       roomId,
          whereby_room_url:      roomUrl,
          whereby_host_url:      hostRoomUrl,
        })
        .eq('id', sessionId)

      return NextResponse.json({
        provider:    'whereby',
        roomUrl,
        hostRoomUrl,
      })
    } catch (err) {
      // Whereby outage must never block a Join. Fall back to google_meet
      // and let MeetLinkGate prompt for a paste-in URL like it does today.
      console.error('[create-whereby-room] Whereby API failed:', err)
      await captureToSentry(err, { sessionId, sessionType, bookedStudentCount })
      await admin
        .from(tableName)
        .update({ video_provider: 'google_meet', video_provider_locked: true })
        .eq('id', sessionId)
      return NextResponse.json({ provider: 'google_meet', fallback: true })
    }
  } catch (err) {
    console.error('[create-whereby-room] Internal error:', err)
    await captureToSentry(err, { phase: 'outer' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
