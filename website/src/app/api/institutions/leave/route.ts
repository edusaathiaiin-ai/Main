// ─────────────────────────────────────────────────────────────────────────────
// POST /api/institutions/leave
//
// Authenticated. Body: { reason?: string }. Unlinks the student from their
// current institution:
//   - sets profiles.institution_drop_requested_at = NOW()
//   - sets profiles.institution_id = NULL
//   - sets profiles.institution_role = NULL
//
// Sends two emails via Resend:
//   1. Student: confirmation of archive export + 7-day window notice
//   2. Admin:   "student dropped" operational alert with institution + name
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY   = process.env.RESEND_API_KEY
const FROM_ADDRESS     = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'
const ADMIN_EMAIL      = 'admin@edusaathiai.in'

type Body = { reason?: string }

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { body = {} } // empty body is fine
  const reason = (body.reason ?? '').trim() || null

  // Snapshot the student + institution so the emails have readable context.
  const { data: snap } = await supabase
    .from('profiles')
    .select('full_name, institution_id, institutions:institution_id ( name )')
    .eq('id', user.id)
    .maybeSingle()

  const studentName = (snap?.full_name as string | null) ?? 'there'
  const institutionName =
    (snap?.institutions as { name?: string | null } | null)?.name ?? null

  if (!snap?.institution_id) {
    // Nothing to do — user isn't linked.
    return NextResponse.json({ success: true, already_solo: true })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: updErr } = await admin
    .from('profiles')
    .update({
      institution_drop_requested_at: new Date().toISOString(),
      institution_id:                null,
      institution_role:              null,
    })
    .eq('id', user.id)

  if (updErr) {
    return NextResponse.json({ error: 'leave_failed', detail: updErr.message }, { status: 500 })
  }

  // Fire-and-forget emails — the unlink is already committed.
  void sendLeaveEmails({
    studentEmail: user.email ?? null,
    studentName,
    institutionName,
    reason,
  })

  return NextResponse.json({ success: true })
}

// ── Emails ────────────────────────────────────────────────────────────────────

async function sendLeaveEmails(input: {
  studentEmail: string | null
  studentName: string
  institutionName: string | null
  reason: string | null
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('[institutions/leave] RESEND_API_KEY missing — emails skipped')
    return
  }

  const instLabel = input.institutionName ?? 'your institution'

  const studentHtml = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#B8860B;margin:0 0 6px;">You&apos;ve left ${esc(instLabel)}</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 18px;">EdUsaathiAI · Unified Soul Partnership</p>
    <p style="font-size:15px;line-height:1.65;">Hi ${esc(input.studentName)},</p>
    <p style="font-size:15px;line-height:1.65;">
      We&apos;ve unlinked your account from <strong>${esc(instLabel)}</strong>. Your personal Saathi, your chat
      history, your notes, and your progress all stay with you — leaving an institution doesn&apos;t touch
      anything personal.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      <strong>Archive export:</strong> we&apos;re preparing a one-click export of anything you created inside your
      institution&apos;s classrooms over the last 7 days. You&apos;ll get a follow-up email within 24 hours with the
      download link. If you&apos;d like it sooner, reply to this email.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      If this was accidental, you can re-join anytime — no paperwork, just hit "Find My Institution" again.
    </p>
    <div style="margin-top:26px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:13px;color:#4A4740;">
      Warmly,<br/>
      <strong>The EdUsaathiAI team</strong><br/>
      <a href="mailto:admin@edusaathiai.in" style="color:#B8860B;text-decoration:none;">admin@edusaathiai.in</a>
    </div>
  </div>
</body></html>`.trim()

  const adminHtml = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:22px 20px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:14px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#B8860B;margin:0 0 12px;">Student dropped from institution</h1>
    <p style="font-size:14px;margin:0 0 6px;"><strong>Institution:</strong> ${esc(instLabel)}</p>
    <p style="font-size:14px;margin:0 0 6px;"><strong>Student:</strong> ${esc(input.studentName)}${input.studentEmail ? ' · ' + esc(input.studentEmail) : ''}</p>
    ${input.reason
      ? `<p style="font-size:12px;color:#7A7570;margin:14px 0 4px;letter-spacing:0.3px;text-transform:uppercase;font-weight:700;">Reason</p>
         <p style="padding:10px 14px;background:#FAF7F2;border-left:3px solid #B8860B;border-radius:6px;font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(input.reason)}</p>`
      : ''}
    <p style="margin-top:18px;font-size:11px;color:#A8A49E;">Archive export scheduled · 7-day window active.</p>
  </div>
</body></html>`.trim()

  const sendOne = async (to: string, subject: string, html: string) => {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[institutions/leave] Resend error', res.status, detail.slice(0, 300))
      }
    } catch (e) {
      console.error('[institutions/leave] Resend threw', e)
    }
  }

  const tasks: Array<Promise<void>> = []
  if (input.studentEmail) {
    tasks.push(sendOne(
      input.studentEmail,
      `You've left ${instLabel} · EdUsaathiAI`,
      studentHtml,
    ))
  }
  tasks.push(sendOne(
    ADMIN_EMAIL,
    `Student dropped — ${instLabel} · ${input.studentName}`,
    adminHtml,
  ))
  await Promise.all(tasks)
}
