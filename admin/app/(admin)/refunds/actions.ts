'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { getAdminClient } from '@/lib/supabase-admin'

/**
 * Mark a student refund as paid after manual UPI transfer.
 *
 * Form fields:
 *   booking_id    (required)
 *   upi_reference (recommended — bank-side ref so we can prove the transfer)
 */
export async function markRefundPaid(formData: FormData) {
  await requireAdmin()

  const bookingId    = String(formData.get('booking_id') ?? '').trim()
  const upiReference = String(formData.get('upi_reference') ?? '').trim()
  if (!bookingId) return

  const admin = getAdminClient()

  // Load booking to compute the actual refund amount.
  const { data: booking, error: bErr } = await admin
    .from('live_bookings')
    .select('id, refund_status, amount_paid_paise')
    .eq('id', bookingId)
    .maybeSingle()
  if (bErr || !booking) throw new Error('Booking not found')
  if (booking.refund_status === 'paid') return  // idempotent
  if (booking.refund_status !== 'ready') {
    throw new Error(`Booking is in refund_status='${booking.refund_status}'; needs UPI from student first`)
  }

  const nowIso = new Date().toISOString()

  const { error: updErr } = await admin
    .from('live_bookings')
    .update({
      refund_status: 'paid',
      refunded_at: nowIso,
      refund_amount_paise: booking.amount_paid_paise,
      payment_status: 'refunded',
      refund_upi_reference: upiReference || null,
    })
    .eq('id', bookingId)
  if (updErr) throw new Error(updErr.message)

  revalidatePath('/refunds')
}
