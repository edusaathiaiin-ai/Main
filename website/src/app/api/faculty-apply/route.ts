import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/faculty-apply
 *
 * Public endpoint — anonymous visitors on /teach can submit without auth.
 * Validates every field server-side (never trust the client), inserts into
 * faculty_applications via service role, and emails admin.
 *
 * Response: { ok: true, applicationId } on success, { error } otherwise.
 */

// ── Config ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const RESEND_API_KEY    = process.env.RESEND_API_KEY
const RESEND_FROM_EMAIL: string = process.env.RESEND_FROM_EMAIL || 'EdUsaathiAI <admin@edusaathiai.in>'
const ADMIN_EMAIL       = process.env.ADMIN_EMAIL ?? 'jaydeep@edusaathiai.in'

// Canonical 30 slugs — keep in sync with website/src/constants/saathis.ts
// Duplicated on purpose: API route runs server-side where importing the
// full SAATHIS array (with UI metadata) is wasteful for a simple enum check.
const CANONICAL_SLUGS = new Set([
  'accountsaathi','aerospacesaathi','agrisaathi','archsaathi','biosaathi',
  'biotechsaathi','bizsaathi','chemengg-saathi','chemsaathi','civilsaathi',
  'compsaathi','econsaathi','elecsaathi','electronicssaathi','envirosaathi',
  'finsaathi','geosaathi','historysaathi','hrsaathi','kanoonsaathi',
  'maathsaathi','mechsaathi','medicosaathi','mktsaathi','nursingsaathi',
  'pharmasaathi','physicsaathi','polscisaathi','psychsaathi','statssaathi',
])

// ── Validation helpers ────────────────────────────────────────────────
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE    = /^\+?91[6-9]\d{9}$/               // Indian mobile
const URL_RE      = /^https?:\/\/[^\s]+$/

function s(v: unknown): string { return typeof v === 'string' ? v.trim() : '' }

type Validated = {
  full_name:               string
  email:                   string
  wa_phone:                string
  primary_saathi_slug:     string
  additional_saathi_slugs: string[]
  highest_qualification:   string
  current_institution:     string | null
  years_experience:        number
  session_fee_rupees:      number
  short_bio:               string
  linkedin_url:            string | null
  areas_of_expertise:      string | null
}

function validate(body: Record<string, unknown>): { ok: true; data: Validated } | { ok: false; error: string } {
  const full_name             = s(body.full_name)
  const email                 = s(body.email).toLowerCase()
  const waRaw                 = s(body.wa_phone).replace(/[\s-]/g, '')
  const primary_saathi_slug   = s(body.primary_saathi_slug)
  const highest_qualification = s(body.highest_qualification)
  const current_institution   = s(body.current_institution)
  const short_bio             = s(body.short_bio)
  const linkedin_url          = s(body.linkedin_url)
  const areas_of_expertise    = s(body.areas_of_expertise)

  const additional = Array.isArray(body.additional_saathi_slugs)
    ? body.additional_saathi_slugs.filter((x): x is string => typeof x === 'string')
    : []

  const yrs = Number(body.years_experience)
  const fee = Number(body.session_fee_rupees)

  // Required
  if (!full_name   || full_name.length < 2 || full_name.length > 80)
    return { ok: false, error: 'Full name is required (2–80 chars)' }
  if (!EMAIL_RE.test(email))
    return { ok: false, error: 'Valid email required' }

  // Normalise WhatsApp number — accept 10-digit (starts 6-9), or +91-prefixed
  let wa_phone = waRaw
  if (/^[6-9]\d{9}$/.test(wa_phone)) wa_phone = `+91${wa_phone}`
  if (!PHONE_RE.test(wa_phone))
    return { ok: false, error: 'Valid 10-digit Indian WhatsApp number required' }
  if (!wa_phone.startsWith('+')) wa_phone = `+${wa_phone}`

  if (!CANONICAL_SLUGS.has(primary_saathi_slug))
    return { ok: false, error: 'Please pick a primary subject from the list' }

  for (const slug of additional) {
    if (!CANONICAL_SLUGS.has(slug))
      return { ok: false, error: `Unknown subject slug: ${slug}` }
  }

  if (!highest_qualification || highest_qualification.length > 80)
    return { ok: false, error: 'Qualification is required (≤80 chars)' }

  if (!Number.isFinite(yrs) || yrs < 0 || yrs > 70)
    return { ok: false, error: 'Years of experience must be 0–70' }

  if (!Number.isFinite(fee) || fee < 100 || fee > 10000)
    return { ok: false, error: 'Session fee must be ₹100–₹10,000 per hour' }

  if (!short_bio || short_bio.length < 20 || short_bio.length > 400)
    return { ok: false, error: 'Short bio is required (20–400 chars)' }

  if (linkedin_url && !URL_RE.test(linkedin_url))
    return { ok: false, error: 'LinkedIn URL must start with http(s)://' }

  if (areas_of_expertise.length > 300)
    return { ok: false, error: 'Areas of expertise max 300 chars' }

  return {
    ok: true,
    data: {
      full_name,
      email,
      wa_phone,
      primary_saathi_slug,
      additional_saathi_slugs: additional,
      highest_qualification,
      current_institution:     current_institution || null,
      years_experience:        Math.floor(yrs),
      session_fee_rupees:      Math.floor(fee),
      short_bio,
      linkedin_url:            linkedin_url || null,
      areas_of_expertise:      areas_of_expertise || null,
    },
  }
}

// ── Admin email ────────────────────────────────────────────────────────

async function notifyAdminEmail(data: Validated, applicationId: string) {
  if (!RESEND_API_KEY || !SUPABASE_URL || !SERVICE_ROLE_KEY) return

  // Check if applicant was nominated by a student
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: nomination } = await admin
    .from('faculty_nominations')
    .select('faculty_name, nominated_by_user_id')
    .eq('faculty_email', data.email.toLowerCase())
    .neq('status', 'declined')
    .maybeSingle()

  let nominatedBy = 'Direct application \u2014 found us independently'
  if (nomination?.nominated_by_user_id) {
    const { data: nominator } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', nomination.nominated_by_user_id)
      .single()
    nominatedBy = `${nominator?.full_name ?? 'Unknown'} (student referral)`
  }

  const row = (label: string, value: string | number | null) =>
    `<tr><td style="padding:10px;border:1px solid #ddd;font-weight:bold;background:#f9f9f9;">${label}</td><td style="padding:10px;border:1px solid #ddd;">${value ?? '\u2014'}</td></tr>`

  const appliedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })

  const html = `<h2>New Faculty Application Waiting for Approval</h2>
<table style="border-collapse:collapse;width:100%;font-family:Arial,sans-serif;">
${row('Name', escapeHtml(data.full_name))}
${row('Email', escapeHtml(data.email))}
${row('WhatsApp', escapeHtml(data.wa_phone))}
${row('Primary Saathi', escapeHtml(data.primary_saathi_slug))}
${row('Expertise', escapeHtml(data.areas_of_expertise ?? '\u2014'))}
${row('Qualification', escapeHtml(data.highest_qualification))}
${row('Institution', escapeHtml(data.current_institution ?? '\u2014'))}
${row('Experience', data.years_experience + ' years')}
${row('Fee / hr', '\u20b9' + data.session_fee_rupees)}
${row('LinkedIn', escapeHtml(data.linkedin_url ?? '\u2014'))}
${row('Nominated by', nominatedBy)}
${row('Applied at', appliedAt + ' IST')}
</table>

<div style="background:#FFFFFF;border-left:3px solid #B8860B;padding:14px 18px;border-radius:4px;margin:20px 0">
<p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#B8860B;font-weight:600">Short bio</p>
<p style="margin:0;font-size:13px;color:#1A1814;line-height:1.55">${escapeHtml(data.short_bio)}</p>
</div>

<p style="font-size:12px;color:#A8A49E;margin:0 0 20px;">Application ID: <code>${applicationId}</code></p>

<a href="https://edusaathiai-admin.vercel.app/faculty/applications" style="display:inline-block;background:#C9993A;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">Review Application \u2192</a>
&nbsp;&nbsp;
<a href="https://edusaathiai-admin.vercel.app/faculty/nominations" style="display:inline-block;background:#060F1D;color:#fff;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">View Nominations \u2192</a>`

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     'EdUsaathiAI <admin@edusaathiai.in>',
      to:       [ADMIN_EMAIL],
      reply_to: data.email,
      subject:  `\uD83D\uDD14 New Faculty Application \u2014 ${data.full_name} (${data.areas_of_expertise ?? data.primary_saathi_slug})`,
      html,
    }),
  }).then(async (res) => {
    if (res && !res.ok) {
      const errText = await res.text().catch(() => 'unknown')
      console.error('[faculty-apply] admin email rejected:', res.status, errText)
    }
  }).catch((e) => console.error('[faculty-apply] admin email failed:', e))
}

// ── Applicant confirmation email ──────────────────────────────────────

async function notifyApplicantEmail(data: Validated) {
  if (!RESEND_API_KEY) return
  const firstName = data.full_name.split(' ')[0]

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Jaydeep Buch \u2014 EdUsaathiAI <jaydeep@edusaathiai.in>',
      to: [data.email],
      subject: 'Application received \u2014 EdUsaathiAI \u2726',
      reply_to: 'jaydeep@edusaathiai.in',
      html: `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<tr><td style="background:#060F1D;padding:28px 36px;text-align:center;">
<h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;">Edu<span style="color:#C9993A;">saathi</span>AI</h1>
<p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:0.05em;">WHERE EVERY SUBJECT FINDS ITS SAATHI</p>
</td></tr>
<tr><td style="padding:36px;">
<p style="font-size:16px;color:#1A1814;margin:0 0 20px;">Dear <strong>${escapeHtml(firstName)}</strong>,</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">Thank you for applying to EdUsaathiAI as a faculty member.</p>
<p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">Your application is under review. We typically respond within <strong>48 hours</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F9F7F4;border-radius:10px;margin:0 0 24px;"><tr><td style="padding:20px 24px;">
<p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1A1814;text-transform:uppercase;letter-spacing:0.06em;">What happens next</p>
<table cellpadding="0" cellspacing="0">
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Admin reviews your credentials</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0You receive a verification email within 48 hours</td></tr>
<tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Once verified \u2014 your profile goes live for students to discover</td></tr>
</table>
</td></tr></table>
<p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 8px;">If you have any questions in the meantime, reply directly to this email.</p>
<p style="font-size:14px;color:#444;margin:0;">With respect,<br><strong>Jaydeep Buch</strong><br><span style="color:#888;font-size:13px;">Founder, EdUsaathiAI \u00b7 Ahmedabad</span></p>
</td></tr>
<tr><td style="background:#F9F7F4;padding:20px 36px;border-top:1px solid #EBEBEB;">
<p style="margin:0;font-size:11px;color:#999;text-align:center;">EdUsaathiAI \u00b7 Ahmedabad, Gujarat, India<br><a href="https://edusaathiai.in" style="color:#C9993A;text-decoration:none;">edusaathiai.in</a></p>
</td></tr>
</table></td></tr></table></body></html>`,
    }),
  }).catch((e) => console.error('[faculty-apply] applicant email failed:', e))
}

// ── Nomination linkback ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function notifyNominatingStudent(
  admin: any,
  facultyEmail: string,
  applicationId: string,
) {
  try {
    // Check if this faculty email was nominated
    const { data: nominationRaw } = await admin
      .from('faculty_nominations')
      .select('id, faculty_name, nominated_by_user_id, nominator_type')
      .eq('faculty_email', facultyEmail.toLowerCase())
      .neq('status', 'declined')
      .maybeSingle()

    const nomination = nominationRaw as {
      id: string
      faculty_name: string
      nominated_by_user_id: string | null
      nominator_type: string
    } | null

    if (!nomination?.nominated_by_user_id) return

    // Get the nominating student's details
    const { data: studentRaw } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', nomination.nominated_by_user_id)
      .single()

    const student = studentRaw as { full_name: string | null; email: string | null } | null

    if (!student?.email) return

    // Update nomination status to 'applied' + link the application
    await admin
      .from('faculty_nominations')
      .update({
        status: 'applied',
        faculty_profile_id: applicationId,
        student_notified_applied_at: new Date().toISOString(),
      })
      .eq('id', nomination.id)

    // Fire student notification email
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return

    await fetch(`${SUPABASE_URL}/functions/v1/notify-student-faculty-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        type: 'applied',
        nominationId: nomination.id,
        studentEmail: student.email,
        studentName: student.full_name,
        facultyName: nomination.faculty_name,
      }),
    })
  } catch (e) {
    // Never block the /teach response — log and move on
    console.error('[faculty-apply] nomination linkback failed:', e)
  }
}

// ── Route ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = validate(body)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const sourceIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const userAgent = req.headers.get('user-agent') ?? null

  const { data: row, error } = await admin
    .from('faculty_applications')
    .insert({
      ...result.data,
      source_ip:  sourceIp,
      user_agent: userAgent?.slice(0, 500),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[faculty-apply] insert failed:', error.message)
    return NextResponse.json({ error: 'Could not save — please try again' }, { status: 500 })
  }

  // Fire-and-forget — never blocks the user response
  void notifyAdminEmail(result.data, row.id as string)
  void notifyApplicantEmail(result.data)
  void notifyNominatingStudent(admin, result.data.email, row.id as string)

  return NextResponse.json({ ok: true, applicationId: row.id })
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c))
}
