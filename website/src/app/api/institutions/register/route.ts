// ─────────────────────────────────────────────────────────────────────────────
// POST /api/institutions/register
//
// Public registration for schools / colleges. Server-side validation,
// slug generation (URL-safe + unique), insert with status='pending', and
// two Resend emails:
//   1. Auto-response to principal_email (warm acknowledgement)
//   2. Admin notification to admin@edusaathiai.in (operational alert)
//
// Never auto-verifies — the admin team manually flips status='demo' or
// 'trial' after review, per CLAUDE.md.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ensureUniqueInstitutionSlug } from '@/lib/slugify'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY   = process.env.RESEND_API_KEY
const FROM_ADDRESS     = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'
const ADMIN_EMAIL      = 'admin@edusaathiai.in'
const ADMIN_DASHBOARD  = 'https://edusaathiai-admin.vercel.app/institutions'

type RegisterBody = {
  name?:                 string
  city?:                 string
  state?:                string
  affiliation?:          string
  principal_name?:       string
  principal_email?:      string
  contact_phone?:        string
  website?:              string
  approximate_strength?: string
  onboarding_answer?:    string
  active_saathi_slugs?:  string[]
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(req: NextRequest) {
  let body: RegisterBody
  try {
    body = (await req.json()) as RegisterBody
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // ── Validate required fields ───────────────────────────────────────────────
  const name            = (body.name ?? '').trim()
  const city            = (body.city ?? '').trim()
  const principalEmail  = (body.principal_email ?? '').trim().toLowerCase()

  if (name.length < 2)           return NextResponse.json({ error: 'name_required' }, { status: 400 })
  if (city.length < 2)           return NextResponse.json({ error: 'city_required' }, { status: 400 })
  if (!EMAIL_RE.test(principalEmail)) {
    return NextResponse.json({ error: 'valid_principal_email_required' }, { status: 400 })
  }

  // Normalise remaining fields — empty-string → null keeps the row tidy.
  const optional = {
    state:                (body.state ?? '').trim() || 'Gujarat',
    affiliation:          (body.affiliation ?? '').trim() || null,
    principal_name:       (body.principal_name ?? '').trim() || null,
    contact_phone:        (body.contact_phone ?? '').trim() || null,
    website:              (body.website ?? '').trim() || null,
    approximate_strength: (body.approximate_strength ?? '').trim() || null,
    onboarding_answer:    (body.onboarding_answer ?? '').trim() || null,
    active_saathi_slugs:  Array.isArray(body.active_saathi_slugs)
                            ? body.active_saathi_slugs.filter((s) => typeof s === 'string' && s.trim().length > 0)
                            : null,
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── Generate unique slug + insert ──────────────────────────────────────────
  let slug: string
  try {
    slug = await ensureUniqueInstitutionSlug(admin, name)
  } catch {
    return NextResponse.json({ error: 'slug_generation_failed' }, { status: 500 })
  }

  const { data: inserted, error: insErr } = await admin
    .from('institutions')
    .insert({
      slug,
      name,
      city,
      principal_email: principalEmail,
      status:          'pending',
      ...optional,
    })
    .select('id, slug, name, city')
    .single()

  if (insErr || !inserted) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insErr?.message ?? 'unknown' },
      { status: 500 },
    )
  }

  // ── Emails (fire-and-forget on failure — row is already saved) ─────────────
  void sendRegistrationEmails({
    name, city, principalEmail, slug,
    principalName:       optional.principal_name,
    affiliation:         optional.affiliation,
    approximateStrength: optional.approximate_strength,
    website:             optional.website,
    phone:               optional.contact_phone,
    onboardingAnswer:    optional.onboarding_answer,
  })

  return NextResponse.json({ success: true, slug })
}

// ── Emailing ──────────────────────────────────────────────────────────────────

async function sendRegistrationEmails(input: {
  name: string
  city: string
  principalEmail: string
  slug: string
  principalName: string | null
  affiliation: string | null
  approximateStrength: string | null
  website: string | null
  phone: string | null
  onboardingAnswer: string | null
}): Promise<void> {
  if (!RESEND_API_KEY) {
    console.error('[institutions/register] RESEND_API_KEY missing — emails skipped')
    return
  }

  const greeting = input.principalName ? `Dear ${esc(input.principalName)},` : 'Hello,'

  // 1. Auto-response to the principal
  const autoHtml = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#B8860B;margin:0 0 6px;">We&apos;ve received your registration</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 18px;">EdUsaathiAI · Unified Soul Partnership</p>
    <p style="font-size:15px;line-height:1.65;">${greeting}</p>
    <p style="font-size:15px;line-height:1.65;">
      Thank you for registering <strong>${esc(input.name)}</strong> (${esc(input.city)}) with EdUsaathiAI.
      Your application is in our hands and a short review is under way.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      <strong>What happens next:</strong> I will personally reach out within 48 hours — either to walk your team
      through a short demo, or to answer anything open before we move your institution into trial. Nothing is
      auto-approved here; every institution is reviewed by hand.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      If anything changes or you&apos;d like to reach me sooner, reply to this email.
    </p>
    <div style="margin-top:26px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:13px;color:#4A4740;">
      Warmly,<br/>
      <strong>Jaydeep Buch</strong><br/>
      Founder, EdUsaathiAI<br/>
      <a href="mailto:admin@edusaathiai.in" style="color:#B8860B;text-decoration:none;">admin@edusaathiai.in</a>
    </div>
  </div>
</body></html>`.trim()

  // 2. Admin notification
  const rows: Array<[string, string]> = [
    ['Institution',           input.name],
    ['City',                  input.city],
    ['Principal',             input.principalName ?? '—'],
    ['Principal email',       input.principalEmail],
    ['Phone',                 input.phone ?? '—'],
    ['Affiliation',           input.affiliation ?? '—'],
    ['Approx. strength',      input.approximateStrength ?? '—'],
    ['Website',               input.website ?? '—'],
    ['Slug',                  input.slug],
  ]
  const rowsHtml = rows
    .map(([k, v]) => `<tr><td style="padding:6px 10px;color:#7A7570;font-size:12px;letter-spacing:0.3px;text-transform:uppercase;font-weight:700;">${esc(k)}</td><td style="padding:6px 10px;font-size:14px;">${esc(v)}</td></tr>`)
    .join('')
  const answerBlock = input.onboardingAnswer
    ? `<p style="font-size:12px;color:#7A7570;margin:18px 0 4px;letter-spacing:0.3px;text-transform:uppercase;font-weight:700;">Onboarding answer</p>
       <p style="padding:12px 14px;background:#FAF7F2;border-left:3px solid #B8860B;border-radius:6px;font-size:14px;line-height:1.55;white-space:pre-wrap;">${esc(input.onboardingAnswer)}</p>`
    : ''

  const adminHtml = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:680px;margin:0 auto;padding:24px 20px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:20px;color:#B8860B;margin:0 0 16px;">New institution registration</h1>
    <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #E8E4DD;border-radius:10px;overflow:hidden;">${rowsHtml}</table>
    ${answerBlock}
    <p style="margin:22px 0 0;font-size:13px;">
      <a href="${ADMIN_DASHBOARD}" style="display:inline-block;padding:10px 18px;background:#B8860B;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">Open admin dashboard →</a>
    </p>
    <p style="margin-top:24px;font-size:11px;color:#A8A49E;">Status: pending · Manual verification required.</p>
  </div>
</body></html>`.trim()

  const sendOne = async (to: string, subject: string, html: string, replyTo?: string) => {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from:     FROM_ADDRESS,
          to:       [to],
          subject,
          html,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error('[institutions/register] Resend error', res.status, detail.slice(0, 300))
      }
    } catch (e) {
      console.error('[institutions/register] Resend threw', e)
    }
  }

  await Promise.all([
    sendOne(
      input.principalEmail,
      'EdUsaathiAI — We&apos;ve received your registration',
      autoHtml,
    ),
    sendOne(
      ADMIN_EMAIL,
      `New institution registration — ${input.name}, ${input.city}`,
      adminHtml,
      input.principalEmail,
    ),
  ])
}
