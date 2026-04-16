'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? ''

// ── Update nomination status ────────────────────────────────────────────────

export async function updateNominationStatus(fd: FormData) {
  await requireAdmin()
  const admin = getAdminClient()

  const nominationId = fd.get('nomination_id') as string
  const status = fd.get('status') as string

  if (!nominationId || !status) throw new Error('Missing fields')

  const validStatuses = ['invited', 'opened', 'applied', 'verified', 'eminent', 'declined']
  if (!validStatuses.includes(status)) throw new Error('Invalid status')

  await admin
    .from('faculty_nominations')
    .update({ status })
    .eq('id', nominationId)

  revalidatePath('/faculty/nominations')
}

// ── Resend invitation email ─────────────────────────────────────────────────

export async function resendInvitationEmail(fd: FormData) {
  await requireAdmin()

  const nominationId = fd.get('nomination_id') as string
  if (!nominationId) throw new Error('Missing nomination_id')

  // Call the Edge Function with service role key
  const res = await fetch(`${SUPABASE_URL}/functions/v1/notify-faculty-nomination`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ nominationId }),
  })

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }

  revalidatePath('/faculty/nominations')
}
