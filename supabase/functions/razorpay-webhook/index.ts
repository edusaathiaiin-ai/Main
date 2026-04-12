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
import { sanitize } from '../_shared/validate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') ?? 'EdUsaathiAI <noreply@edusaathiai.in>';
const WA_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '';
const WA_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

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

// ── WhatsApp: subscription activated ─────────────────────────────────────────

async function sendWhatsAppActivation(
  waPhone: string,
  firstName: string,
  planLabel: string,
  expiresAt: string,
): Promise<void> {
  if (!WA_TOKEN || !WA_PHONE_ID || !waPhone) return;

  const expiryFormatted = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  }); // e.g. "12 May 2026"

  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${WA_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waPhone,
          type: 'template',
          template: {
            name: 'edusaathiai_subscription_activated',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: firstName },
                  { type: 'text', text: planLabel },
                  { type: 'text', text: expiryFormatted },
                ],
              },
            ],
          },
        }),
      },
    );
    const body = await res.text();
    console.log(`razorpay-webhook: WhatsApp activation sent to ${waPhone}, status=${res.status}, body=${body}`);
  } catch (err) {
    // Never block payment flow for WhatsApp failure
    console.error('razorpay-webhook: WhatsApp activation failed', err instanceof Error ? err.message : err);
  }
}

// ── Refund confirmation email ──────────────────────────────────────────────

async function sendRefundEmail(
  email: string,
  planId: string,
  amountInr: number,
  refundId: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) {
    console.warn(`razorpay-webhook: sendRefundEmail skipped — key_set=${!!RESEND_API_KEY}, email_set=${!!email}`);
    return;
  }
  const planLabel = PLAN_LABELS[planId] ?? planId;
  const amountStr = `₹${(amountInr).toLocaleString('en-IN')}`;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Refund processed — ${amountStr} is on its way`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
            <h1 style="color:#C9993A;font-size:24px;margin-bottom:8px">Your refund is being processed</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              We have issued a refund of <strong>${amountStr}</strong> for your
              <strong>${planLabel}</strong> subscription. It will appear in your account
              within 5–7 business days depending on your bank.
            </p>
            <p style="color:rgba(255,255,255,0.5);font-size:13px;margin-top:16px">
              Refund reference: ${refundId}<br>
              Your account has been moved to the Free plan.<br>
              Your learning history and Saathi memory are fully preserved.
            </p>
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:20px">
              Questions? Reply to this email or write to support@edusaathiai.in
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('razorpay-webhook: refund email failed', err instanceof Error ? err.message : err);
  }
}

// ── Payment confirmation email ─────────────────────────────────────────────

async function sendUpgradeEmail(
  email: string,
  planId: string,
  expiresAt: string,
  studentName?: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) {
    console.warn(`razorpay-webhook: sendUpgradeEmail skipped — key_set=${!!RESEND_API_KEY}, email_set=${!!email}, from=${RESEND_FROM_EMAIL || 'NOT_SET'}`);
    return;
  }
  const planLabel   = PLAN_LABELS[planId] ?? planId;
  const renewalDate = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const safeEmail   = sanitize(email);
  const name        = studentName ?? 'Student';

  const featureRow = (emoji: string, title: string, body: string) =>
    `<tr>
      <td style="padding:10px 0;vertical-align:top;width:28px;font-size:18px">${emoji}</td>
      <td style="padding:10px 0 10px 10px;vertical-align:top">
        <strong style="color:#FFFFFF;font-size:13px">${title}</strong><br>
        <span style="color:rgba(255,255,255,0.6);font-size:12px;line-height:1.55">${body}</span>
      </td>
    </tr>`;

  try {
    console.log(`razorpay-webhook: sending upgrade email, key_len=${RESEND_API_KEY.length}`);
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Welcome to EdUsaathiAI Plus, ${name}! 🎉`,
        html: `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;background:#0B1F3A;color:#fff;border-radius:16px;overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0B1F3A,#1A3A5C);padding:36px 36px 28px;border-bottom:1px solid rgba(201,153,58,0.2)">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#C9993A">EdUsaathiAI Plus</p>
    <h1 style="margin:0;font-size:26px;font-weight:700;color:#FFFFFF;line-height:1.2">Welcome to EdUsaathiAI Plus, ${name}! 🎉</h1>
  </div>

  <!-- Body -->
  <div style="padding:28px 36px">

    <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.7;margin:0 0 6px">
      Your Saathi remembers you. Every session builds on the last — your Saathi tracks what you covered,
      how deep you went, and where you left off, so you never have to repeat yourself.
    </p>

    <p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.7;margin:0 0 20px">
      Here is everything waiting for you:
    </p>

    <table style="width:100%;border-collapse:collapse">
      ${featureRow('🔊', 'Listen to every answer', 'Tap the speaker icon below any bot reply to hear it read aloud — great for learning on the go.')}
      ${featureRow('🎤', 'Speak in your own language', 'Use the mic button to speak instead of type — Hindi, Gujarati, Marathi, Tamil, Telugu, Kannada, Bengali, and English all supported.')}
      ${featureRow('🧑‍🏫', 'Find a real subject expert', 'Faculty Finder connects you with verified faculty who teach your exact subject. Book a private 1:1 session from ₹500.')}
      ${featureRow('✉️', 'Request a lecture from your dream faculty', 'Raise a Lecture Request — faculty who match your need will see it and offer a session directly to you.')}
      ${featureRow('🔖', 'Bookmark faculty for later', 'Found a great faculty profile but not ready to book? Bookmark them and return when you are ready.')}
      ${featureRow('🎙️', 'Learn live alongside other students', 'Live Sessions are group lectures by expert faculty in real time — ask questions, hear different perspectives, learn more in less time.')}
      ${featureRow('🎯', 'Let faculty find you', 'Declare What You Want — tell us what topic or skill you need and matching faculty will create sessions just for you.')}
      ${featureRow('🃏', 'Save any answer as a flashcard', 'Tap the 🃏 icon on any bot reply to save it. Review it later in your Flashcards dashboard.')}
      ${featureRow('Aa', 'Make reading comfortable for you', 'Tap the Aa button in the header to change font size, style, and text colour. Colorblind-safe palettes, high contrast, and reduce motion are all available.')}
      ${featureRow('🌐', 'Your Saathi can answer in your language', 'Ask in Hindi, Gujarati, or any Indian language — your Saathi will respond in the same language. Just type or speak naturally.')}
      ${featureRow('🎓', 'Find internships matched to your soul', 'Internship and research opportunities matched to your Saathi subject and academic interests — not random listings.')}
    </table>

    <p style="margin:24px 0 4px;color:rgba(255,255,255,0.75);font-size:14px;line-height:1.7">
      Your learning journey just got unlimited. We are honoured to be your Saathi. ✦
    </p>
    <p style="margin:0 0 28px;color:rgba(255,255,255,0.5);font-size:13px">— The EdUsaathiAI Team</p>

    <a href="https://www.edusaathiai.in/chat"
       style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
      Start learning →
    </a>

    <!-- Plan details -->
    <p style="color:rgba(255,255,255,0.35);font-size:12px;margin-top:24px;line-height:1.7">
      Plan: ${planLabel} &nbsp;·&nbsp; Next renewal: ${renewalDate}<br>
      Questions? <a href="mailto:support@edusaathiai.in" style="color:#C9993A">support@edusaathiai.in</a>
    </p>
  </div>

  <!-- Footer -->
  <div style="background:rgba(0,0,0,0.2);padding:16px 36px;border-top:1px solid rgba(255,255,255,0.07)">
    <p style="font-size:11px;color:rgba(255,255,255,0.25);margin:0;line-height:1.6;text-align:center">
      This email was sent to ${safeEmail} because you made a purchase on EdUsaathiAI.<br>
      <strong style="color:rgba(255,255,255,0.4)">If this landed in spam — please mark "Not spam" to receive future emails.</strong>
    </p>
  </div>

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

// ── Cancellation email ────────────────────────────────────────────────────────

async function sendCancelledEmail(
  email: string,
  planId: string,
  studentName?: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) return;
  const planLabel = PLAN_LABELS[planId] ?? planId;
  const name = studentName ?? 'Student';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Your ${planLabel} subscription has been cancelled`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
            <h1 style="color:#C9993A;font-size:24px;margin-bottom:8px">Subscription cancelled</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Hi ${name}, your <strong>${planLabel}</strong> subscription has been cancelled.
              Your account has been moved to the Free plan.
            </p>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Your Saathi memory, chat history, and soul profile are fully preserved.
              You can resubscribe anytime to unlock all features again.
            </p>
            <a href="https://www.edusaathiai.in/pricing"
               style="display:inline-block;margin-top:16px;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
              View plans →
            </a>
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:20px">
              Questions? Reply to this email or write to support@edusaathiai.in
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('razorpay-webhook: cancel email failed', err instanceof Error ? err.message : err);
  }
}

// ── Pause email ───────────────────────────────────────────────────────────────

async function sendPausedEmail(
  email: string,
  planId: string,
  studentName?: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) return;
  const planLabel = PLAN_LABELS[planId] ?? planId;
  const name = studentName ?? 'Student';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Your ${planLabel} subscription is paused`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
            <h1 style="color:#C9993A;font-size:24px;margin-bottom:8px">Subscription paused</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Hi ${name}, your <strong>${planLabel}</strong> subscription is now paused.
              You will not be billed during this period.
            </p>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Your Saathi memory and learning history are safe. Resume anytime to pick up
              right where you left off — your Saathi remembers everything.
            </p>
            <a href="https://www.edusaathiai.in/profile"
               style="display:inline-block;margin-top:16px;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
              Resume subscription →
            </a>
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:20px">
              Questions? Reply to this email or write to support@edusaathiai.in
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('razorpay-webhook: pause email failed', err instanceof Error ? err.message : err);
  }
}

// ── Resume email ──────────────────────────────────────────────────────────────

async function sendResumedEmail(
  email: string,
  planId: string,
  studentName?: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) return;
  const planLabel = PLAN_LABELS[planId] ?? planId;
  const name = studentName ?? 'Student';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Welcome back, ${name}! Your ${planLabel} is active again`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
            <h1 style="color:#C9993A;font-size:24px;margin-bottom:8px">You're back! ✦</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Hi ${name}, your <strong>${planLabel}</strong> subscription is active again.
              All your premium features are unlocked.
            </p>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Your Saathi has been waiting. Everything is exactly as you left it —
              your soul profile, chat history, and learning progress are all intact.
            </p>
            <a href="https://www.edusaathiai.in/chat"
               style="display:inline-block;margin-top:16px;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
              Continue learning →
            </a>
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:20px">
              Questions? Reply to this email or write to support@edusaathiai.in
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('razorpay-webhook: resume email failed', err instanceof Error ? err.message : err);
  }
}

// ── Payment failed email ──────────────────────────────────────────────────────

async function sendPaymentFailedEmail(
  email: string,
  planId: string,
  studentName?: string,
): Promise<void> {
  if (!RESEND_API_KEY || !email) return;
  const planLabel = PLAN_LABELS[planId] ?? planId;
  const name = studentName ?? 'Student';

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Payment could not be processed — ${planLabel}`,
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
            <h1 style="color:#C9993A;font-size:24px;margin-bottom:8px">Payment unsuccessful</h1>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Hi ${name}, we could not process your payment for <strong>${planLabel}</strong>.
              This usually happens due to insufficient funds or a temporary bank issue.
            </p>
            <p style="color:rgba(255,255,255,0.7);line-height:1.7">
              Don't worry — your account is unchanged. You can try again when ready.
              If this keeps happening, try a different payment method.
            </p>
            <a href="https://www.edusaathiai.in/pricing"
               style="display:inline-block;margin-top:16px;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
              Try again →
            </a>
            <p style="color:rgba(255,255,255,0.4);font-size:12px;margin-top:20px">
              Questions? Reply to this email or write to support@edusaathiai.in
            </p>
          </div>
        `,
      }),
    });
  } catch (err) {
    console.error('razorpay-webhook: payment-failed email failed', err instanceof Error ? err.message : err);
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

type RazorpayRefundEntity = {
  id?: string;
  payment_id?: string;
  amount?: number;   // paise
  status?: string;
};

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    payment?  : { entity?: RazorpayPaymentEntity };
    subscription?: { entity?: RazorpaySubscriptionEntity };
    refund?   : { entity?: RazorpayRefundEntity };
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
    // Not a subscription order — check if it's a faculty session payment
    const { data: sessRow } = await admin
      .from('faculty_sessions')
      .select('id, student_id, faculty_id, fee_paise, status, topic')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();

    if (sessRow) {
      const sess = sessRow as {
        id: string; student_id: string; faculty_id: string;
        fee_paise: number; status: string; topic: string;
      };

      if (sess.status === 'paid') {
        console.log(`razorpay-webhook: session '${sess.id}' already paid — skipping`);
        return;
      }

      await admin.from('faculty_sessions').update({
        status:               'paid',
        razorpay_payment_id:  paymentId ?? null,
        paid_at:              new Date().toISOString(),
        updated_at:           new Date().toISOString(),
      }).eq('id', sess.id);

      // Notify faculty
      await admin.from('notifications').insert({
        user_id:    sess.faculty_id,
        type:       'session_paid',
        title:      'Session payment received',
        body:       `A student has paid for "${sess.topic}". Prepare for the session!`,
        action_url: '/faculty/sessions',
      });

      console.log(`razorpay-webhook: faculty session '${sess.id}' marked paid`);
    } else {
      // Check if it's a saathi_addon payment
      const { data: addonRow } = await admin
        .from('saathi_addons')
        .select('id, user_id, vertical_id, status')
        .eq('razorpay_sub_id', orderId)
        .maybeSingle();

      if (addonRow) {
        const addon = addonRow as { id: string; user_id: string; vertical_id: string; status: string };

        if (addon.status === 'active') {
          console.log(`razorpay-webhook: saathi_addon '${addon.id}' already active — skipping`);
          return;
        }

        // Activate addon
        await admin.from('saathi_addons').update({
          status:          'active',
          next_billing_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', addon.id);

        // Create enrollment
        await admin.from('saathi_enrollments').upsert({
          user_id:       addon.user_id,
          vertical_id:   addon.vertical_id,
          unlock_method: 'plus_grant',
          points_spent:  0,
        }, { onConflict: 'user_id,vertical_id' });

        console.log(`razorpay-webhook: saathi_addon activated for user ${addon.user_id}, vertical ${addon.vertical_id}`);
      } else {
        console.error('razorpay-webhook: no subscription, session, or addon found for order', orderId);
      }
    }
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
  const { error: profileUpdateError } = await admin.from('profiles').update({
    plan_id: sub.plan_id,
    subscription_status: 'active',
    subscription_expires_at: expiresAt,
  }).eq('id', sub.user_id);

  if (profileUpdateError) {
    // This is fatal — the payment is recorded but the user didn't get access.
    // Throw so the outer catch logs it to Sentry and Razorpay retries.
    throw new Error(`profiles.update failed for user ${sub.user_id}: ${profileUpdateError.message}`);
  }

  // Send confirmation email + WhatsApp (fire-and-forget)
  const { data: userProfile } = await admin
    .from('profiles')
    .select('email, display_name, wa_phone')
    .eq('id', sub.user_id)
    .maybeSingle();

  const displayName = (userProfile?.display_name as string | null) ?? undefined;
  const firstName   = (displayName ?? 'Student').split(' ')[0];
  const planLabel   = PLAN_LABELS[sub.plan_id] ?? sub.plan_id;

  if (userProfile?.email) {
    await sendUpgradeEmail(
      userProfile.email as string,
      sub.plan_id,
      expiresAt,
      displayName,
    );
  }

  if (userProfile?.wa_phone) {
    await sendWhatsAppActivation(
      userProfile.wa_phone as string,
      firstName,
      planLabel,
      expiresAt,
    );
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

  // Send payment failed email (fire-and-forget)
  const { data: failedSub } = await admin
    .from('subscriptions')
    .select('user_id, plan_id')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  if (failedSub) {
    const fs = failedSub as { user_id: string; plan_id: string };
    const { data: failedProfile } = await admin
      .from('profiles')
      .select('email, display_name')
      .eq('id', fs.user_id)
      .maybeSingle();

    if (failedProfile?.email) {
      await sendPaymentFailedEmail(
        failedProfile.email as string,
        fs.plan_id,
        (failedProfile.display_name as string | null) ?? undefined,
      );
    }
  }
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

  // Downgrade to free immediately — soul data is preserved
  await admin.from('profiles').update({
    subscription_status: 'cancelled',
    plan_id: 'free',
    subscription_expires_at: null,
    razorpay_subscription_id: null,
  }).eq('id', sub.user_id);

  // Send cancellation email (fire-and-forget)
  const { data: cancelProfile } = await admin
    .from('profiles')
    .select('email, display_name, plan_id')
    .eq('id', sub.user_id)
    .maybeSingle();

  if (cancelProfile?.email) {
    await sendCancelledEmail(
      cancelProfile.email as string,
      (cancelProfile.plan_id as string) ?? 'plus-monthly',
      (cancelProfile.display_name as string | null) ?? undefined,
    );
  }
}

async function handleSubscriptionPaused(
  admin: AdminClient,
  subscription: RazorpaySubscriptionEntity
): Promise<void> {
  const { id: subId } = subscription;
  if (!subId) return;

  const { data: subRow } = await admin
    .from('profiles')
    .select('id, email, display_name, plan_id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle();

  if (!subRow) return;
  const profile = subRow as { id: string; email?: string; display_name?: string; plan_id?: string };

  await admin.from('profiles').update({
    subscription_status: 'paused',
  }).eq('id', profile.id);

  console.log(`razorpay-webhook: subscription.paused for profile ${profile.id}`);

  // Send pause email (fire-and-forget)
  if (profile.email) {
    await sendPausedEmail(
      profile.email,
      profile.plan_id ?? 'plus-monthly',
      profile.display_name ?? undefined,
    );
  }
}

// Handles both payment.refunded and refund.processed
// payment.refunded  → payload.payment.entity has the payment, payload.refund.entity has refund
// refund.processed  → same structure
async function handlePaymentRefunded(
  admin: AdminClient,
  payment: RazorpayPaymentEntity,
  refund: RazorpayRefundEntity,
  rawPayload: RazorpayWebhookPayload,
  eventName: string,
): Promise<void> {
  const paymentId = refund.payment_id ?? payment.id;
  const refundId  = refund.id;
  if (!paymentId) {
    console.warn(`razorpay-webhook: ${eventName} — no payment_id found in payload`);
    return;
  }

  // Idempotency: if refund_id already stored, skip
  if (refundId) {
    const { data: existing } = await admin
      .from('subscriptions')
      .select('id')
      .eq('razorpay_refund_id', refundId)
      .maybeSingle();
    if (existing) {
      console.log(`razorpay-webhook: duplicate refund_id '${refundId}' — skipping`);
      return;
    }
  }

  // Look up subscription by payment_id
  const { data: subRow } = await admin
    .from('subscriptions')
    .select('id, user_id, plan_id, amount_inr, status')
    .eq('razorpay_payment_id', paymentId)
    .maybeSingle();

  if (!subRow) {
    console.warn(`razorpay-webhook: ${eventName} — no subscription found for payment_id '${paymentId}'`);
    return;
  }

  const sub = subRow as { id: string; user_id: string; plan_id: string; amount_inr: number; status: string };

  // Amount refunded (paise → INR). Fall back to original subscription amount.
  const refundAmountInr = refund.amount ? Math.round(refund.amount / 100) : sub.amount_inr;

  // Update subscription ledger
  await admin.from('subscriptions').update({
    status: 'refunded',
    razorpay_refund_id: refundId ?? null,
    refunded_at: new Date().toISOString(),
    refund_amount_inr: refundAmountInr,
    webhook_event: eventName,
    raw_webhook: rawPayload,
  }).eq('id', sub.id);

  // Downgrade profile to free immediately
  await admin.from('profiles').update({
    plan_id: 'free',
    subscription_status: 'cancelled',
    subscription_expires_at: null,
  }).eq('id', sub.user_id);

  console.log(`razorpay-webhook: ${eventName} processed — user ${sub.user_id} downgraded to free`);

  // Send refund email (fire-and-forget)
  const { data: profile } = await admin
    .from('profiles')
    .select('email')
    .eq('id', sub.user_id)
    .maybeSingle();

  if (profile?.email) {
    await sendRefundEmail(
      profile.email as string,
      sub.plan_id,
      refundAmountInr,
      refundId ?? paymentId,
    );
  }
}

async function handleSubscriptionResumed(
  admin: AdminClient,
  subscription: RazorpaySubscriptionEntity
): Promise<void> {
  const { id: subId } = subscription;
  if (!subId) return;

  const { data: subRow } = await admin
    .from('profiles')
    .select('id, email, display_name, plan_id')
    .eq('razorpay_subscription_id', subId)
    .maybeSingle();

  if (!subRow) return;
  const profile = subRow as { id: string; email?: string; display_name?: string; plan_id?: string };

  await admin.from('profiles').update({
    subscription_status: 'active',
    pause_until: null,
  }).eq('id', profile.id);

  console.log(`razorpay-webhook: subscription.resumed for profile ${profile.id}`);

  // Send resumed email (fire-and-forget)
  if (profile.email) {
    await sendResumedEmail(
      profile.email,
      profile.plan_id ?? 'plus-monthly',
      profile.display_name ?? undefined,
    );
  }
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
      case 'payment.refunded':
      case 'refund.processed': {
        const payment = payload.payload?.payment?.entity ?? {};
        const refund  = payload.payload?.refund?.entity  ?? {};
        await handlePaymentRefunded(admin, payment, refund, payload, event);
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
