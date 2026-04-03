'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

async function razorpayRefund(paymentId: string, amountPaise: number): Promise<string | null> {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error('sessions/actions: Razorpay keys not set — skipping API refund');
    return null;
  }
  const creds = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount: amountPaise }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('sessions/actions: Razorpay refund API error', res.status, err);
    return null;
  }
  const json = await res.json() as { id?: string };
  return json.id ?? null;
}

export async function releaseToFaculty(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const note = formData.get('note') as string;
  if (!sessionId) return;

  const admin = getAdminClient();
  await admin
    .from('faculty_sessions')
    .update({
      payout_status: 'released',
      payout_released_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (note) {
    await admin.from('moderation_flags').insert({
      flag_type: 'session_admin_action',
      content: `Dispute resolved (release to faculty): session ${sessionId} — ${note}`,
      reported_by: null,
      resolved: true,
    });
  }

  revalidatePath('/sessions');
}

export async function refundStudent(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const note = formData.get('note') as string;
  if (!sessionId) return;

  const admin = getAdminClient();

  // Fetch session to get payment details
  const { data: session } = await admin
    .from('faculty_sessions')
    .select('razorpay_payment_id, fee_paise')
    .eq('id', sessionId)
    .maybeSingle();

  const paymentId   = (session as Record<string, unknown> | null)?.razorpay_payment_id as string | null;
  const refundPaise = (session as Record<string, unknown> | null)?.fee_paise as number | null;

  // Issue refund via Razorpay API if payment exists
  let razorpayRefundId: string | null = null;
  if (paymentId && refundPaise) {
    razorpayRefundId = await razorpayRefund(paymentId, refundPaise);
    if (!razorpayRefundId) {
      console.error(`sessions/actions: Razorpay refund failed for session ${sessionId} payment ${paymentId}`);
      // Continue — mark DB as refunded even if API fails, admin can retry manually
    }
  }

  await admin
    .from('faculty_sessions')
    .update({
      status: 'cancelled',
      refund_status: 'refunded',
      cancelled_by: 'admin',
      cancellation_reason: note || 'Admin refund — dispute resolved for student',
      cancelled_at: new Date().toISOString(),
      ...(razorpayRefundId ? { razorpay_refund_id: razorpayRefundId } : {}),
    })
    .eq('id', sessionId);

  revalidatePath('/sessions');
}

export async function addSessionNote(formData: FormData) {
  await requireAdmin();
  const sessionId = formData.get('session_id') as string;
  const note = formData.get('note') as string;
  if (!sessionId || !note) return;

  const admin = getAdminClient();
  await admin.from('moderation_flags').insert({
    flag_type: 'session_admin_note',
    content: `Admin note on session ${sessionId}: ${note}`,
    reported_by: null,
    resolved: true,
  });

  revalidatePath('/sessions');
}
