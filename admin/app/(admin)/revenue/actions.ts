'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase-admin';

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     ?? '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET ?? '';

/**
 * Refunds a subscription payment via Razorpay API, then:
 *  1. Marks subscriptions row as 'refunded'
 *  2. Downgrades the user's profile to free
 *
 * Called from the Revenue admin page.
 */
export async function refundSubscription(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const subscriptionId = formData.get('subscription_id') as string;
  const reason         = (formData.get('reason') as string | null) ?? 'Admin-initiated refund';
  if (!subscriptionId) return { ok: false, error: 'No subscription_id' };

  const admin = getAdminClient();

  // Fetch subscription row
  const { data: subRow, error: fetchErr } = await admin
    .from('subscriptions')
    .select('id, user_id, plan_id, amount_inr, razorpay_payment_id, status, razorpay_refund_id')
    .eq('id', subscriptionId)
    .maybeSingle();

  if (fetchErr || !subRow) return { ok: false, error: fetchErr?.message ?? 'Subscription not found' };

  const sub = subRow as {
    id: string; user_id: string; plan_id: string; amount_inr: number;
    razorpay_payment_id: string | null; status: string; razorpay_refund_id: string | null;
  };

  // Idempotency: already refunded
  if (sub.status === 'refunded') return { ok: false, error: 'Already refunded' };
  if (sub.razorpay_refund_id)    return { ok: false, error: 'Refund already issued' };

  const paymentId = sub.razorpay_payment_id;
  if (!paymentId) return { ok: false, error: 'No razorpay_payment_id on this subscription' };

  // Call Razorpay API
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return { ok: false, error: 'Razorpay keys not configured on server' };
  }

  const creds = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  const amountPaise = sub.amount_inr * 100;

  const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${creds}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountPaise,
      notes: { reason, admin_action: 'true' },
    }),
  });

  if (!rzpRes.ok) {
    const errBody = await rzpRes.text();
    console.error('refundSubscription: Razorpay error', rzpRes.status, errBody);
    return { ok: false, error: `Razorpay error ${rzpRes.status}: ${errBody.slice(0, 200)}` };
  }

  const rzpJson = await rzpRes.json() as { id?: string };
  const refundId = rzpJson.id ?? null;

  // Update subscriptions ledger
  await admin.from('subscriptions').update({
    status: 'refunded',
    razorpay_refund_id: refundId,
    refunded_at: new Date().toISOString(),
    refund_amount_inr: sub.amount_inr,
    webhook_event: 'admin.refund',
  }).eq('id', sub.id);

  // Downgrade profile to free
  await admin.from('profiles').update({
    plan_id: 'free',
    subscription_status: 'cancelled',
    subscription_expires_at: null,
  }).eq('id', sub.user_id);

  revalidatePath('/revenue');
  revalidatePath('/financials');
  return { ok: true };
}
