// ─────────────────────────────────────────────────────────────────────────────
// GET /api/education-institutions/accept-invite
//
// Faculty invite click-through (Fix 3 — closes the Step-3b gap).
//
// invite-faculty emails a NO-account faculty member a signed link to this
// route. We verify the HMAC server-side (the secret can never reach the
// client; the old plan of "make /onboard parse params" was impossible —
// /onboard is a client component that bounces unauthenticated users to
// /login, dropping every param).
//
// On success we reuse the EXACT pipeline already proven end-to-end on a
// real principal: ensure the auth user exists (createUser if new) with
// institution metadata, generateLink → single-param token_hash, 302 to
// /auth/callback. The callback's institution branch (generalised to
// 'faculty') then links the profile and routes to /faculty. One
// continuous click-through, no second email, email-bound (the magic link
// authenticates exactly the invited address — no cross-account claim).
//
// Token contract (must mirror invite-faculty's signInviteToken EXACTLY):
//   HMAC-SHA256(`${email}|${institution_id}|${expiresUnixSec}`, INVITE_TOKEN_SECRET)
// URL carries institution=<slug> (not id) — we resolve slug→id before
// recomputing. email is canonicalised (trim+lowercase) on both sides.
//
// Failure → friendly redirects (login page renders the copy):
//   invalid token      → /login?error=invite_invalid
//   expired            → /login?error=invite_expired
//   institution gone / not trial|active → /login?error=invite_institution_inactive
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { checkRateLimit, clientIp } from '@/lib/ratelimit'

const SUPABASE_URL        = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY!
const INVITE_TOKEN_SECRET = process.env.INVITE_TOKEN_SECRET ?? ''

// Same host as the principal flow + the Supabase Auth redirect allowlist.
const SITE = 'https://www.edusaathiai.in'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(reason: 'invite_invalid' | 'invite_expired' | 'invite_institution_inactive') {
  return NextResponse.redirect(`${SITE}/login?error=${reason}`, 302)
}

/** Constant-time hex compare. Unequal length / non-hex → not equal. */
function tokenMatches(expectedHex: string, providedHex: string): boolean {
  try {
    const a = Buffer.from(expectedHex, 'hex')
    const b = Buffer.from(providedHex, 'hex')
    if (a.length === 0 || a.length !== b.length) return false
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

/**
 * Look up an auth user by exact email via the Supabase Admin REST endpoint
 * (same approach as invite-faculty — avoids paginating the whole user table).
 */
async function findAuthUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } },
    )
    if (!res.ok) return null
    const data = (await res.json()) as { users?: Array<{ id: string; email?: string }> }
    const exact = (data.users ?? []).find(
      (u) => (u.email ?? '').toLowerCase() === email,
    )
    return exact ? { id: exact.id } : null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  // Defense-in-depth: 30/hr per IP. The HMAC is the real auth (a token
  // can't be forged without the secret) — this just caps abuse/replay of
  // the createUser+generateLink work. Fails open if Upstash env absent.
  // On limit we REDIRECT (consistent UX for an email-clicked link) rather
  // than return the lib's raw 429 JSON.
  if (!(await checkRateLimit('edu-inst-accept-invite', clientIp(req), 30, 3600))) {
    return fail('invite_invalid')
  }

  if (!INVITE_TOKEN_SECRET) {
    console.error('[accept-invite] INVITE_TOKEN_SECRET not set')
    return fail('invite_invalid')
  }

  const sp        = req.nextUrl.searchParams
  const slug      = (sp.get('institution') ?? '').trim()
  const role      = (sp.get('role') ?? '').trim()
  const email     = (sp.get('email') ?? '').trim().toLowerCase()
  const expiresQ  = (sp.get('expires') ?? '').trim()
  const token     = (sp.get('token') ?? '').trim()

  // ── Shape validation ──────────────────────────────────────────────────────
  const expires = Number(expiresQ)
  if (
    role !== 'faculty' ||
    !slug ||
    !token ||
    !EMAIL_RE.test(email) ||
    !Number.isFinite(expires)
  ) {
    return fail('invite_invalid')
  }

  // ── Expiry (before any DB / user work) ────────────────────────────────────
  if (expires <= Math.floor(Date.now() / 1000)) {
    return fail('invite_expired')
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── Resolve slug → institution; must be live ──────────────────────────────
  const { data: inst } = await admin
    .from('education_institutions')
    .select('id, slug, status')
    .eq('slug', slug)
    .maybeSingle<{ id: string; slug: string; status: string }>()

  if (!inst || (inst.status !== 'trial' && inst.status !== 'active')) {
    return fail('invite_institution_inactive')
  }

  // ── Verify HMAC (slug→id, recompute, constant-time compare) ───────────────
  const expected = createHmac('sha256', INVITE_TOKEN_SECRET)
    .update(`${email}|${inst.id}|${expires}`)
    .digest('hex')

  if (!tokenMatches(expected, token)) {
    return fail('invite_invalid')
  }

  // ── Verified. Provision exactly like the principal flow ───────────────────
  // role on profiles is NEVER set here — institution access is additive.
  // education_institution_role='faculty' is set by the callback after the
  // magic link establishes the session (mirrors principal).
  const metadata = {
    institution_id:   inst.id,
    institution_slug: inst.slug,
    institution_role: 'faculty',
  }

  try {
    const existing = await findAuthUserByEmail(email)

    if (existing) {
      const { data: userRes } = await admin.auth.admin.getUserById(existing.id)
      const priorMeta = userRes?.user?.user_metadata ?? {}
      const { error: metaErr } = await admin.auth.admin.updateUserById(
        existing.id,
        { user_metadata: { ...priorMeta, ...metadata } },
      )
      if (metaErr) throw new Error(`metadata update failed: ${metaErr.message}`)
    } else {
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: metadata,
        })
      if (createErr || !created?.user) {
        throw new Error(
          `user creation failed: ${createErr?.message ?? 'no user returned'}`,
        )
      }
    }

    const { data: linkData, error: genErr } =
      await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo: `${SITE}/auth/callback` },
      })
    const tokenHash = linkData?.properties?.hashed_token
    if (genErr || !tokenHash) {
      throw new Error(`link generation failed: ${genErr?.message ?? 'no token'}`)
    }

    // Single-param token_hash — the prefetch-proof pattern proven on the
    // real principal. The callback infers type=magiclink, then its
    // (generalised) institution branch links the faculty profile.
    return NextResponse.redirect(
      `${SITE}/auth/callback?token_hash=${encodeURIComponent(tokenHash)}`,
      302,
    )
  } catch (e) {
    console.error(
      '[accept-invite] provisioning failed',
      e instanceof Error ? e.message : 'unknown',
    )
    return fail('invite_invalid')
  }
}
