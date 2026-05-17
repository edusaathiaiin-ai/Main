'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'
import type { ActivateResult } from './result'

const TRIAL_LENGTH_DAYS = 7

// All principal magic/invite links route through the website's existing,
// already-allowlisted callback — never a per-slug URL (server component would
// run before the session exists; also avoids touching the Supabase redirect
// allowlist). The callback forwards to the dashboard by user_metadata.
const SITE_CALLBACK = 'https://www.edusaathiai.in/auth/callback'
const RESEND_API_KEY = process.env.RESEND_API_KEY
const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'

function daysFromNow(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Helper — NOT a server action (not exported). Delivers an existing
// principal's one-time login link via Resend (mirrors the registration
// route's send pattern). Throws on any failure so the caller can audit it
// and leave the institution `pending`.
async function sendPrincipalMagicLink(
  toEmail: string,
  principalName: string | null,
  institutionName: string,
  actionLink: string,
): Promise<void> {
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY missing — cannot deliver principal link')
  }
  const greeting = principalName
    ? `Dear ${esc(principalName)},`
    : 'Hello,'
  const html = `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:21px;color:#B8860B;margin:0 0 6px;">Your principal dashboard is ready</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 18px;">EdUsaathiAI · Unified Soul Partnership</p>
    <p style="font-size:15px;line-height:1.65;">${greeting}</p>
    <p style="font-size:15px;line-height:1.65;">
      <strong>${esc(institutionName)}</strong> is now on an active EdUsaathiAI
      trial. Use the secure link below to open your principal dashboard —
      institution analytics, rosters, and billing in one place.
    </p>
    <p style="margin:24px 0;">
      <a href="${actionLink}" style="display:inline-block;padding:12px 22px;background:#B8860B;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px;">Open my dashboard →</a>
    </p>
    <p style="font-size:13px;color:#7A7570;line-height:1.6;">
      This link signs you in and is valid for 24 hours. It only works for
      ${esc(toEmail)}. If you didn't expect this, you can ignore it.
    </p>
    <div style="margin-top:26px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:13px;color:#4A4740;">
      Warmly,<br/><strong>Jaydeep Buch</strong><br/>Founder, EdUsaathiAI<br/>
      <a href="mailto:admin@edusaathiai.in" style="color:#B8860B;text-decoration:none;">admin@edusaathiai.in</a>
    </div>
  </div>
</body></html>`.trim()

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [toEmail],
      subject: `Your EdUsaathiAI principal access — ${institutionName}`,
      html,
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`)
  }
}

/* ────────────────────────────────────────────────────────────────────────── */
/* State transitions                                                          */
/* ────────────────────────────────────────────────────────────────────────── */

export async function markDemoScheduled(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()
  await admin
    .from('education_institutions')
    .update({ status: 'demo' })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

// Activate Trial is the single moment a vetted institution becomes real:
// it flips status AND gives the principal a way in. Provision FIRST — if
// the principal can't be set up, the institution stays `pending` and the
// reason is surfaced + audited. Never a silent half-activation (that is
// the exact bug this flow exists to kill). Returns a result so the UI can
// show success/failure via useActionState.
export async function activateTrial(
  _prev: ActivateResult,
  formData: FormData,
): Promise<ActivateResult> {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return { ok: false, message: 'Missing institution id.' }

  const admin = getAdminClient()

  const { data: inst } = await admin
    .from('education_institutions')
    .select('id, slug, name, principal_email, principal_name, admin_notes')
    .eq('id', id)
    .single()

  if (!inst) return { ok: false, message: 'Institution not found.' }

  const principalEmail = ((inst.principal_email as string | null) ?? '')
    .trim()
    .toLowerCase()
  if (!principalEmail) {
    return { ok: false, message: 'No principal email on this institution.' }
  }

  const institutionName = (inst.name as string | null) ?? 'your institution'
  const slug = inst.slug as string
  const principalName = (inst.principal_name as string | null) ?? null
  const metadata = {
    institution_id: inst.id as string,
    institution_slug: slug,
    institution_role: 'principal',
    full_name: principalName,
  }

  try {
    const { data: existing } = await admin
      .from('profiles')
      .select('id')
      .eq('email', principalEmail)
      .maybeSingle()

    if (existing?.id) {
      // Existing account → link the profile NOW (role untouched: access is
      // additive), stamp user_metadata so the callback handles new +
      // existing principals through one branch, deliver link via Resend.
      const principalId = existing.id as string

      const { error: linkErr } = await admin
        .from('profiles')
        .update({
          education_institution_id: inst.id,
          education_institution_role: 'principal',
          education_institution_joined_at: new Date().toISOString(),
        })
        .eq('id', principalId)
      if (linkErr) throw new Error(`profile link failed: ${linkErr.message}`)

      const { data: userRes } =
        await admin.auth.admin.getUserById(principalId)
      const priorMeta = userRes?.user?.user_metadata ?? {}
      const { error: metaErr } = await admin.auth.admin.updateUserById(
        principalId,
        { user_metadata: { ...priorMeta, ...metadata } },
      )
      if (metaErr) throw new Error(`metadata update failed: ${metaErr.message}`)

      const { data: linkData, error: genErr } =
        await admin.auth.admin.generateLink({
          type: 'magiclink',
          email: principalEmail,
          options: { redirectTo: SITE_CALLBACK },
        })
      const actionLink = linkData?.properties?.action_link
      if (genErr || !actionLink) {
        throw new Error(
          `link generation failed: ${genErr?.message ?? 'no link returned'}`,
        )
      }

      await sendPrincipalMagicLink(
        principalEmail,
        principalName,
        institutionName,
        actionLink,
      )
    } else {
      // New account → Supabase sends the invite; metadata rides along and
      // the callback links the profile when the principal accepts.
      const { error: inviteErr } =
        await admin.auth.admin.inviteUserByEmail(principalEmail, {
          data: metadata,
          redirectTo: SITE_CALLBACK,
        })
      if (inviteErr) throw new Error(`invite failed: ${inviteErr.message}`)
    }
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'unknown error'
    const priorNotes = ((inst.admin_notes as string | null) ?? '').trim()
    const stamp = new Date().toISOString().slice(0, 10)
    await admin
      .from('education_institutions')
      .update({
        admin_notes:
          (priorNotes ? priorNotes + '\n\n' : '') +
          `[${stamp}] Trial activation blocked — principal provisioning failed: ${reason}`,
      })
      .eq('id', id)
    return {
      ok: false,
      message: `Status unchanged. Principal could not be provisioned — ${reason}`,
    }
  }

  // Provisioning succeeded → safe to flip status now.
  const now = new Date().toISOString()
  const { error: statusErr } = await admin
    .from('education_institutions')
    .update({
      status: 'trial',
      trial_started_at: now,
      trial_ends_at: daysFromNow(TRIAL_LENGTH_DAYS),
    })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')

  if (statusErr) {
    return {
      ok: false,
      message: `Principal invited, but status update failed: ${statusErr.message}. Retry.`,
    }
  }
  return {
    ok: true,
    message: `Trial activated. Login link sent to ${principalEmail}.`,
  }
}

export async function extendTrial(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()
  const { data: current } = await admin
    .from('education_institutions')
    .select('trial_ends_at')
    .eq('id', id)
    .single()

  const base = current?.trial_ends_at
    ? new Date(current.trial_ends_at as string)
    : new Date()
  // If the trial is already expired, extend from today so the +7 days is
  // useful; if it's still live, extend from the existing end so we stack.
  const startFrom = base.getTime() < Date.now() ? new Date() : base
  const extended = new Date(startFrom)
  extended.setUTCDate(extended.getUTCDate() + TRIAL_LENGTH_DAYS)

  await admin
    .from('education_institutions')
    .update({ trial_ends_at: extended.toISOString() })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

export async function activateBilling(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()
  await admin
    .from('education_institutions')
    .update({
      status: 'active',
      activated_at: new Date().toISOString(),
    })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

export async function suspendEducationInstitution(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const reason = ((formData.get('reason') as string | null) ?? '').trim()
  if (!id) return

  const admin = getAdminClient()

  // Append reason to admin_notes (audit trail — never overwrite silently)
  let mergedNotes: string | null = null
  if (reason) {
    const { data: row } = await admin
      .from('education_institutions')
      .select('admin_notes')
      .eq('id', id)
      .single()
    const prior = ((row?.admin_notes as string | null) ?? '').trim()
    const stamp = new Date().toISOString().slice(0, 10)
    mergedNotes =
      (prior ? prior + '\n\n' : '') + `[${stamp}] Suspended: ${reason}`
  }

  await admin
    .from('education_institutions')
    .update({
      status: 'suspended',
      ...(mergedNotes ? { admin_notes: mergedNotes } : {}),
    })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

export async function markChurned(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const reason = ((formData.get('reason') as string | null) ?? '').trim()
  if (!id) return

  const admin = getAdminClient()

  let mergedNotes: string | null = null
  if (reason) {
    const { data: row } = await admin
      .from('education_institutions')
      .select('admin_notes')
      .eq('id', id)
      .single()
    const prior = ((row?.admin_notes as string | null) ?? '').trim()
    const stamp = new Date().toISOString().slice(0, 10)
    mergedNotes =
      (prior ? prior + '\n\n' : '') + `[${stamp}] Churned: ${reason}`
  }

  await admin
    .from('education_institutions')
    .update({
      status: 'churned',
      ...(mergedNotes ? { admin_notes: mergedNotes } : {}),
    })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

export async function reactivateEducationInstitution(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()

  // Capture the prior status for the audit note before we overwrite it —
  // same append-never-overwrite pattern as suspend / churn.
  const { data: row } = await admin
    .from('education_institutions')
    .select('status, admin_notes')
    .eq('id', id)
    .single()
  const prior = ((row?.admin_notes as string | null) ?? '').trim()
  const fromStatus = (row?.status as string | null) ?? 'unknown'
  const stamp = new Date().toISOString().slice(0, 10)
  const mergedNotes =
    (prior ? prior + '\n\n' : '') +
    `[${stamp}] Reactivated from ${fromStatus} → trial (${TRIAL_LENGTH_DAYS} days)`

  await admin
    .from('education_institutions')
    .update({
      status: 'trial',
      trial_started_at: new Date().toISOString(),
      trial_ends_at: daysFromNow(TRIAL_LENGTH_DAYS),
      admin_notes: mergedNotes,
    })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Editable fields                                                            */
/* ────────────────────────────────────────────────────────────────────────── */

export async function updateAdminNotes(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  const notes = (formData.get('admin_notes') as string | null) ?? ''
  if (!id) return

  const admin = getAdminClient()
  await admin
    .from('education_institutions')
    .update({ admin_notes: notes })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
}

export async function updateEducationInstitutionFields(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const name = (formData.get('name') as string | null)?.trim() ?? null
  const city = (formData.get('city') as string | null)?.trim() ?? null
  const state = (formData.get('state') as string | null)?.trim() ?? null
  const affiliation =
    (formData.get('affiliation') as string | null)?.trim() || null
  const principal_name =
    (formData.get('principal_name') as string | null)?.trim() || null
  const principal_email =
    (formData.get('principal_email') as string | null)?.trim() || null
  const declared_capacity = Number(formData.get('declared_capacity') ?? 0)
  const daily_minutes_budget = Number(
    formData.get('daily_minutes_budget') ?? 0
  )
  const saathi_csv =
    (formData.get('active_saathi_slugs') as string | null) ?? ''
  const active_saathi_slugs = saathi_csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const patch: Record<string, unknown> = {}
  if (name) patch.name = name
  if (city) patch.city = city
  if (state) patch.state = state
  patch.affiliation = affiliation
  patch.principal_name = principal_name
  if (principal_email) patch.principal_email = principal_email
  if (Number.isFinite(declared_capacity) && declared_capacity > 0) {
    patch.declared_capacity = declared_capacity
  }
  if (Number.isFinite(daily_minutes_budget) && daily_minutes_budget >= 0) {
    patch.daily_minutes_budget = daily_minutes_budget
  }
  patch.active_saathi_slugs = active_saathi_slugs

  const admin = getAdminClient()
  await admin.from('education_institutions').update(patch).eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Quick actions                                                              */
/* ────────────────────────────────────────────────────────────────────────── */

export async function openWhatsApp(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()
  const { data: inst } = await admin
    .from('education_institutions')
    .select('name, principal_name, principal_email')
    .eq('id', id)
    .single()

  // Look up principal's phone from profiles if they've joined the platform
  let phone: string | null = null
  const principalEmail = inst?.principal_email as string | null
  if (principalEmail) {
    const { data: prof } = await admin
      .from('profiles')
      .select('phone_number, wa_phone')
      .eq('email', principalEmail)
      .maybeSingle()
    phone =
      (prof?.wa_phone as string | null) ??
      (prof?.phone_number as string | null) ??
      null
  }

  const text = `Hello ${inst?.principal_name ?? 'there'}, this is Jaydeep from EdUsaathiAI — following up on ${inst?.name ?? 'your institution'}'s registration.`

  // If we have a phone, prefill; otherwise open the picker
  const url = phone
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`

  redirect(url)
}

export async function openEmail(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()
  const { data: inst } = await admin
    .from('education_institutions')
    .select('name, principal_name, principal_email')
    .eq('id', id)
    .single()

  const to = (inst?.principal_email as string | null) ?? ''
  const subject = `EdUsaathiAI — ${inst?.name ?? 'your institution'}`
  const body = `Hello ${inst?.principal_name ?? 'there'},\n\nThis is Jaydeep Buch from EdUsaathiAI, following up on your institution's registration.\n\n`

  const url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  redirect(url)
}
