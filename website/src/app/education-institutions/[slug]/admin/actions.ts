'use server'

// Phase 1.4a — principal-facing member lifecycle.
// Pause / reactivate / remove faculty members. Mirrors the admin-app
// server-action pattern: verify the caller is the principal of the
// member's institution, then mutate via service-role.
//
// Authority: reactivate is allowed only when set_by !== 'admin'
// (admin-set states can only be reversed by admin — preserves the
// admin-vs-principal authority axis we locked in design).
//
// Phase 1.6 — institution-level pause/reactivate (pauseInstitution /
// reactivateInstitution) sits at the bottom of this file. It flips
// education_institutions.principal_lifecycle and stamps lifecycle_set_by
// on the SAME authority axis: a principal cannot lift an admin-set pause.

import { revalidatePath } from 'next/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

type Verified = {
  ok: true
  admin: SupabaseClient
  institutionSlug: string
  setBy: 'principal' | 'admin' | 'system'
  userId: string | null
}
type Failed = { ok: false; reason: string }

async function verifyPrincipalForMember(
  memberId: string,
): Promise<Verified | Failed> {
  if (!memberId) return { ok: false, reason: 'missing_id' }

  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthorized' }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Look up the target member to know which institution + the set_by.
  const { data: member } = await admin
    .from('education_institution_members')
    .select('education_institution_id, set_by, user_id')
    .eq('id', memberId)
    .maybeSingle()
  if (!member) return { ok: false, reason: 'member_not_found' }

  // Self-target guard (Phase 1.4c): a principal cannot pause / remove
  // themselves through this dashboard. Prevents lockout when the chief
  // is the only principal. To leave, contact admin@edusaathiai.in.
  if (member.user_id && member.user_id === user.id) {
    return { ok: false, reason: 'cannot_target_self' }
  }

  // Caller must be a principal of THAT institution.
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('education_institution_id, education_institution_role')
    .eq('id', user.id)
    .maybeSingle()
  if (
    callerProfile?.education_institution_role !== 'principal' ||
    callerProfile?.education_institution_id !== member.education_institution_id
  ) {
    return { ok: false, reason: 'forbidden_not_principal_of_institution' }
  }

  // Slug needed for revalidatePath.
  const { data: inst } = await admin
    .from('education_institutions')
    .select('slug')
    .eq('id', member.education_institution_id as string)
    .maybeSingle()

  return {
    ok: true,
    admin,
    institutionSlug: (inst?.slug as string) ?? '',
    setBy: (member.set_by as 'principal' | 'admin' | 'system') ?? 'principal',
    userId: (member.user_id as string | null) ?? null,
  }
}

function revalidateDashboard(slug: string): void {
  if (slug) revalidatePath(`/education-institutions/${slug}/admin`)
}

export async function pauseFacultyMember(formData: FormData): Promise<void> {
  const memberId = formData.get('memberId') as string
  const v = await verifyPrincipalForMember(memberId)
  if (!v.ok) return
  await v.admin
    .from('education_institution_members')
    .update({ status: 'paused', set_by: 'principal' })
    .eq('id', memberId)
  revalidateDashboard(v.institutionSlug)
}

export async function reactivateFacultyMember(formData: FormData): Promise<void> {
  const memberId = formData.get('memberId') as string
  const v = await verifyPrincipalForMember(memberId)
  if (!v.ok) return
  // Authority rule: principal cannot lift an admin-set state.
  if (v.setBy === 'admin') return
  await v.admin
    .from('education_institution_members')
    .update({ status: 'active', set_by: 'principal' })
    .eq('id', memberId)
  revalidateDashboard(v.institutionSlug)
}

export async function removeFacultyMember(formData: FormData): Promise<void> {
  const memberId = formData.get('memberId') as string
  const v = await verifyPrincipalForMember(memberId)
  if (!v.ok) return
  await v.admin
    .from('education_institution_members')
    .update({ status: 'removed', set_by: 'principal' })
    .eq('id', memberId)
  // Also unlink the profile so RLS/other gates stop surfacing them as a
  // member. Reversible — reactivate will set status='active' again, and
  // the user can be re-linked at next login via metadata stamp if needed.
  // Best-effort: a profile-unlink hiccup must not abort the removal.
  if (v.userId) {
    try {
      await v.admin
        .from('profiles')
        .update({
          education_institution_id: null,
          education_institution_role: null,
          education_institution_joined_at: null,
        })
        .eq('id', v.userId)
    } catch (e) {
      console.error(
        '[removeFacultyMember] profile unlink failed (non-fatal)',
        e instanceof Error ? e.message : 'unknown',
      )
    }
  }
  revalidateDashboard(v.institutionSlug)
}

// ── Phase 1.6 — institution-level lifecycle (pause / reactivate) ─────────────

type VerifiedInstitution = {
  ok: true
  admin: SupabaseClient
  institutionSlug: string
  lifecycleSetBy: 'principal' | 'admin' | 'system' | null
}

// Verify the caller is a principal (or co-principal) of EXACTLY this
// institution. institutionId arrives from a hidden form field, so the
// check is the security boundary: the caller's own profile must name
// this institution AND carry the principal role. A principal of another
// institution passing a foreign id fails the equality check.
async function verifyPrincipalForInstitution(
  institutionId: string,
): Promise<VerifiedInstitution | Failed> {
  if (!institutionId) return { ok: false, reason: 'missing_id' }

  const sb = await createServerClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { ok: false, reason: 'unauthorized' }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('education_institution_id, education_institution_role')
    .eq('id', user.id)
    .maybeSingle()
  if (
    callerProfile?.education_institution_role !== 'principal' ||
    callerProfile?.education_institution_id !== institutionId
  ) {
    return { ok: false, reason: 'forbidden_not_principal_of_institution' }
  }

  const { data: inst } = await admin
    .from('education_institutions')
    .select('slug, lifecycle_set_by')
    .eq('id', institutionId)
    .maybeSingle()
  if (!inst) return { ok: false, reason: 'institution_not_found' }

  return {
    ok: true,
    admin,
    institutionSlug: (inst.slug as string) ?? '',
    lifecycleSetBy:
      (inst.lifecycle_set_by as 'principal' | 'admin' | 'system' | null) ?? null,
  }
}

export async function pauseInstitution(formData: FormData): Promise<void> {
  const institutionId = formData.get('institutionId') as string
  const v = await verifyPrincipalForInstitution(institutionId)
  if (!v.ok) return
  await v.admin
    .from('education_institutions')
    .update({
      principal_lifecycle: 'paused',
      lifecycle_set_by: 'principal',
      updated_at: new Date().toISOString(),
    })
    .eq('id', institutionId)
  revalidateDashboard(v.institutionSlug)
}

export async function reactivateInstitution(formData: FormData): Promise<void> {
  const institutionId = formData.get('institutionId') as string
  const v = await verifyPrincipalForInstitution(institutionId)
  if (!v.ok) return
  // Authority rule (same axis as members.set_by): a principal cannot lift
  // an admin-set pause. The UI also disables the button — this is the
  // server-side enforcement of that rule.
  if (v.lifecycleSetBy === 'admin') return
  await v.admin
    .from('education_institutions')
    .update({
      principal_lifecycle: 'active',
      lifecycle_set_by: 'principal',
      updated_at: new Date().toISOString(),
    })
    .eq('id', institutionId)
  revalidateDashboard(v.institutionSlug)
}
