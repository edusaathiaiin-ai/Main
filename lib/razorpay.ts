/**
 * lib/razorpay.ts
 *
 * Client-side Razorpay integration helper.
 *
 * Flow:
 *   1. createOrder(planId)  → calls razorpay-order Edge Function
 *   2. openCheckout(params) → opens Razorpay Web Checkout in expo-web-browser
 *   3. Webhook handles payment confirmation asynchronously
 *
 * RAZORPAY_KEY_SECRET never reaches this file — it stays in the Edge Function.
 */

import * as WebBrowser from 'expo-web-browser';

import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const PAYMENTS_ACTIVE = process.env.EXPO_PUBLIC_PAYMENTS_ACTIVE === 'true';

export type PlanId = 'plus-monthly' | 'plus-annual' | 'institution';

export type OrderParams = {
  orderId: string;
  amount: number;         // in paise
  currency: string;       // 'INR'
  keyId: string;          // rzp_test_* or rzp_live_*
  subscriptionRowId: string;
  planLabel: string;
};

export type CheckoutResult =
  | { status: 'success'; paymentId: string; orderId: string; signature: string }
  | { status: 'dismissed' }
  | { status: 'error'; message: string }
  | { status: 'payments_disabled' };

// ---------------------------------------------------------------------------
// Step 1 — Create a Razorpay order via Edge Function
// ---------------------------------------------------------------------------

export async function createOrder(planId: PlanId): Promise<OrderParams> {
  if (!PAYMENTS_ACTIVE) {
    throw new Error('Payments are not active yet. Check EXPO_PUBLIC_PAYMENTS_ACTIVE.');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${SUPABASE_URL}/functions/v1/razorpay-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ planId }),
  });

  if (!res.ok) {
    const err = (await res.json()) as { error?: string };
    throw new Error(err.error ?? `Order creation failed: ${res.status}`);
  }

  return (await res.json()) as OrderParams;
}

// ---------------------------------------------------------------------------
// Step 2 — Open Razorpay Web Checkout
// Opens a Razorpay hosted checkout page in expo-web-browser.
// Razorpay Standard Checkout is a redirect flow in React Native context.
// ---------------------------------------------------------------------------

export async function openCheckout(params: OrderParams & {
  userName: string;
  userEmail: string;
  userPhone?: string;
  description?: string;
}): Promise<CheckoutResult> {
  if (!PAYMENTS_ACTIVE) {
    return { status: 'payments_disabled' };
  }

  // Build Razorpay Standard Checkout URL
  // Using the hosted page approach which works in Expo WebBrowser
  const checkoutParams = new URLSearchParams({
    key: params.keyId,
    amount: String(params.amount),
    currency: params.currency,
    order_id: params.orderId,
    name: 'EdUsaathiAI',
    description: params.description ?? params.planLabel,
    prefill_name: params.userName,
    prefill_email: params.userEmail,
    ...(params.userPhone ? { prefill_contact: params.userPhone } : {}),
    theme_color: '#C9993A',
    // Redirect back to app after payment
    callback_url: `${SUPABASE_URL}/functions/v1/razorpay-webhook`,
    redirect: 'true',
  });

  const checkoutUrl = `https://api.razorpay.com/v1/checkout/embedded?${checkoutParams.toString()}`;

  try {
    const result = await WebBrowser.openAuthSessionAsync(
      checkoutUrl,
      'edusaathiai://'  // app scheme for deep-link callback
    );

    if (result.type === 'cancel') {
      return { status: 'dismissed' };
    }

    if (result.type === 'success' && result.url) {
      // Parse callback params from redirect URL
      const url = new URL(result.url);
      const paymentId = url.searchParams.get('razorpay_payment_id') ?? '';
      const orderId = url.searchParams.get('razorpay_order_id') ?? params.orderId;
      const signature = url.searchParams.get('razorpay_signature') ?? '';

      if (paymentId && signature) {
        return { status: 'success', paymentId, orderId, signature };
      }
    }

    return { status: 'dismissed' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout error';
    return { status: 'error', message };
  }
}

// ---------------------------------------------------------------------------
// Convenience: check if payments are enabled client-side
// ---------------------------------------------------------------------------

export function isPaymentsActive(): boolean {
  return PAYMENTS_ACTIVE;
}
