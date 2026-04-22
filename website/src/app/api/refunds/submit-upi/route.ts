import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Student submits their UPI to claim a refund for a cancelled booking.
 *
 * POST /api/refunds/submit-upi
 * Body: { bookingId: string, upiId: string }
 *
 * Auth: JWT, student must own the booking.
 *
 * Effects:
 *   - live_bookings.refund_upi_id = upiId
 *   - live_bookings.refund_status = 'ready'  (admin queue picks this up)
 *
 * The booking must be in refund_status='pending' (set by faculty cancellation
 * route). Once 'ready', students can update their UPI but admin will see
 * the latest value.
 */

// Loose UPI handle check: <name>@<bank>, allowing dots, hyphens, underscores.
// Reject anything obviously not a UPI handle so we don't email garbage to admin.
const UPI_REGEX = /^[a-zA-Z0-9._-]{2,}@[a-zA-Z][a-zA-Z0-9.-]{1,}$/

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { bookingId?: string; upiId?: string }
  const bookingId = body.bookingId?.trim()
  const upiId = body.upiId?.trim()

  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
  if (!upiId)     return NextResponse.json({ error: 'UPI ID required' }, { status: 400 })
  if (!UPI_REGEX.test(upiId)) {
    return NextResponse.json({ error: 'That doesn\'t look like a UPI ID. Format: name@bank' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: booking, error: bErr } = await admin
    .from('live_bookings')
    .select('id, student_id, refund_status, amount_paid_paise')
    .eq('id', bookingId)
    .maybeSingle()
  if (bErr || !booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  if (booking.student_id !== user.id) return NextResponse.json({ error: 'Not your booking' }, { status: 403 })
  if (booking.refund_status === 'paid') {
    return NextResponse.json({ error: 'This refund has already been paid' }, { status: 400 })
  }
  if (booking.refund_status === 'none') {
    return NextResponse.json({ error: 'No refund is pending for this booking' }, { status: 400 })
  }

  const { error: updErr } = await admin
    .from('live_bookings')
    .update({
      refund_upi_id: upiId,
      refund_status: 'ready',
    })
    .eq('id', bookingId)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
