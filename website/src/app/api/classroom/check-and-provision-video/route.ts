// ─────────────────────────────────────────────────────────────────────────────
// /api/classroom/check-and-provision-video — lobby orchestrator.
//
// Called by the classroom lobby on faculty Join. Returns the resolved
// video state the lobby needs in a single round-trip:
//
//   { status: 'ready',           provider: 'whereby',     roomUrl, hostRoomUrl }
//   { status: 'ready',           provider: 'google_meet', meetUrl }
//   { status: 'needs_meet_link', provider: 'google_meet', studentCount, message? }
//
// Phase 2 (lock) responsibilities:
//   - If video_provider_locked + cached → return immediately, no recompute.
//   - Otherwise re-run selectVideoProvider with the actual booking count.
//   - whereby   → ensureWherebyRoom (lazy create, cache, lock).
//   - meet+url  → lock + return URL.
//   - meet, no url → return needs_meet_link, do NOT lock. Lock happens
//     after the faculty saves the URL via /faculty/sessions or the
//     in-progress MeetLinkGate.
//
// POST body: { session_id: string, session_type: 'faculty_session' | 'live_session' }
// Auth: Bearer JWT, faculty role enforced via ownership.
//
// Whereby outage: silent fallback to google_meet (no lock — faculty needs
// to paste a URL anyway), Sentry capture, never blocks the Join flow.
//
// Note on the "Meet link" column: this codebase stores the faculty-pasted
// Meet/Zoom URL on `meeting_link` (live_sessions + faculty_sessions). The
// classroom shell reads `meeting_link ?? external_url`, but `external_url`
// has been empty across all 7 production rows since launch. We use
// `meeting_link` as the source of truth and surface it as `meetUrl` in
// the response so the lobby has one consistent name to render against.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureWherebyRoom } from '@/lib/classroom/ensureWherebyRoom'
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
  meeting_link:          string | null
  video_provider:        VideoProvider | null
  video_provider_locked: boolean | null
  whereby_room_id:       string | null
  whereby_room_url:      string | null
  whereby_host_url:      string | null
}

type LiveSessionRow = {
  faculty_id:            string
  title:                 string | null
  external_url:          string | null
  meeting_link:          string | null
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
      tags: { route: 'classroom/check-and-provision-video' },
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
    let meetingLink: string | null = null
    let row: FacultySessionRow | LiveSessionRow

    if (sessionType === 'faculty_session') {
      const { data, error } = await admin
        .from('faculty_sessions')
        .select('faculty_id, topic, confirmed_slot, duration_minutes, fee_paise, meeting_link, video_provider, video_provider_locked, whereby_room_id, whereby_room_url, whereby_host_url')
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
      meetingLink     = data.meeting_link
    } else {
      const { data, error } = await admin
        .from('live_sessions')
        .select('faculty_id, title, external_url, meeting_link, video_provider, video_provider_locked, whereby_room_id, whereby_room_url, whereby_host_url')
        .eq('id', sessionId)
        .single<LiveSessionRow>()
      if (error || !data) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
      if (data.faculty_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      row         = data
      title       = data.title ?? 'EdUsaathiAI live session'
      // external_url is the column save-meet-link writes to (new flow);
      // meeting_link is the legacy column used by /faculty/live/create's
      // pre-Whereby UI. Either is acceptable as the Meet URL — prefer the
      // newer column when both are set.
      meetingLink = data.external_url ?? data.meeting_link

      // live_sessions has no scheduled_at on the row itself — the
      // earliest upcoming live_lectures row carries the window.
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

    // ── Step 2: locked + cached → return immediately ───────────────────
    if (row.video_provider_locked) {
      if (row.video_provider === 'whereby' && row.whereby_room_url && row.whereby_host_url) {
        return NextResponse.json({
          status:      'ready',
          provider:    'whereby',
          roomUrl:     row.whereby_room_url,
          hostRoomUrl: row.whereby_host_url,
        })
      }
      if (row.video_provider === 'google_meet' && meetingLink) {
        return NextResponse.json({
          status:   'ready',
          provider: 'google_meet',
          meetUrl:  meetingLink,
        })
      }
      // Locked but missing the artifact it needs (e.g. locked-google_meet
      // with no URL — anomalous). Fall through and recompute.
    }

    // ── Step 3: actual booking count ───────────────────────────────────
    let bookedCount = 1
    if (sessionType === 'live_session') {
      const { count } = await admin
        .from('live_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', sessionId)
        .not('paid_at', 'is', null)
        .is('refunded_at', null)
        .is('cancelled_by_student_at', null)
      bookedCount = count ?? 0
    }

    // ── Step 4: re-run selectVideoProvider ─────────────────────────────
    // live_sessions don't carry fee_paise; pass 1 so the function never
    // dips into the free-1:1 google_meet branch for group sessions even
    // if the matrix evolves to consider price for groups later.
    const priceArg = sessionType === 'faculty_session' ? feePaise : 1
    const newProvider = selectVideoProvider(sessionType, bookedCount, priceArg)

    // ── Step 5: whereby → google_meet flip (group grew past threshold) ─
    if (row.video_provider === 'whereby' && newProvider === 'google_meet') {
      await admin
        .from(tableName)
        .update({ video_provider: 'google_meet' })
        .eq('id', sessionId)
      // No lock yet — faculty needs to paste a Meet URL first.
      return NextResponse.json({
        status:       'needs_meet_link',
        provider:     'google_meet',
        studentCount: bookedCount,
        message:      `Your session now has ${bookedCount} students — great turnout. Please add a Google Meet link to continue.`,
      })
    }

    // ── Step 6: whereby (new or unchanged) → provision + lock ──────────
    if (newProvider === 'whereby') {
      try {
        const { roomUrl, hostRoomUrl } = await ensureWherebyRoom(
          {
            id:               sessionId,
            title,
            scheduledAt,
            durationMinutes,
            whereby_room_id:  row.whereby_room_id,
            whereby_room_url: row.whereby_room_url,
            whereby_host_url: row.whereby_host_url,
          },
          tableName,
          admin,
        )

        await admin
          .from(tableName)
          .update({ video_provider: 'whereby', video_provider_locked: true })
          .eq('id', sessionId)

        return NextResponse.json({
          status:   'ready',
          provider: 'whereby',
          roomUrl,
          hostRoomUrl,
        })
      } catch (err) {
        // Whereby outage → fall back to google_meet. Don't lock — faculty
        // will paste a URL via the MeetLinkGate, and that save path locks
        // the provider.
        console.error('[check-and-provision-video] Whereby API failed:', err)
        await captureToSentry(err, { sessionId, sessionType, bookedCount })
        await admin
          .from(tableName)
          .update({ video_provider: 'google_meet' })
          .eq('id', sessionId)
        return NextResponse.json({
          status:       'needs_meet_link',
          provider:     'google_meet',
          studentCount: bookedCount,
        })
      }
    }

    // ── Step 7 + 8: google_meet path ───────────────────────────────────
    // 7: meeting_link present → lock + return ready.
    // 8: meeting_link missing → return needs_meet_link, do NOT lock.
    if (meetingLink) {
      await admin
        .from(tableName)
        .update({ video_provider: 'google_meet', video_provider_locked: true })
        .eq('id', sessionId)
      return NextResponse.json({
        status:   'ready',
        provider: 'google_meet',
        meetUrl:  meetingLink,
      })
    }

    await admin
      .from(tableName)
      .update({ video_provider: 'google_meet' })
      .eq('id', sessionId)
    return NextResponse.json({
      status:       'needs_meet_link',
      provider:     'google_meet',
      studentCount: bookedCount,
    })
  } catch (err) {
    console.error('[check-and-provision-video] Internal error:', err)
    await captureToSentry(err, { phase: 'outer' })
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
