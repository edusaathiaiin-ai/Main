'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

export async function liftSuspension(formData: FormData) {
  await requireAdmin()
  const userId = formData.get('user_id') as string
  const note = (formData.get('note') as string) ?? ''
  if (!userId) return

  const admin = getAdminClient()

  await admin
    .from('profiles')
    .update({
      suspension_status: null,
      suspension_tier: null,
      suspended_until: null,
      suspension_reason: null,
    })
    .eq('id', userId)

  await admin.from('suspension_log').insert({
    user_id: userId,
    action: 'lift',
    tier: 0,
    reason: 'Admin lifted suspension',
    triggered_by: 'admin',
    admin_note: note || null,
  })

  revalidatePath('/suspensions')
}

export async function escalateSuspension(formData: FormData) {
  await requireAdmin()
  const userId = formData.get('user_id') as string
  const reason = formData.get('reason') as string
  const durationHours =
    parseInt(formData.get('duration_hours') as string, 10) || 168 // 7d default
  if (!userId || !reason) return

  const admin = getAdminClient()
  const until = new Date(
    Date.now() + durationHours * 60 * 60 * 1000
  ).toISOString()

  await admin
    .from('profiles')
    .update({
      suspension_status: 'suspended',
      suspension_tier: 3,
      suspended_until: until,
      suspension_reason: reason,
    })
    .eq('id', userId)

  await admin.from('suspension_log').insert({
    user_id: userId,
    action: 'suspend',
    tier: 3,
    reason,
    duration_hours: durationHours,
    suspended_until: until,
    triggered_by: 'admin',
  })

  revalidatePath('/suspensions')
}

export async function banUser(formData: FormData) {
  await requireAdmin()
  const userId = formData.get('user_id') as string
  const reason = formData.get('reason') as string
  const confirm = formData.get('confirm') as string
  if (!userId || !reason || confirm !== 'CONFIRM') return

  const admin = getAdminClient()

  await admin
    .from('profiles')
    .update({
      is_banned: true,
      suspension_status: 'banned',
      suspension_tier: 4,
      suspended_until: null,
      suspension_reason: reason,
    })
    .eq('id', userId)

  await admin.from('suspension_log').insert({
    user_id: userId,
    action: 'ban',
    tier: 4,
    reason,
    triggered_by: 'admin',
  })

  revalidatePath('/suspensions')
}

export async function saveViolationThresholds(formData: FormData) {
  await requireAdmin()
  // Thresholds are stored as app config — log the change for audit
  const admin = getAdminClient()
  const entries = Array.from(formData.entries())
  const summary = entries.map(([k, v]) => `${k}=${v}`).join(', ')

  await admin.from('moderation_flags').insert({
    flag_type: 'threshold_update',
    content: `Admin updated thresholds: ${summary}`,
    reported_by: null,
    resolved: true,
  })

  revalidatePath('/suspensions')
}
