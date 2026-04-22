/**
 * supabase/functions/verify-live-booking/index.ts
 *
 * Verifies a successful Razorpay checkout for a live-session booking,
 * atomically reserves a seat via book_live_session_seat RPC, and fires
 * two confirmation emails (student + faculty).
 *
 * Input:
 *   POST {
 *     razorpayOrderId: string,
 *     razorpayPaymentId: string,
 *     razorpaySignature: string,
 *     sessionId: uuid,
 *     bookingType: 'full' | 'single',
 *     lectureIds: uuid[] (optional),
 *     priceType: 'standard' | 'early_bird' | 'bundle',
 *     amountPaise: integer
 *   }
 *
 * HMAC signature is computed as:
 *   HMAC_SHA256(razorpay_order_id + '|' + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 *
 * Returns { bookingId, seatsBooked, totalSeats } on success.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { isUUID, isOneOf } from '../_shared/validate.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const APP_ENV = Deno.env.get('APP_ENV') ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';

const RAZORPAY_KEY_SECRET = IS_PRODUCTION
  ? (Deno.env.get('RAZORPAY_LIVE_KEY_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '')
  : (Deno.env.get('RAZORPAY_TEST_KEY_SECRET') || Deno.env.get('RAZORPAY_KEY_SECRET') || '');

async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sigBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(`${orderId}|${paymentId}`));
  const hex = Array.from(new Uint8Array(sigBytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  // Timing-safe compare
  if (hex.length !== signature.length) return false;
  let result = 0;
  for (let i = 0; i < hex.length; i++) result |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
  return result === 0;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function formatIST(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }) + ' IST';
  } catch {
    return isoDate;
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'EdUsaathiAI <support@edusaathiai.in>',
      to: [to],
      subject,
      html,
    }),
  }).catch((err) => console.error('Resend send failed', err));
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Missing authorization' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });

    const allowed = await checkRateLimit('verify-live-booking', user.id, 10, 60);
    if (!allowed) return rateLimitResponse(CORS);

    if (!RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment gateway not configured' }), { status: 503, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    type Body = {
      razorpayOrderId?: unknown; razorpayPaymentId?: unknown; razorpaySignature?: unknown;
      sessionId?: unknown; bookingType?: unknown; lectureIds?: unknown; priceType?: unknown; amountPaise?: unknown;
    };
    const body = (await req.json()) as Body;

    const razorpayOrderId = typeof body.razorpayOrderId === 'string' ? body.razorpayOrderId : null;
    const razorpayPaymentId = typeof body.razorpayPaymentId === 'string' ? body.razorpayPaymentId : null;
    const razorpaySignature = typeof body.razorpaySignature === 'string' ? body.razorpaySignature : null;
    const sessionId = typeof body.sessionId === 'string' && isUUID(body.sessionId) ? body.sessionId : null;
    const bookingType = isOneOf(body.bookingType, ['full', 'single'] as const) ? body.bookingType : 'full';
    const priceType = isOneOf(body.priceType, ['standard', 'early_bird', 'bundle'] as const) ? body.priceType : 'standard';
    const lectureIds = Array.isArray(body.lectureIds)
      ? body.lectureIds.filter((id): id is string => typeof id === 'string' && isUUID(id))
      : [];
    const amountPaise = typeof body.amountPaise === 'number' && Number.isFinite(body.amountPaise) ? Math.round(body.amountPaise) : null;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !sessionId || amountPaise === null || amountPaise < 100) {
      return new Response(JSON.stringify({ error: 'Missing or invalid fields' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // Verify signature
    const ok = await verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature, RAZORPAY_KEY_SECRET);
    if (!ok) {
      console.error('verify-live-booking: HMAC failed', { user: user.id, razorpayOrderId });
      return new Response(JSON.stringify({ error: 'Signature verification failed' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Atomic seat reservation + booking insert
    const { data: rpcData, error: rpcError } = await admin.rpc('book_live_session_seat', {
      p_session_id: sessionId,
      p_student_id: user.id,
      p_booking_type: bookingType,
      p_lecture_ids: lectureIds.length > 0 ? lectureIds : null,
      p_amount_paid_paise: amountPaise,
      p_price_type: priceType,
      p_razorpay_order_id: razorpayOrderId,
      p_razorpay_payment_id: razorpayPaymentId,
    });

    if (rpcError) {
      const msg = rpcError.message ?? '';
      let status = 500;
      let error = 'Booking failed';
      if (msg.includes('sold_out')) { status = 409; error = 'sold_out'; }
      else if (msg.includes('already_booked')) { status = 409; error = 'already_booked'; }
      else if (msg.includes('session_not_bookable')) { status = 400; error = 'session_not_bookable'; }
      else if (msg.includes('session_not_found')) { status = 404; error = 'session_not_found'; }
      console.error('verify-live-booking: RPC failed', msg);
      return new Response(JSON.stringify({ error, detail: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    const bookingId = rpcRow?.booking_id;
    const seatsBooked = rpcRow?.seats_booked;
    const totalSeats = rpcRow?.total_seats;

    // ── Confirmation emails (fire-and-forget; booking is already committed) ──
    try {
      // Load session + faculty + student + first lecture for email context
      const [{ data: sess }, { data: student }] = await Promise.all([
        admin
          .from('live_sessions')
          .select('title, faculty_id, meeting_link, session_format, vertical_id')
          .eq('id', sessionId)
          .single(),
        admin
          .from('profiles')
          .select('full_name, email')
          .eq('id', user.id)
          .single(),
      ]);

      const [{ data: faculty }, { data: firstLecture }, { data: vertical }] = await Promise.all([
        sess?.faculty_id
          ? admin.from('profiles').select('full_name, email').eq('id', sess.faculty_id).single()
          : Promise.resolve({ data: null as { full_name?: string; email?: string } | null }),
        admin
          .from('live_lectures')
          .select('title, scheduled_at, duration_minutes')
          .eq('session_id', sessionId)
          .order('scheduled_at', { ascending: true })
          .limit(1)
          .maybeSingle(),
        sess?.vertical_id
          ? admin.from('verticals').select('name, emoji').eq('id', sess.vertical_id).single()
          : Promise.resolve({ data: null as { name?: string; emoji?: string } | null }),
      ]);

      const studentName = student?.full_name ?? 'Student';
      const facultyName = faculty?.full_name ?? 'Faculty';
      const sessionTitle = sess?.title ?? 'Live Session';
      const saathiName = vertical?.name ?? 'your Saathi';
      const saathiEmoji = vertical?.emoji ?? '';
      const scheduled = firstLecture?.scheduled_at ? formatIST(firstLecture.scheduled_at) : 'Date TBD';
      const amountStr = formatINR(amountPaise);

      // — Student confirmation —
      if (student?.email) {
        const studentHtml = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
  <p style="color:#C9993A;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">Booking Confirmed ✓</p>
  <h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 20px;font-size:22px;line-height:1.3">${esc(saathiEmoji)} ${esc(sessionTitle)}</h2>
  <p style="color:rgba(255,255,255,0.75);line-height:1.7;margin:0 0 18px">Hi ${esc(studentName)}, your seat is reserved.</p>
  <div style="background:rgba(201,153,58,0.1);border:0.5px solid rgba(201,153,58,0.3);border-radius:10px;padding:16px;margin:0 0 20px">
    <p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Faculty</p>
    <p style="color:#fff;font-size:15px;margin:0 0 12px">${esc(facultyName)}</p>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">First lecture</p>
    <p style="color:#fff;font-size:15px;margin:0 0 12px">${esc(scheduled)}</p>
    <p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Paid</p>
    <p style="color:#fff;font-size:15px;margin:0">${esc(amountStr)}</p>
  </div>
  <p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;margin:0 0 20px">You'll receive a reminder 24 hours before the session with the meeting link. See you there.</p>
  <a href="https://www.edusaathiai.in/live/${esc(sessionId)}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:11px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">View your booking →</a>
  <p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">Booking ID: ${esc(bookingId ?? '')}<br>support@edusaathiai.in</p>
</div>`.trim();
        await sendEmail(student.email, `✓ Booked: ${sessionTitle}`, studentHtml);
      }

      // — Faculty notification —
      if (faculty?.email) {
        const facultyHtml = `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
  <p style="color:#4ADE80;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">New Booking</p>
  <h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:20px;line-height:1.3"><strong>${esc(studentName)}</strong> booked your session</h2>
  <div style="background:rgba(74,222,128,0.08);border:0.5px solid rgba(74,222,128,0.25);border-radius:10px;padding:16px;margin:0 0 18px">
    <p style="color:#fff;font-size:15px;font-weight:700;margin:0 0 8px">${esc(sessionTitle)}</p>
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0">Seats: ${seatsBooked}/${totalSeats} · ${esc(amountStr)} paid</p>
  </div>
  <a href="https://www.edusaathiai.in/faculty/live" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:11px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">View all your sessions →</a>
  <p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">support@edusaathiai.in</p>
</div>`.trim();
        await sendEmail(faculty.email, `New booking: ${sessionTitle}`, facultyHtml);
      }
    } catch (emailErr) {
      // Email failure should NOT undo the booking — log and continue
      console.error('verify-live-booking: email pipeline failed', emailErr);
    }

    return new Response(
      JSON.stringify({ bookingId, seatsBooked, totalSeats }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('verify-live-booking fatal', err);
    return new Response(JSON.stringify({ error: 'Could not verify booking. Please contact support with your payment ID.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
