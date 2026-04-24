'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const TRIAL_LENGTH_DAYS = 7

function daysFromNow(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
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

export async function activateTrial(formData: FormData) {
  await requireAdmin()
  const id = formData.get('id') as string
  if (!id) return

  const admin = getAdminClient()
  const now = new Date().toISOString()
  await admin
    .from('education_institutions')
    .update({
      status: 'trial',
      trial_started_at: now,
      trial_ends_at: daysFromNow(TRIAL_LENGTH_DAYS),
    })
    .eq('id', id)

  revalidatePath(`/education-institutions/${id}`)
  revalidatePath('/education-institutions')
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
  await admin.from('institutions').update(patch).eq('id', id)

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
