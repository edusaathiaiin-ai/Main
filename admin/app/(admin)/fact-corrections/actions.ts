'use server'

import { revalidatePath } from 'next/cache'
import { getAdminClient } from '@/lib/supabase-admin'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function verifyCorrection(correctionId: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/verify-correction`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ correctionId, adminName: 'Jaydeep' }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }
  revalidatePath('/fact-corrections')
}

export async function rejectCorrection(correctionId: string, note: string) {
  const admin = getAdminClient()
  const { error } = await admin
    .from('fact_corrections')
    .update({
      status:      'rejected',
      admin_note:  note || 'Rejected by admin',
      verified_by: 'Jaydeep',
      verified_at: new Date().toISOString(),
    })
    .eq('id', correctionId)
  if (error) throw new Error(error.message)
  revalidatePath('/fact-corrections')
}

export async function markDuplicate(correctionId: string) {
  const admin = getAdminClient()
  const { error } = await admin
    .from('fact_corrections')
    .update({ status: 'duplicate', verified_by: 'Jaydeep', verified_at: new Date().toISOString() })
    .eq('id', correctionId)
  if (error) throw new Error(error.message)
  revalidatePath('/fact-corrections')
}
