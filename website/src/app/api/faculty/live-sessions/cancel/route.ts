import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { SAATHIS } from '@/constants/saathis'

const SITE_URL = 'https://www.edusaathiai.in'
const ADMIN_EMAIL = 'admin@edusaathiai.in'
const RESEND_FROM = 'EdUsaathiAI <support@edusaathiai.in>'

/**
 * Faculty-initiated cancellation of a live session.
 *
 * POST /api/faculty/live-sessions/cancel
 * Body: { sessionId: string, reason: string }
 *
 * Rules:
 *   - Faculty must own the session
 *   - Session status must be 'published'
 *   - Earliest live_lecture must be > 1h in the future (else hard-block)
 *   - Reason is required, 10-500 chars
 *
 * Effects:
 *   - live_sessions: status='cancelled', cancelled_at, cancelled_by='faculty',
 *     cancellation_reason, payout_status='on_hold'
 *   - live_lectures: status='cancelled' for everything not yet completed
 *   - live_bookings: refund_status='pending' for every paid booking
 *   - Emails: students (claim refund), faculty (confirmed), admin (action needed)
 */
function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function fmtIst(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short', day: 'numeric', month: 'short',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function rupees(paise: number): string {
  return `\u20B9${(paise / 100).toLocaleString('en-IN')}`
}

async function sendEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from: RESEND_FROM, to: [opts.to], subject: opts.subject, html: opts.html }),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { sessionId?: string; reason?: string }
  const sessionId = body.sessionId?.trim()
  const reason = body.reason?.trim()

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  if (!reason) return NextResponse.json({ error: 'Reason is required so we can be honest with students' }, { status: 400 })
  if (reason.length < 10) return NextResponse.json({ error: 'Reason must be at least 10 characters' }, { status: 400 })
  if (reason.length > 500) return NextResponse.json({ error: 'Reason is too long (max 500 chars)' }, { status: 400 })

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Load session
  const { data: sess, error: sessErr } = await admin
    .from('live_sessions')
    .select('id, faculty_id, status, title, vertical_id')
    .eq('id', sessionId)
    .maybeSingle()
  if (sessErr || !sess) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (sess.faculty_id !== user.id) return NextResponse.json({ error: 'Not your session' }, { status: 403 })
  if (sess.status !== 'published') {
    return NextResponse.json({ error: `Cannot cancel a session in status '${sess.status}'` }, { status: 400 })
  }

  // Find earliest non-completed lecture to enforce 1-hour window
  const { data: lectures } = await admin
    .from('live_lectures')
    .select('id, scheduled_at, status')
    .eq('session_id', sessionId)
    .order('scheduled_at', { ascending: true })

  const upcoming = (lectures ?? []).filter(
    (l) => l.status !== 'completed' && l.status !== 'cancelled'
  )
  if (upcoming.length === 0) {
    return NextResponse.json({ error: 'No upcoming lectures to cancel' }, { status: 400 })
  }
  const earliest = upcoming[0]
  const earliestMs = new Date(earliest.scheduled_at as string).getTime()
  const oneHourFromNow = Date.now() + 60 * 60_000
  if (earliestMs <= oneHourFromNow) {
    return NextResponse.json({
      error: 'Cannot cancel within 1 hour of start. Please take the session, or email admin@edusaathiai.in immediately.',
      hard_block: true,
    }, { status: 400 })
  }

  // ── Mutations (sequential to keep state consistent) ────────────────────────
  const nowIso = new Date().toISOString()

  const { error: updSessErr } = await admin
    .from('live_sessions')
    .update({
      status: 'cancelled',
      cancelled_at: nowIso,
      cancelled_by: 'faculty',
      cancellation_reason: reason,
      payout_status: 'on_hold',
      updated_at: nowIso,
    })
    .eq('id', sessionId)
  if (updSessErr) {
    return NextResponse.json({ error: `Could not update session: ${updSessErr.message}` }, { status: 500 })
  }

  await admin
    .from('live_lectures')
    .update({ status: 'cancelled' })
    .eq('session_id', sessionId)
    .not('status', 'in', '(completed,cancelled)')

  // Open refunds on every paid booking
  const { data: paidBookings } = await admin
    .from('live_bookings')
    .select('id, student_id, amount_paid_paise')
    .eq('session_id', sessionId)
    .eq('payment_status', 'paid')

  const bookings = (paidBookings ?? []) as Array<{ id: string; student_id: string; amount_paid_paise: number }>
  if (bookings.length > 0) {
    await admin
      .from('live_bookings')
      .update({
        refund_status: 'pending',
        refund_initiated_at: nowIso,
        refund_amount_paise: null,
        refund_reason: `Faculty cancelled: ${reason.slice(0, 200)}`,
      })
      .in('id', bookings.map((b) => b.id))
      .eq('refund_status', 'none')   // don't downgrade rows already in 'ready'/'paid'
  }

  // ── Lookup data for emails ─────────────────────────────────────────────────
  const { data: vertical } = await admin
    .from('verticals')
    .select('name, slug')
    .eq('id', sess.vertical_id)
    .maybeSingle()
  const saathi = SAATHIS.find((s) => s.id === vertical?.slug) ?? null
  const saathiName = vertical?.name ?? 'Saathi'
  const saathiEmoji = saathi?.emoji ?? '✦'
  const saathiPrimary = saathi?.primary ?? '#0B1F3A'

  const { data: facProfile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle()
  const facultyName = (facProfile?.full_name as string | undefined) ?? 'Your faculty'
  const facultyEmail = (facProfile?.email as string | undefined) ?? null

  const studentIds = bookings.map((b) => b.student_id)
  const { data: studentProfiles } = studentIds.length > 0
    ? await admin.from('profiles').select('id, full_name, email').in('id', studentIds)
    : { data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }

  const studentMap = new Map<string, { full_name: string | null; email: string | null }>()
  for (const p of (studentProfiles ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>) {
    studentMap.set(p.id, p)
  }

  const refundsUrl = `${SITE_URL}/refunds`
  const earliestIst = fmtIst(earliest.scheduled_at as string)

  // ── Email each student ─────────────────────────────────────────────────────
  let studentEmailsSent = 0
  for (const b of bookings) {
    const sp = studentMap.get(b.student_id)
    if (!sp?.email) continue
    const firstName = (sp.full_name ?? 'there').trim().split(/\s+/)[0]
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:${escHtml(saathiPrimary)};color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#FCA5A5;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">${saathiEmoji} Session cancelled</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:22px;line-height:1.3">${escHtml(sess.title)}</h2>
<p style="color:rgba(255,255,255,0.88);line-height:1.7;margin:0 0 14px">Hi ${escHtml(firstName)}, ${escHtml(facultyName)} has cancelled the session scheduled for <strong>${escHtml(earliestIst)} IST</strong>.</p>
<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 18px"><strong>Reason from faculty:</strong><br><span style="color:rgba(255,255,255,0.78);font-style:italic">${escHtml(reason)}</span></p>
<p style="color:rgba(255,255,255,0.88);line-height:1.7;margin:0 0 8px"><strong>Your full ${escHtml(rupees(b.amount_paid_paise))} will be refunded.</strong></p>
<p style="color:rgba(255,255,255,0.78);line-height:1.7;margin:0 0 22px;font-size:13px">We don't have your UPI on file yet — please share it once and admin will transfer the refund within 48 hours.</p>
<a href="${escHtml(refundsUrl)}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:13px 30px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">Claim refund →</a>
<p style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:26px">Sorry for the disruption. Your Saathi will help you find another session in this area soon.</p>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:20px">support@edusaathiai.in</p>
</div>`
    if (await sendEmail({ to: sp.email, subject: `Session cancelled: ${sess.title} — refund pending`, html })) {
      studentEmailsSent++
    }
  }

  // ── Email faculty (confirmation) ───────────────────────────────────────────
  if (facultyEmail) {
    const html = `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#C9993A;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">Cancellation confirmed</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:22px;line-height:1.3">${escHtml(sess.title)}</h2>
<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 14px">Hi ${escHtml((facProfile?.full_name as string | undefined)?.split(/\s+/)[0] ?? 'there')}, your session scheduled for ${escHtml(earliestIst)} IST has been cancelled.</p>
<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 14px">${bookings.length} student${bookings.length === 1 ? '' : 's'} ${bookings.length === 1 ? 'has' : 'have'} been notified and will be refunded.</p>
<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 18px"><strong>Payout for this session is on hold.</strong> No earnings will be released for a cancelled session.</p>
<p style="color:rgba(255,255,255,0.45);font-size:12px;margin-top:24px">Cancellations affect your faculty trust score. Please be mindful of your students' time.</p>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:20px">support@edusaathiai.in</p>
</div>`
    await sendEmail({ to: facultyEmail, subject: `Cancellation confirmed: ${sess.title}`, html })
  }

  // ── Email admin (action item) ──────────────────────────────────────────────
  const adminHtml = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#0B1F3A;color:#fff;padding:36px 28px;border-radius:14px">
<p style="color:#FCA5A5;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">Action needed · refund queue</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 14px;font-size:20px">Faculty cancelled a session</h2>
<table style="width:100%;border-collapse:collapse;color:rgba(255,255,255,0.88);font-size:14px">
<tr><td style="padding:6px 0;color:rgba(255,255,255,0.6)">Session</td><td style="padding:6px 0">${escHtml(sess.title)}</td></tr>
<tr><td style="padding:6px 0;color:rgba(255,255,255,0.6)">Faculty</td><td style="padding:6px 0">${escHtml(facultyName)} (${escHtml(facultyEmail ?? '—')})</td></tr>
<tr><td style="padding:6px 0;color:rgba(255,255,255,0.6)">Was scheduled</td><td style="padding:6px 0">${escHtml(earliestIst)} IST</td></tr>
<tr><td style="padding:6px 0;color:rgba(255,255,255,0.6)">Paid bookings</td><td style="padding:6px 0">${bookings.length}</td></tr>
<tr><td style="padding:6px 0;color:rgba(255,255,255,0.6)">Total to refund</td><td style="padding:6px 0">${escHtml(rupees(bookings.reduce((a, b) => a + b.amount_paid_paise, 0)))}</td></tr>
</table>
<p style="margin:18px 0 8px;color:rgba(255,255,255,0.85);font-size:14px"><strong>Reason:</strong><br><span style="color:rgba(255,255,255,0.7);font-style:italic">${escHtml(reason)}</span></p>
<a href="${escHtml(SITE_URL.replace('www.edusaathiai.in', 'edusaathiai-admin.vercel.app'))}/refunds" style="display:inline-block;margin-top:18px;background:#C9993A;color:#0B1F3A;padding:12px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">Open refund queue →</a>
<p style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:22px">Students have been emailed a link to share their UPI. As soon as they do, the booking moves to "ready" in the queue.</p>
</div>`
  await sendEmail({ to: ADMIN_EMAIL, subject: `[Action] Faculty cancelled "${sess.title}" — ${bookings.length} refunds`, html: adminHtml })

  return NextResponse.json({
    ok: true,
    bookings_marked: bookings.length,
    student_emails_sent: studentEmailsSent,
  })
}
