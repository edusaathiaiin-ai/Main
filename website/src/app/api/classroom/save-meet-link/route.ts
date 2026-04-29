// ─────────────────────────────────────────────────────────────────────────────
// /api/classroom/save-meet-link — faculty pastes a Google Meet / Zoom URL.
//
// PATCH { session_id: string, url: string }
// Auth: Bearer JWT, faculty role enforced via ownership.
//
// Writes live_sessions.external_url. Locks video_provider to 'google_meet'
// at the same time — once the URL is in place, the lobby's Phase-2 lock
// is satisfied, and check-and-provision-video will return 'ready' on the
// next call without re-hitting the matrix.
//
// Faculty 1:1 sessions don't go through this route — paid 1:1s use whereby
// (no Meet URL needed) and free 1:1s set their meeting_link via the
// existing /faculty/sessions saveMeetingLink path. live_sessions is the
// only surface that uses external_url + this route.
//
// URL whitelist is intentionally narrow: only Google Meet and the public
// Zoom domains we expect in India. Anything else returns 400 — this is a
// faculty-pasted URL gate, not a generic link saver.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY         = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const VALID_PREFIXES = [
  'https://meet.google.com/',
  'https://zoom.us/',
  'https://us02web.zoom.us/',
  'https://us06web.zoom.us/',
]

export async function PATCH(req: NextRequest) {
  try {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(SUPABASE_URL, ANON_KEY)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const sessionId = body.session_id as string | undefined
    const rawUrl    = body.url        as string | undefined
    if (!sessionId || !rawUrl) {
      return NextResponse.json({ error: 'session_id and url required' }, { status: 400 })
    }

    const url = rawUrl.trim()
    if (!VALID_PREFIXES.some((p) => url.startsWith(p))) {
      return NextResponse.json({ error: 'invalid_meet_url' }, { status: 400 })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Ownership-scoped update: the .eq('faculty_id', user.id) clause is the
    // gate — non-owners get 0 rows updated, which we surface as 403.
    const { data, error } = await admin
      .from('live_sessions')
      .update({
        external_url:          url,
        video_provider:        'google_meet',
        video_provider_locked: true,
      })
      .eq('id', sessionId)
      .eq('faculty_id', user.id)
      .select('id')

    if (error) {
      console.error('[save-meet-link] update failed:', error)
      return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[save-meet-link] error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
