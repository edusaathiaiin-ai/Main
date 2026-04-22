import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SAATHIS } from '@/constants/saathis'

/**
 * Share live-lecture notes with all paid students of a session.
 *
 * POST /api/faculty/live-notes/share
 * Body: { lectureId: string, notesUrl?: string, notesText?: string }
 *
 * Auth: JWT, faculty must own the parent session.
 *
 * Stores the notes on live_lectures (notes_url, notes_uploaded_at) and
 * emails every paid booker via Resend.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as {
    lectureId?: string
    notesUrl?: string
    notesText?: string
  }
  const lectureId = body.lectureId?.trim()
  const notesUrl  = body.notesUrl?.trim() || null
  const notesText = body.notesText?.trim() || null

  if (!lectureId) {
    return NextResponse.json({ error: 'lectureId required' }, { status: 400 })
  }
  if (!notesUrl && !notesText) {
    return NextResponse.json({ error: 'Provide a notes URL or a brief summary' }, { status: 400 })
  }
  if (notesUrl) {
    try { new URL(notesUrl) } catch {
      return NextResponse.json({ error: 'Notes URL is not a valid link' }, { status: 400 })
    }
  }
  if (notesText && notesText.length > 2000) {
    return NextResponse.json({ error: 'Summary is too long (max 2000 chars)' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Load the lecture + parent session, verify faculty ownership.
  const { data: lecture, error: lecErr } = await admin
    .from('live_lectures')
    .select('id, title, session_id, scheduled_at, notes_sent_to_students, live_sessions!inner(id, faculty_id, title, vertical_id)')
    .eq('id', lectureId)
    .maybeSingle()

  if (lecErr || !lecture) {
    return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
  }

  const sess = Array.isArray(lecture.live_sessions) ? lecture.live_sessions[0] : lecture.live_sessions
  if (!sess || sess.faculty_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized for this lecture' }, { status: 403 })
  }

  // Resolve Saathi for branding
  const { data: vertical } = await admin
    .from('verticals')
    .select('name, slug')
    .eq('id', sess.vertical_id)
    .maybeSingle()
  const saathi = SAATHIS.find(s => s.id === vertical?.slug) ?? null
  const saathiName = vertical?.name ?? 'Saathi'
  const saathiEmoji = saathi?.emoji ?? '✦'
  const saathiPrimary = saathi?.primary ?? '#0B1F3A'

  // Faculty profile for the "from" line
  const { data: facProfile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .maybeSingle()
  const facultyName = (facProfile?.full_name as string | undefined) ?? 'Your faculty'

  // Update lecture (write notes even if no students booked — it stays on record)
  const { error: updErr } = await admin
    .from('live_lectures')
    .update({
      notes_url: notesUrl,
      notes_uploaded_at: new Date().toISOString(),
      notes_sent_to_students: true,
    })
    .eq('id', lectureId)
  if (updErr) {
    return NextResponse.json({ error: `Could not save notes: ${updErr.message}` }, { status: 500 })
  }

  // Pull paid students
  const { data: bookings } = await admin
    .from('live_bookings')
    .select('student_id')
    .eq('session_id', sess.id)
    .eq('payment_status', 'paid')
  const studentIds = (bookings ?? []).map(b => b.student_id).filter(Boolean) as string[]

  if (studentIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: 'no paid students yet — notes saved' })
  }

  const { data: students } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds)

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ ok: true, sent: 0, note: 'notes saved; email not configured' })
  }

  const sessionTitle = sess.title as string
  const lectureTitle = (lecture.title as string) ?? sessionTitle
  let sent = 0
  let failed = 0

  const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  for (const s of (students ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    if (!s.email) continue
    const firstName = (s.full_name ?? 'there').trim().split(/\s+/)[0]
    const summaryHtml = notesText ? `<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 18px;white-space:pre-wrap">${escHtml(notesText)}</p>` : ''
    const linkBlock = notesUrl
      ? `<a href="${escHtml(notesUrl)}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:13px 30px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">Open notes →</a>`
      : ''

    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:${escHtml(saathiPrimary)};color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#C9993A;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">${saathiEmoji} ${escHtml(saathiName)} · Notes shared</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:22px;line-height:1.3">${escHtml(lectureTitle)}</h2>
<p style="color:rgba(255,255,255,0.88);line-height:1.7;margin:0 0 14px">Hi ${escHtml(firstName)}, ${escHtml(facultyName)} has shared the notes from your live session.</p>
${summaryHtml}
${linkBlock}
<p style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;margin-top:26px">Save these notes to your personal soul archive — they help your Saathi remember what you've been studying.</p>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:22px">support@edusaathiai.in</p>
</div>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'EdUsaathiAI <support@edusaathiai.in>',
          to: [s.email],
          subject: `${saathiEmoji} Notes from ${facultyName} — ${lectureTitle}`,
          html,
        }),
      })
      if (res.ok) sent++
      else failed++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ok: true, sent, failed })
}
