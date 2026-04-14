'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * Flip a pending payout to completed and trigger the T13 WhatsApp.
 *
 * Form fields:
 *   payout_id     (required)
 *   upi_reference (optional but strongly recommended — goes on the faculty's receipt)
 *   note          (optional — admin-side audit only, never shown to faculty)
 */
export async function markPayoutPaid(formData: FormData) {
  await requireAdmin()

  const payoutId     = String(formData.get('payout_id') ?? '').trim()
  const upiReference = String(formData.get('upi_reference') ?? '').trim()
  const note         = String(formData.get('note') ?? '').trim()
  if (!payoutId) return

  // Call the edge function — it does the status flip + T13 atomically
  const res = await fetch(`${SUPABASE_URL}/functions/v1/mark-payout-completed`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({
      payoutId,
      upiReference: upiReference || undefined,
    }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(data.error ?? `HTTP ${res.status}`)
  }

  // Admin-side audit note — kept separately from the faculty-facing flow
  // so future auditors can reconstruct who approved what and why.
  if (note) {
    const admin = getAdminClient()
    await admin.from('moderation_flags').insert({
      flag_type:   'payout_admin_note',
      content:     `Payout ${payoutId}: ${note}`,
      reported_by: null,
      resolved:    true,
    })
  }

  revalidatePath('/payouts')
  revalidatePath('/financials')
}
