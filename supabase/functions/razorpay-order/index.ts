/**
 * supabase/functions/razorpay-order/index.ts
 *
 * Creates a Razorpay order for a given plan.
 * Returns { orderId, amount, currency, keyId } to the client so it can
 * open the Razorpay checkout sheet.
 *
 * Input:  POST { planId: 'plus-monthly' | 'plus-annual' | 'institution' }
 * Output: { orderId, amount, currency, keyId, subscriptionRowId }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * Key guard: selects the correct Razorpay key pair based on APP_ENV.
 *   APP_ENV=development → rzp_test_* keys (RAZORPAY_TEST_KEY_ID / SECRET)
 *   APP_ENV=production  → rzp_live_* keys (RAZORPAY_LIVE_KEY_ID / SECRET)
 *
 * Fails fast at startup if the wrong key type is loaded for the environment,
 * preventing live charges in dev or test payments in production.
 */
const APP_ENV = Deno.env.get('APP_ENV') ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';

const RAZORPAY_KEY_ID = IS_PRODUCTION
  ? (Deno.env.get('RAZORPAY_LIVE_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID') || '')
  : (Deno.env.get('RAZORPAY_TEST_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID') || '');

const RAZORPAY_KEY_SECRET = IS_PRODUCTION
  ? (Deno.env.get('RAZORPAY_LIVE_KEY_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '')
  : (Deno.env.get('RAZORPAY_TEST_KEY_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '');

// Startup key-type validation
const KEY_PREFIX_EXPECTED = IS_PRODUCTION ? 'rzp_live_' : 'rzp_test_';
const KEY_PREFIX_FORBIDDEN = IS_PRODUCTION ? 'rzp_test_' : 'rzp_live_';

if (RAZORPAY_KEY_ID && RAZORPAY_KEY_ID.startsWith(KEY_PREFIX_FORBIDDEN)) {
  // Will be caught per-request below — logged here for observability
  console.error(
    `razorpay-order: FATAL — ${IS_PRODUCTION ? 'test' : 'live'} key loaded in ${APP_ENV} environment`
  );
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan definitions (INR, in paise for Razorpay)
const PLAN_AMOUNTS: Record<string, { amountInr: number; label: string }> = {
  'plus-monthly':     { amountInr: 199,  label: 'Saathi Plus (Monthly)' },
  'plus-annual':      { amountInr: 1499, label: 'Saathi Plus (Annual)' },
  'pro-monthly':      { amountInr: 499,  label: 'Saathi Pro (Monthly)' },
  'pro-annual':       { amountInr: 3999, label: 'Saathi Pro (Annual)' },
  'unlimited-monthly':{ amountInr: 4999, label: 'Saathi Unlimited' },
  'institution':      { amountInr: 4999, label: 'Institution' },
};

type RazorpayOrderResponse = {
  id?: string;
  amount?: number;
  currency?: string;
  error?: { description?: string };
};

async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ orderId: string; amount: number; currency: string }> {
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: 'INR',
      receipt: params.receipt,
      notes: params.notes,
    }),
  });

  const json = (await res.json()) as RazorpayOrderResponse;

  if (!res.ok || !json.id) {
    throw new Error(`Razorpay API error: ${json.error?.description ?? res.status}`);
  }

  return {
    orderId: json.id,
    amount: json.amount ?? params.amountPaise,
    currency: json.currency ?? 'INR',
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Auth verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 5 order creations per user per minute
    const allowed = await checkRateLimit('razorpay-order', user.id, 5, 60);
    if (!allowed) return rateLimitResponse(CORS_HEADERS);

    // Parse request
    type RequestBody = { planId?: string; billing?: string; sessionId?: string };
    const body = (await req.json()) as RequestBody;
    const { planId: rawPlanId, billing = 'monthly', sessionId } = body;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), {
        status: 503,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Key-type guard: block mismatched key/environment combinations
    if (RAZORPAY_KEY_ID.startsWith(KEY_PREFIX_FORBIDDEN)) {
      console.error(
        `razorpay-order: refusing to create order — ${IS_PRODUCTION ? 'test' : 'live'} key in ${APP_ENV}`
      );
      return new Response(
        JSON.stringify({
          error: IS_PRODUCTION
            ? 'Live payments misconfigured: test key detected in production'
            : 'Dev safety: live key detected in development — refusing to create order',
        }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!RAZORPAY_KEY_ID.startsWith(KEY_PREFIX_EXPECTED)) {
      return new Response(
        JSON.stringify({ error: `Payment key format unexpected for environment: ${APP_ENV}` }),
        {
          status: 503,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Faculty session payment ───────────────────────────────────────────────
    if (sessionId) {
      const { data: sess, error: sessErr } = await admin
        .from('faculty_sessions')
        .select('id, fee_paise, status, student_id, topic, faculty_id')
        .eq('id', sessionId)
        .eq('student_id', user.id)
        .eq('status', 'accepted')
        .single();

      if (sessErr || !sess) {
        return new Response(JSON.stringify({ error: 'Session not found or not payable' }), {
          status: 404,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const session = sess as {
        id: string; fee_paise: number; status: string;
        student_id: string; topic: string; faculty_id: string;
      };

      const receipt = `sess_${session.id.slice(0, 8)}_${Date.now()}`;
      const rzpOrder = await createRazorpayOrder({
        amountPaise: session.fee_paise,
        receipt,
        notes: {
          user_id:    user.id,
          session_id: session.id,
          product:    'EdUsaathiAI Faculty Session',
        },
      });

      // Store order ID on the session row so webhook can look it up
      await admin
        .from('faculty_sessions')
        .update({ razorpay_order_id: rzpOrder.orderId, updated_at: new Date().toISOString() })
        .eq('id', session.id);

      return new Response(
        JSON.stringify({
          orderId:   rzpOrder.orderId,
          amount:    rzpOrder.amount,
          currency:  rzpOrder.currency,
          keyId:     RAZORPAY_KEY_ID,
          sessionId: session.id,
          topic:     session.topic,
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ── Subscription payment (existing flow) ─────────────────────────────────
    // Normalise: 'plus' + 'monthly' → 'plus-monthly'
    const planId = rawPlanId && rawPlanId !== 'institution'
      ? `${rawPlanId}-${billing}`
      : rawPlanId;

    if (!planId || !PLAN_AMOUNTS[planId]) {
      return new Response(JSON.stringify({ error: 'Invalid planId' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const plan = PLAN_AMOUNTS[planId];
    const amountPaise = plan.amountInr * 100;
    const receipt = `eusa_${user.id.slice(0, 8)}_${Date.now()}`;

    const rzpOrder = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        user_id: user.id,
        plan_id: planId,
        product: 'EdUsaathiAI',
      },
    });

    const { data: subRow, error: insertError } = await admin
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan_id: planId,
        razorpay_order_id: rzpOrder.orderId,
        status: 'created',
        amount_inr: plan.amountInr,
        currency: 'INR',
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(`DB insert: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify({
        orderId: rzpOrder.orderId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: RAZORPAY_KEY_ID,
        subscriptionRowId: (subRow as { id: string }).id,
        planLabel: plan.label,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    console.error('razorpay-order error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
