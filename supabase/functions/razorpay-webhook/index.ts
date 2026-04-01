/**
 * supabase/functions/razorpay-webhook/index.ts
 *
 * ════════════════════════════════════════════════════════════════
 *  SECURITY CONTRACT — DO NOT CHANGE THIS ORDER:
 *
 *  1. Read raw body bytes FIRST  (req.arrayBuffer())
 *  2. Verify HMAC-SHA256 against x-razorpay-signature
 *  3. If invalid → return 400 IMMEDIATELY, zero DB writes
 *  4. Only if valid → decode body text and parse JSON
 *  5. Only then → process event and write to DB
 *
 *  Breaking this order allows attackers to forge payment.captured
 *  events and receive free Premium access.
 * ════════════════════════════════════════════════════════════════
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureError, captureEvent } from '../_shared/sentry.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'EdUsaathiAI <noreply@edusaathiai.in>';

// Plan expiry durations
const PLAN_EXPIRY_MS: Record<string, number> = {
  'plus-monthly':     31 * 24 * 60 * 60 * 1000,
  'plus-annual':      366 * 24 * 60 * 60 * 1000,
  'pro-monthly':      31 * 24 * 60 * 60 * 1000,
  'pro-annual':       366 * 24 * 60 * 60 * 1000,
  'unlimited-monthly': 31 * 24 * 60 * 60 * 1000,
  'institution':      31 * 24 * 60 * 60 * 1000,
};

// Plan display names
const PLAN_LABELS: Record<string, string> = {
  'plus-monthly': 'Saathi Plus (Monthly)',
  'plus-annual': 'Saathi Plus (Annual)',
  'pro-monthly': 'Saathi Pro (Monthly)',
  'pro-annual': 'Saathi Pro (Annual)',
  'unlimited-monthly': 'Saathi Unlimited',
  'institution': 'Institution',
};

// ── Payment confirmation email ─────────────────────────────────────────────

async function sendUpgradeEmail(
  email: string,
  planId: string,
  expiresAt: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) return;
  const planLabel = PLAN_LABELS[planId] ?? planId;
  const renewalDate = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  try {
    console.log(`razorpay-webhook: sending upgrade email to ${email}, from=${RESEND_FROM_EMAIL}, key_len=${RESEND_API_KEY.length}`);
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: `Welcome to ${planLabel} - Your upgrade is confirmed`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
            <h1 style="color:#C9993A;font-size:28px;margin-bottom:8px">You are now ${planLabel}</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Your upgrade is confirmed. All 5 bot slots are now unlocked.
              Your Saathi remembers you — pick up right where you left off.
            </p>
            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:16px">
              Plan: ${planLabel}<br>
              Next renewal: ${renewalDate}<br>
              Questions: support@edusaathiai.in
            </p>
            <a href="https://www.edusaathiai.in/chat"
               style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:12px 28px;border-radius:10px;font-weight:700;text-decoration:none;margin-top:20px">
              Start learning →
            </a>
            <p style="font-size:11px;color:rgba(255,255,255,0.3);text-align:center;margin-top:24px;line-height:1.6">
              This email was sent to ${email}<br>
              because you made a purchase on EdUsaathiAI.<br>
              <strong style="color:rgba(255,255,255,0.5)">If this is in spam — please mark "Not spam" to receive future emails.</strong>
            </p>
          </div>
        `,
      }),
    });
    const emailBody = await emailRes.text();
    console.log(`razorpay-webhook: email response status=${emailRes.status}, body=${emailBody}`);
  } catch (err) {
    // Email failure must never block payment processing
    console.error('razorpay-webhook: email send failed', err instanceof Error ? err.message : err);
  }
}

// ── Step 2: HMAC-SHA256 signature verification ──────────────────────────────

async function verifyRazorpaySignature(
  rawBody: ArrayBuffer,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!signature || !secret) return false;

  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const computed = await crypto.subtle.sign('HMAC', cryptoKey, rawBody);
    const computedHex = Array.from(new Uint8Array(computed))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Constant-time comparison to prevent timing attacks
    if (computedHex.length !== signature.length) return false;
    let match = 0;
    for (let i = 0; i < computedHex.length; i++) {
      match |= computedHex.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return match === 0;
  } catch {
    return false;
  }
}

// ── Webhook event types ─────────────────────────────────────────────────────

type RazorpayPaymentEntity = {
  id?: string;
  order_id?: string;
  status?: string;
};

type RazorpaySubscriptionEntity = {
  id?: string;
  plan_id?: string;
  status?: string;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
    subscription?: { entity?: RazorpaySubscriptionEntity };
  };
};

// ── DB helpers ─────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
type AdminClient = ReturnType<typeof createClient<any>>;

async function handlePaymentCaptured(
  admin: AdminClient,
  payment: RazorpayPaymentEntity,
  rawPayload: RazorpayWebhookPayload
): Promise<void> {
  const { id: paymentId, order_id: orderId } = payment;
  if (!orderId) return;

  // ── Idempotency Layer 1: payment ID dedup ─────────────────────────────────
  // Razorpay can deliver the same webhook multiple times with the same
  // razorpay_payment_id. Check the payment ID first — before any write —
  // so duplicate deliveries never trigger a second activation.
  if (paymentId) {
    const { data: existingPayment } = await admin
      .from('subscriptions')
      .select('id')
      .eq('razorpay_payment_id', paymentId)
      .maybeSingle();

    if (existingPayment) {
      // Already processed this exact payment — ACK silently, do nothing
      console.log(`razorpay-webhook: duplicate payment_id '${paymentId}' — already processed`);
      return;
    }
  }

  // Look up subscription row by order_id
  const { data: subRow, error: fetchError } = await admin
    .from('subscriptions')
    .select('id, user_id, plan_id, status')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (fetchError || !subRow) {
    console.error('razorpay-webhook: subscription lookup failed', fetchError?.message ?? 'not found');
    return;
  }

  const sub = subRow as { id: string; user_id: string; plan_id: string; status: string };

  // ── Idempotency Layer 2: order status check ───────────────────────────────
  // Belt-and-suspenders: if the row is somehow already 'paid' (e.g. race
  // condition between two concurrent webhook deliveries), skip silently.
  if (sub.status === 'paid') {
    console.log(`razorpay-webhook: order '${orderId}' already paid — skipping`);
    return;
  }

  const expiryMs = PLAN_EXPIRY_MS[sub.plan_id] ?? PLAN_EXPIRY_MS['plus-monthly'];
  const expiresAt = new Date(Date.now() + expiryMs).toISOString();

  // Update subscription ledger
  await admin.from('subscriptions').update({
    status: 'paid',
    razorpay_payment_id: paymentId ?? null,
    webhook_event: 'payment.captured',
    raw_webhook: rawPayload,
  }).eq('id', sub.id);

  // Activate user's profile
  await admin.from('profiles').update({
    plan_id: sub.plan_id,
    subscription_status: 'active',
    subscription_expires_at: expiresAt,
  }).eq('id', sub.user_id);

  // Send confirmation email (fire-and-forget)
  const { data: userProfile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', sub.user_id)
    .maybeSingle();

  if (userProfile?.email) {
    await sendUpgradeEmail(userProfile.email as string, sub.plan_id, expiresAt);
  }
}

async function handlePaymentFailed(
  admin: AdminClient,
  payment: RazorpayPaymentEntity,
  rawPayload: RazorpayWebhookPayload
): Promise<void> {
  const { order_id: orderId } = payment;
  if (!orderId) return;

  await admin.from('subscriptions').update({
    status: 'failed',
    webhook_event: 'payment.failed',
    raw_webhook: rawPayload,
  }).eq('razorpay_order_id', orderId);
}

async function handleSubscriptionCancelled(
  admin: AdminClient,
  subscription: RazorpaySubscriptionEntity,
  rawPayload: RazorpayWebhookPayload
): Promise<void> {
  const { id: subId } = subscription;
  if (!subId) return;

  const { data: subRow } = await admin
    .from('subscriptions')
    .select('id, user_id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle();

  if (!subRow) return;

  const sub = subRow as { id: string; user_id: string };

  await admin.from('subscriptions').update({
    status: 'cancelled',
    webhook_event: 'subscription.cancelled',
    raw_webhook: rawPayload,
  }).eq('id', sub.id);

  await admin.from('profiles').update({
    subscription_status: 'cancelled',
  }).eq('id', sub.user_id);
}

async function handleSubscriptionPaused(
  admin: AdminClient,
  subscription: RazorpaySubscriptionEntity
): Promise<void> {
  const { id: subId } = subscription;
  if (!subId) return;

  const { data: subRow } = await admin
    .from('profiles')
    .select('id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle();

  if (!subRow) return;
  const profile = subRow as { id: string };

  await admin.from('profiles').update({
    subscription_status: 'paused',
  }).eq('id', profile.id);

  console.log(`razorpay-webhook: subscription.paused for profile ${profile.id}`);
}

async function handleSubscriptionResumed(
  admin: AdminClient,
  subscription: RazorpaySubscriptionEntity
): Promise<void> {
  const { id: subId } = subscription;
  if (!subId) return;

  const { data: subRow } = await admin
    .from('profiles')
    .select('id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle();

  if (!subRow) return;
  const profile = subRow as { id: string };

  await admin.from('profiles').update({
    subscription_status: 'active',
    pause_until: null,
  }).eq('id', profile.id);

  console.log(`razorpay-webhook: subscription.resumed for profile ${profile.id}`);
}


// ── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Only POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // ── STEP 1: Read raw bytes BEFORE any parsing ───────────────────────────
  // This is non-negotiable. Parsing JSON first would allow an attacker to
  // send a forged payload that passes later checks.
  const rawBody = await req.arrayBuffer();

  // ── STEP 2: Extract signature header ───────────────────────────────────
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error('razorpay-webhook: RAZORPAY_WEBHOOK_SECRET not set');
    return new Response('Service misconfigured', { status: 500 });
  }

  // ── STEP 3: Verify HMAC — reject before ANY DB interaction ─────────────
  const isValid = await verifyRazorpaySignature(rawBody, signature, RAZORPAY_WEBHOOK_SECRET);

  // Debug: log verification result (safe — no secret content exposed)
  console.log(`razorpay-webhook: verify=${isValid}, sig_len=${signature.length}, body_len=${rawBody.byteLength}`);

  if (!isValid) {
    console.warn('razorpay-webhook: invalid signature — request rejected');
    captureEvent('Razorpay webhook — invalid signature', {
      level: 'warning',
      tags: { function: 'razorpay-webhook', error_type: 'invalid_signature' },
      fingerprint: ['razorpay-invalid-signature'],
    });
    return new Response(JSON.stringify({ error: 'Invalid signature' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── STEP 4: Signature is verified — NOW safe to parse JSON ─────────────
  let payload: RazorpayWebhookPayload;
  try {
    const text = new TextDecoder().decode(rawBody);
    payload = JSON.parse(text) as RazorpayWebhookPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── STEP 5: Process event — DB writes only reach here if signature valid ─
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const event = payload.event ?? '';

  try {
    switch (event) {
      case 'payment.captured': {
        const payment = payload.payload?.payment?.entity ?? {};
        await handlePaymentCaptured(admin, payment, payload);
        break;
      }
      case 'payment.failed': {
        const payment = payload.payload?.payment?.entity ?? {};
        captureEvent('Payment failed', {
          level: 'error',
          tags: { function: 'razorpay-webhook', error_type: 'payment_failed' },
          extra: {
            payment_id:     (payment as Record<string, unknown>).id,
            amount:         (payment as Record<string, unknown>).amount,
            error_code:     (payment as Record<string, unknown>).error_code,
            error_desc:     (payment as Record<string, unknown>).error_description,
          },
          fingerprint: ['payment-failed'],
        });
        await handlePaymentFailed(admin, payment, payload);
        break;
      }
      case 'subscription.cancelled': {
        const subscription = payload.payload?.subscription?.entity ?? {};
        await handleSubscriptionCancelled(admin, subscription, payload);
        break;
      }
      case 'subscription.paused': {
        const subscription = payload.payload?.subscription?.entity ?? {};
        await handleSubscriptionPaused(admin, subscription);
        break;
      }
      case 'subscription.resumed': {
        const subscription = payload.payload?.subscription?.entity ?? {};
        await handleSubscriptionResumed(admin, subscription);
        break;
      }
      default:
        // Unhandled event type — log and ACK (Razorpay retries if we return non-200)
        console.log(`razorpay-webhook: unhandled event '${event}'`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error(`razorpay-webhook: error processing '${event}':`, message);
    captureError(err, {
      level: 'fatal',
      tags: { function: 'razorpay-webhook', error_type: 'processing_error', event_type: event },
      extra: { event, message },
      fingerprint: ['razorpay-processing-error'],
    });
    return new Response(JSON.stringify({ error: 'Processing error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Razorpay expects a fast 200 ACK
  return new Response(JSON.stringify({ ok: true, event }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
