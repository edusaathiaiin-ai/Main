/**
 * supabase/functions/razorpay-booking-order/index.ts
 *
 * Creates a Razorpay order for a LIVE SESSION seat booking.
 * Parallel to razorpay-order (which is subscription-only).
 *
 * Input:  POST { sessionId: uuid, bookingType: 'full' | 'single', lectureIds?: uuid[] }
 * Output: { orderId, amount, currency, keyId, seatPriceType }
 *
 * The CLIENT uses { orderId, amount, keyId } to open the Razorpay sheet.
 * On successful handler() the client POSTs to verify-live-booking with the
 * payment_id + signature. That function verifies HMAC, calls the atomic
 * book_live_session_seat RPC, and sends confirmation emails.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { isUUID, isOneOf } from '../_shared/validate.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const APP_ENV = Deno.env.get('APP_ENV') ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';

const RAZORPAY_KEY_ID = IS_PRODUCTION
  ? (Deno.env.get('RAZORPAY_LIVE_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID') || '')
  : (Deno.env.get('RAZORPAY_TEST_KEY_ID') || Deno.env.get('RAZORPAY_KEY_ID') || '');

const RAZORPAY_KEY_SECRET = IS_PRODUCTION
  ? (Deno.env.get('RAZORPAY_LIVE_KEY_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '')
  : (Deno.env.get('RAZORPAY_TEST_KEY_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '');

const KEY_PREFIX_FORBIDDEN = IS_PRODUCTION ? 'rzp_test_' : 'rzp_live_';

type RazorpayOrderResponse = { id?: string; amount?: number; currency?: string; error?: { description?: string } };

async function createRazorpayOrder(params: {
  amountPaise: number;
  receipt: string;
  notes: Record<string, string>;
}): Promise<{ orderId: string; amount: number; currency: string }> {
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${credentials}` },
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
  return { orderId: json.id, amount: json.amount ?? params.amountPaise, currency: json.currency ?? 'INR' };
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });

    const allowed = await checkRateLimit('razorpay-booking-order', user.id, 10, 60);
    if (!allowed) return rateLimitResponse(CORS);

    type Body = { sessionId?: unknown; bookingType?: unknown; lectureIds?: unknown };
    const body = (await req.json()) as Body;
    const sessionId = typeof body.sessionId === 'string' && isUUID(body.sessionId) ? body.sessionId : null;
    const bookingTypeRaw = body.bookingType;
    const bookingType = isOneOf(bookingTypeRaw, ['full', 'single'] as const) ? bookingTypeRaw : 'full';
    const lectureIds = Array.isArray(body.lectureIds) ? body.lectureIds.filter((id): id is string => typeof id === 'string' && isUUID(id)) : [];

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Invalid sessionId' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (RAZORPAY_KEY_ID.startsWith(KEY_PREFIX_FORBIDDEN)) {
      return new Response(JSON.stringify({ error: IS_PRODUCTION ? 'Live payments misconfigured' : 'Dev safety: live key in dev' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Fetch session — compute price server-side (NEVER trust client)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: session, error: sessErr } = await admin
      .from('live_sessions')
      .select('id, title, price_per_seat_paise, bundle_price_paise, early_bird_price_paise, early_bird_seats, seats_booked, total_seats, status, session_format, faculty_id')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (session.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Session not open for booking' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (session.faculty_id === user.id) {
      return new Response(JSON.stringify({ error: 'Faculty cannot book their own session' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
    if (session.seats_booked >= session.total_seats) {
      return new Response(JSON.stringify({ error: 'sold_out' }), { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Already booked?
    const { data: existing } = await admin
      .from('live_bookings')
      .select('id')
      .eq('session_id', sessionId)
      .eq('student_id', user.id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: 'already_booked' }), { status: 409, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Price calculation — early bird > bundle > standard
    let amountPaise: number;
    let priceType: 'standard' | 'early_bird' | 'bundle';
    const earlyBirdAvailable =
      session.early_bird_price_paise != null &&
      session.early_bird_seats != null &&
      session.seats_booked < session.early_bird_seats;

    if (earlyBirdAvailable && session.early_bird_price_paise) {
      amountPaise = session.early_bird_price_paise;
      priceType = 'early_bird';
    } else if (bookingType === 'full' && session.bundle_price_paise && session.session_format === 'series') {
      amountPaise = session.bundle_price_paise;
      priceType = 'bundle';
    } else if (bookingType === 'single' && lectureIds.length > 0) {
      amountPaise = session.price_per_seat_paise * lectureIds.length;
      priceType = 'standard';
    } else {
      amountPaise = session.price_per_seat_paise;
      priceType = 'standard';
    }

    if (!Number.isFinite(amountPaise) || amountPaise < 100) {
      return new Response(JSON.stringify({ error: 'Invalid price' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Razorpay receipt max 40 chars — use a short derived id
    const receipt = `lb_${sessionId.slice(0, 8)}_${user.id.slice(0, 8)}_${Date.now().toString(36)}`.slice(0, 40);

    const order = await createRazorpayOrder({
      amountPaise,
      receipt,
      notes: {
        kind: 'live_session_booking',
        session_id: sessionId,
        student_id: user.id,
        booking_type: bookingType,
        price_type: priceType,
      },
    });

    return new Response(
      JSON.stringify({
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        keyId: RAZORPAY_KEY_ID,
        priceType,
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('razorpay-booking-order failed', err);
    return new Response(JSON.stringify({ error: 'Could not create order. Please try again.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
