// ─────────────────────────────────────────────────────────────────────────────
// POST /api/education-institutions/join
//
// Authenticated. Body: { education_institution_id }. Requires the target
// education institution to be in 'trial' or 'active' status. Links the
// student's profile and sets education_institution_role='student',
// education_institution_joined_at=now.
//
// Principals and faculty join via a different (admin-only) flow — this
// endpoint only self-assigns the student role.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY   = process.env.RESEND_API_KEY
const FROM_ADDRESS     = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'
const ADMIN_EMAIL      = 'admin@edusaathiai.in'
const ADMIN_DASHBOARD_BASE = 'https://edusaathiai-admin.vercel.app/education-institutions'

// Phase I-2 Step 7 — capacity caps. Hard cap is 10% over the
// declared_capacity an institution self-reported. Between 100% and 110%
// the join still succeeds but the founder is notified so capacity can
// be re-negotiated; at 110% new joins are rejected outright.
const CAPACITY_BUFFER_RATIO  = 1.1
const DEFAULT_CAPACITY       = 200

type Body = { education_institution_id?: string }

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }
  const eduInstId = body.education_institution_id?.trim()
  if (!eduInstId) {
    return NextResponse.json({ error: 'education_institution_id_required' }, { status: 400 })
  }

  // Verify target institution exists and is in an acceptable state.
  const { data: inst } = await supabase
    .from('education_institutions')
    .select('id, name, status, declared_capacity')
    .eq('id', eduInstId)
    .maybeSingle()
  if (!inst) {
    return NextResponse.json({ error: 'education_institution_not_found' }, { status: 404 })
  }
  if (inst.status !== 'trial' && inst.status !== 'active') {
    return NextResponse.json({ error: 'education_institution_not_open', detail: inst.status }, { status: 403 })
  }

  // Use service role to write — profiles RLS may not let the user self-mutate
  // education_institution_* fields.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── Phase I-2 Step 7: capacity caps ────────────────────────────────────
  // Count current students linked to this institution. Service-role for
  // the count because faculty/student RLS on profiles wouldn't surface
  // peers — only admin can see the full roster.
  const { count: currentStudentsRaw } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('education_institution_id', eduInstId)
    .eq('education_institution_role', 'student')

  const currentStudents  = currentStudentsRaw ?? 0
  const declaredCapacity = inst.declared_capacity ?? DEFAULT_CAPACITY
  const hardCap          = Math.floor(declaredCapacity * CAPACITY_BUFFER_RATIO)

  // Hard cap (110%) — block.
  if (currentStudents >= hardCap) {
    return NextResponse.json(
      {
        error:   'institution_at_capacity',
        message: 'This institution has reached its student capacity. Contact your college admin.',
        contact: 'admin@edusaathiai.in',
      },
      { status: 409 },
    )
  }

  // Declared capacity (100%) — allow but notify the founder so plan
  // capacity can be re-negotiated. Fire-and-forget; a notification
  // failure must never block a student's join. The .catch swallows any
  // rejected promise that could otherwise crash the route handler.
  if (currentStudents >= declaredCapacity) {
    void notifyAdminCapacityReached({
      institutionName: inst.name,
      institutionId:   inst.id,
      currentStudents,
      declaredCapacity,
    }).catch(() => {})
  }

  const { error: updErr } = await admin
    .from('profiles')
    .update({
      education_institution_id:                eduInstId,
      education_institution_role:              'student',
      education_institution_joined_at:         new Date().toISOString(),
      education_institution_drop_requested_at: null,
    })
    .eq('id', user.id)

  if (updErr) {
    return NextResponse.json({ error: 'join_failed', detail: updErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// ── Capacity notification ────────────────────────────────────────────────────
//
// Phase I-2 Step 7. Sent to admin@edusaathiai.in when an institution
// crosses 100% of its declared capacity but is still under the 110%
// hard cap (the join itself is allowed). Fire-and-forget — never
// awaited from the request path; a Resend outage cannot block a join.
// Mirrors the gold-accent visual style used by
// /api/education-institutions/register so the founder sees a
// consistent format for institution-lifecycle alerts.

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function notifyAdminCapacityReached(params: {
  institutionName:  string
  institutionId:    string
  currentStudents:  number
  declaredCapacity: number
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[education-institutions/join] RESEND_API_KEY missing — capacity alert skipped')
    return
  }

  const adminUrl = `${ADMIN_DASHBOARD_BASE}/${esc(params.institutionId)}`

  const subject = `Institution at declared capacity — ${params.institutionName}`

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#B8860B;margin:0 0 6px;">Institution at declared capacity</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 22px;">EdUsaathiAI · capacity alert</p>

    <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">
      <strong>${esc(params.institutionName)}</strong> has reached its declared capacity
      of <strong>${params.declaredCapacity}</strong> students.
    </p>

    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E8E4DD;border-radius:10px;overflow:hidden;margin:14px 0;">
      <tr>
        <td style="padding:8px 12px;color:#7A7570;font-size:12px;letter-spacing:0.3px;text-transform:uppercase;font-weight:700;">Current registered</td>
        <td style="padding:8px 12px;font-size:14px;font-variant-numeric:tabular-nums;">${params.currentStudents}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;color:#7A7570;font-size:12px;letter-spacing:0.3px;text-transform:uppercase;font-weight:700;border-top:1px solid #E8E4DD;">Declared capacity</td>
        <td style="padding:8px 12px;font-size:14px;font-variant-numeric:tabular-nums;border-top:1px solid #E8E4DD;">${params.declaredCapacity}</td>
      </tr>
    </table>

    <p style="font-size:15px;line-height:1.65;margin:14px 0;">
      The join was allowed. Consider discussing an upgrade with the principal.
    </p>

    <p style="margin:22px 0 0;">
      <a href="${adminUrl}" style="display:inline-block;padding:10px 18px;background:#B8860B;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">View in Admin →</a>
    </p>

    <p style="margin-top:24px;font-size:11px;color:#A8A49E;">
      Hard cap is set at ${Math.floor(params.declaredCapacity * CAPACITY_BUFFER_RATIO)} students
      (110% of declared). New joins above the hard cap are blocked
      with HTTP 409.
    </p>
  </div>
</body></html>`.trim()

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    FROM_ADDRESS,
        to:      [ADMIN_EMAIL],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[education-institutions/join] Resend non-200', res.status, detail.slice(0, 300))
    }
  } catch (e) {
    console.error('[education-institutions/join] Resend threw', e)
  }
}
