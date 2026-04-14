'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Helpers ───────────────────────────────────────────────────────────────────

async function callEdgeFunction(name: string, body: unknown): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
}

// ── Verify (standard faculty) ────────────────────────────────────────────────
//
// Calls faculty-verify edge function, which:
//   - Updates faculty_profiles (correct columns: verification_status,
//     verified_at, badge_type, institution_name — NOT the phantom
//     `is_verified` / `institution` columns this code used to write to)
//   - Sends T14 WhatsApp + verification email (only on first verify —
//     idempotent on re-run)

export async function verifyFaculty(formData: FormData) {
  await requireAdmin()
  const userId      = formData.get('user_id')     as string
  const institution = formData.get('institution') as string
  const note        = formData.get('note')        as string
  if (!userId) return

  await callEdgeFunction('faculty-verify', {
    facultyId:       userId,
    badgeType:       'faculty_verified',
    institutionName: institution?.trim() || undefined,
    adminNote:       note?.trim() || undefined,
  })

  revalidatePath('/faculty')
}

// ── Reject ───────────────────────────────────────────────────────────────────

export async function rejectFaculty(formData: FormData) {
  await requireAdmin()
  const userId = formData.get('user_id') as string
  const reason = formData.get('reason') as string
  const custom = formData.get('custom') as string
  if (!userId || !reason) return

  await callEdgeFunction('faculty-reject', {
    facultyId: userId,
    reason:    custom?.trim() || reason,   // custom message overrides dropdown
    adminNote: reason,                     // keep the dropdown label in audit log
  })

  revalidatePath('/faculty')
}

// ── Mark Emeritus (retired faculty) ──────────────────────────────────────────

export async function markEmeritus(formData: FormData) {
  await requireAdmin()
  const userId             = formData.get('user_id')            as string
  const retirementYearRaw  = formData.get('retirement_year')    as string
  const formerInstitution  = formData.get('former_institution') as string
  if (!userId) return

  const retirementYear = parseInt(retirementYearRaw, 10)

  await callEdgeFunction('faculty-verify', {
    facultyId:         userId,
    badgeType:         'faculty_verified',
    isEmeritus:        true,
    retirementYear:    Number.isNaN(retirementYear) ? undefined : retirementYear,
    formerInstitution: formerInstitution?.trim() || undefined,
  })

  revalidatePath('/faculty')
}

// ── Verify Independent Expert ────────────────────────────────────────────────

export async function verifyIndependent(formData: FormData) {
  await requireAdmin()
  const userId = formData.get('user_id') as string
  const note   = formData.get('note')    as string
  if (!userId) return

  await callEdgeFunction('faculty-verify', {
    facultyId: userId,
    badgeType: 'expert_verified',
    adminNote: note?.trim() || undefined,
  })

  revalidatePath('/faculty')
}

// ── Revoke verification (quiet — no notification) ────────────────────────────
//
// Flips verification_status back to 'pending'. No email / WA — this is an
// internal admin correction, not a user-facing state change. Faculty will
// see their badge disappear from /profile next time they visit.

export async function revokeFacultyVerification(formData: FormData) {
  await requireAdmin()
  const userId = formData.get('user_id') as string
  if (!userId) return

  const admin = getAdminClient()

  const { error } = await admin
    .from('faculty_profiles')
    .update({
      verification_status: 'pending',
      verified_at:         null,
      badge_type:          'pending',
      updated_at:          new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  await admin.from('moderation_flags').insert({
    flag_type:   'faculty_verification_revoked',
    content:     `Verification revoked for faculty ${userId}`,
    reported_by: null,
    resolved:    true,
  })

  revalidatePath('/faculty')
}
