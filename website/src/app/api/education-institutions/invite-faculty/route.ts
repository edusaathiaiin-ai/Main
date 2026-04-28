// ─────────────────────────────────────────────────────────────────────────────
// POST /api/education-institutions/invite-faculty
//
// Phase I-2 Step 3 — Faculty invite system. Authenticated principals invite
// individual faculty by email. Three response shapes, one per branch:
//
//   { status: 'invited' }        — email had no auth.users row; signed
//                                   invite URL emailed; faculty signs up
//                                   via /onboard?... in Step 3b
//   { status: 'linked' }         — email had a profile that wasn't yet
//                                   bound to any institution; linked here
//                                   as faculty + welcome email sent
//   { status: 'already_linked' } — email is already faculty/principal of
//                                   THIS institution (idempotent no-op)
//
// Auth — JWT required. Caller must:
//   • be logged in (server-side getUser)
//   • have profile.education_institution_role = 'principal'
//   • have profile.education_institution_id set
//   • the institution.status must be in ('trial', 'active')
//
// Faculty cap — MAX(10, FLOOR(declared_capacity / 10)).
//   200 students → 20 faculty slots
//   500 students → 50 faculty slots
// At cap → 400 'faculty_limit_reached' with current + limit in payload.
//
// Token — HMAC-SHA256 of "${email}|${institution_id}|${expires_unix}" using
// INVITE_TOKEN_SECRET (dedicated env var, stable across service-role
// rotations). Verifier later re-derives expectations from URL params.
//
// Error responses use { error: <code>, ...detail } so the client can
// render a tailored message per branch.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createHmac } from 'node:crypto'

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!
const INVITE_TOKEN_SECRET = process.env.INVITE_TOKEN_SECRET ?? ''
const RESEND_API_KEY      = process.env.RESEND_API_KEY
const FROM_ADDRESS        = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'
const SITE_URL            = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edusaathiai.in'

const INVITE_EXPIRY_SECONDS = 7 * 24 * 60 * 60  // 7 days
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ── Helpers ─────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sign an invite payload. Layout:
 *   token = HMAC-SHA256(`${email}|${institutionId}|${expiresUnixSec}`)
 *
 * Email is canonicalised (trim+lowercase) by the caller before reaching here
 * so signing and verification stay deterministic across casings.
 *
 * Verifier later reads `email`, `institution` (slug → look up id), and
 * `expires` from the URL, recomputes HMAC, constant-time compares to
 * `token`, then enforces `expires > now()`.
 */
function signInviteToken(email: string, institutionId: string, expiresUnixSec: number): string {
  const payload = `${email}|${institutionId}|${expiresUnixSec}`
  return createHmac('sha256', INVITE_TOKEN_SECRET).update(payload).digest('hex')
}

/**
 * Look up an auth user by email via the Supabase Admin REST endpoint. Used
 * instead of `supabase-js auth.admin.listUsers()` because that paginates
 * the entire user table; the REST endpoint accepts `?email=` directly.
 *
 * Returns null on 4xx/5xx and on no exact match — both are "not found"
 * for our branching purposes.
 */
async function findAuthUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      {
        headers: {
          apikey:        SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
      },
    )
    if (!res.ok) return null
    const data = await res.json() as { users?: Array<{ id: string; email?: string }> }
    const users = data.users ?? []
    // The endpoint may match prefixes / partials in some tiers — narrow to
    // an exact case-insensitive match before returning.
    const exact = users.find((u) => (u.email ?? '').toLowerCase() === email)
    if (!exact) return null
    return { id: exact.id, email: exact.email ?? email }
  } catch {
    return null
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

type Body = { email?: string; name?: string }

type Institution = {
  id:                  string
  slug:                string
  name:                string
  status:              'pending' | 'demo' | 'trial' | 'active' | 'suspended' | 'churned'
  declared_capacity:   number | null
  principal_name:      string | null
}

// ── Handler ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!INVITE_TOKEN_SECRET) {
    console.error('[invite-faculty] INVITE_TOKEN_SECRET not set in env')
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 })
  }

  // ── Parse + validate body ─────────────────────────────────────────────────
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const email = (body.email ?? '').trim().toLowerCase()
  const name  = (body.name  ?? '').trim().slice(0, 100)
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (name.length < 2) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }

  // ── 1. Caller must be a logged-in principal ──────────────────────────────
  const userClient = await createServerClient()
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: profile } = await userClient
    .from('profiles')
    .select('education_institution_id, education_institution_role, full_name')
    .eq('id', user.id)
    .maybeSingle<{
      education_institution_id:   string | null
      education_institution_role: 'principal' | 'faculty' | 'student' | null
      full_name:                  string | null
    }>()

  if (
    !profile?.education_institution_id ||
    profile.education_institution_role !== 'principal'
  ) {
    return NextResponse.json({ error: 'forbidden_principal_only' }, { status: 403 })
  }

  // Service role for everything past the auth check — caller already verified.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: institution } = await admin
    .from('education_institutions')
    .select('id, slug, name, status, declared_capacity, principal_name')
    .eq('id', profile.education_institution_id)
    .maybeSingle<Institution>()

  if (!institution) {
    return NextResponse.json({ error: 'institution_not_found' }, { status: 404 })
  }

  if (institution.status !== 'trial' && institution.status !== 'active') {
    return NextResponse.json(
      { error: 'institution_inactive', status: institution.status },
      { status: 403 },
    )
  }

  // ── 2. Faculty cap ────────────────────────────────────────────────────────
  const { count: facultyCount, error: countErr } = await admin
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('education_institution_id', institution.id)
    .eq('education_institution_role', 'faculty')

  if (countErr) {
    return NextResponse.json({ error: 'count_failed', detail: countErr.message }, { status: 500 })
  }

  const capacity     = institution.declared_capacity ?? 200
  const facultyLimit = Math.max(10, Math.floor(capacity / 10))

  if ((facultyCount ?? 0) >= facultyLimit) {
    return NextResponse.json({
      error:   'faculty_limit_reached',
      current: facultyCount ?? 0,
      limit:   facultyLimit,
    }, { status: 400 })
  }

  // ── 3. Email exists in profiles? ──────────────────────────────────────────
  const existingUser = await findAuthUserByEmail(email)

  if (existingUser) {
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, education_institution_id, education_institution_role, full_name')
      .eq('id', existingUser.id)
      .maybeSingle<{
        id:                         string
        education_institution_id:   string | null
        education_institution_role: 'principal' | 'faculty' | 'student' | null
        full_name:                  string | null
      }>()

    const otherInstId = existingProfile?.education_institution_id ?? null

    if (otherInstId && otherInstId !== institution.id) {
      // Linked elsewhere — never silently re-bind. Principal must coordinate
      // with the other institution to release this faculty member first.
      return NextResponse.json({
        error: 'already_linked_elsewhere',
      }, { status: 400 })
    }

    if (otherInstId === institution.id) {
      // Idempotent no-op — they're already part of this institution.
      return NextResponse.json({ status: 'already_linked' }, { status: 200 })
    }

    // Unlinked existing user → bind as faculty
    const { error: updErr } = await admin
      .from('profiles')
      .update({
        education_institution_id:        institution.id,
        education_institution_role:      'faculty',
        education_institution_joined_at: new Date().toISOString(),
      })
      .eq('id', existingUser.id)

    if (updErr) {
      return NextResponse.json({ error: 'link_failed', detail: updErr.message }, { status: 500 })
    }

    void sendInviteEmail({
      kind:        'welcome_link',
      to:          email,
      facultyName: name,
      institution,
      principalDisplayName: profile.full_name ?? institution.principal_name ?? null,
    })

    return NextResponse.json({ status: 'linked' }, { status: 200 })
  }

  // ── 4. Email NOT in profiles → generate signed invite link, email it ─────
  const expiresUnixSec = Math.floor(Date.now() / 1000) + INVITE_EXPIRY_SECONDS
  const token          = signInviteToken(email, institution.id, expiresUnixSec)

  const params = new URLSearchParams({
    institution: institution.slug,
    role:        'faculty',
    email,
    expires:     String(expiresUnixSec),
    token,
  })
  const inviteUrl = `${SITE_URL}/onboard?${params.toString()}`

  // TODO Phase I-2 Step 3b: /onboard route does not yet parse
  // institution/role/email/token/expires query params.
  // Faculty click-through wiring comes in a subsequent step.
  // This route generates and emails the signed URL only.

  void sendInviteEmail({
    kind:        'invite',
    to:          email,
    facultyName: name,
    institution,
    inviteUrl,
    principalDisplayName: profile.full_name ?? institution.principal_name ?? null,
  })

  return NextResponse.json({ status: 'invited' }, { status: 200 })
}

// ── Email templates ─────────────────────────────────────────────────────────
//
// Two visual variants share the same gold-accent shell pattern used by
// /api/education-institutions/register and the education-institution-trial-check
// edge function: gold gradient bar, Georgia serif headline, warm body copy,
// founder signature, single CTA button. All inline styles for client
// compatibility (Outlook/Gmail strip <head> styles).

type SendArgs =
  | {
      kind:                 'invite'
      to:                   string
      facultyName:          string
      institution:          Institution
      inviteUrl:            string
      principalDisplayName: string | null
    }
  | {
      kind:                 'welcome_link'
      to:                   string
      facultyName:          string
      institution:          Institution
      principalDisplayName: string | null
    }

async function sendInviteEmail(args: SendArgs): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('[invite-faculty] RESEND_API_KEY missing — email skipped', { kind: args.kind, to: args.to })
    return
  }

  const greeting = `Dr. ${esc(args.facultyName)}`
  const principalCredit = args.principalDisplayName
    ? `<strong>${esc(args.principalDisplayName)}</strong> has invited you`
    : 'Your principal has invited you'

  const subject = args.kind === 'invite'
    ? `${args.institution.name} has invited you to teach with EdUsaathiAI`
    : `You're now part of ${args.institution.name} on EdUsaathiAI`

  const ctaUrl  = args.kind === 'invite' ? args.inviteUrl : `${SITE_URL}/login`
  const ctaText = args.kind === 'invite' ? 'Set up your faculty account →' : 'Log in to your dashboard →'

  const headline = args.kind === 'invite'
    ? `You&apos;re invited to teach at ${esc(args.institution.name)}`
    : `Welcome to ${esc(args.institution.name)} on EdUsaathiAI`

  const bodyCopy = args.kind === 'invite'
    ? `
        ${principalCredit} to teach at <strong>${esc(args.institution.name)}</strong>
        through EdUsaathiAI. The setup takes about two minutes — no separate
        billing for you, the institution handles everything.
      `
    : `
        ${principalCredit} to join <strong>${esc(args.institution.name)}</strong>
        on EdUsaathiAI as faculty. Your existing account is now connected to
        the institution — log in and your faculty tools are ready to go.
      `

  const expiryNote = args.kind === 'invite'
    ? `<p style="color:#A8A49E;font-size:12px;margin:14px 0 0;">This invite link expires in 7 days.</p>`
    : ''

  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#B8860B;margin:0 0 6px;">${headline}</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 22px;">EdUsaathiAI · Unified Soul Partnership</p>

    <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">Dear ${greeting},</p>

    <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">${bodyCopy.trim()}</p>

    <p style="font-size:15px;line-height:1.65;margin:0 0 14px;">
      EdUsaathiAI gives every faculty an AI teaching partner with research-grade
      tools — a multiplayer canvas, 30 subject-tailored Saathis, the Research
      Archive (a permanent scientific notebook for every session), and a one-click
      AI assistant that surfaces the right tool when you teach.
    </p>

    <p style="margin:24px 0;text-align:center;">
      <a href="${esc(ctaUrl)}" style="display:inline-block;padding:13px 26px;background:#B8860B;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">${ctaText}</a>
    </p>

    ${expiryNote}

    <p style="font-size:14px;line-height:1.65;color:#4A4740;margin:22px 0 0;">
      If anything is unclear, just reply to this email — I read every reply
      personally.
    </p>

    <div style="margin-top:26px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:13px;color:#4A4740;">
      Warmly,<br/>
      <strong>Jaydeep Buch</strong><br/>
      Founder, EdUsaathiAI<br/>
      <a href="mailto:admin@edusaathiai.in" style="color:#B8860B;text-decoration:none;">admin@edusaathiai.in</a>
    </div>
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
        to:      [args.to],
        subject,
        html,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error('[invite-faculty] Resend non-200', res.status, detail.slice(0, 300))
    }
  } catch (e) {
    console.error('[invite-faculty] Resend threw', e)
  }
}
