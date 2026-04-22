/**
 * supabase/functions/book-free-session/index.ts
 *
 * Books a seat for a ₹0 / FREE live session.
 * Parallel to verify-live-booking (paid flow), but skips Razorpay
 * entirely because no payment is being collected.
 *
 * Input:
 *   POST {
 *     sessionId: uuid,
 *     bookingType: 'full' | 'single',
 *     lectureIds?: uuid[]
 *   }
 *
 * Server re-reads the session row and REFUSES to book if the faculty
 * has actually set a price > 0 (prevents tampering — a paid session
 * can never be free-booked via this endpoint).
 *
 * Calls the same book_live_session_seat RPC as the paid path, passing
 * NULL for razorpay_order_id / razorpay_payment_id and 0 for amount.
 * Fires the same student + faculty confirmation emails.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { isUUID, isOneOf } from '../_shared/validate.ts';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatIST(isoDate: string): string {
  try {
    return new Date(isoDate).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric', month: 'short', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    }) + ' IST';
  } catch { return isoDate; }
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

    const allowed = await checkRateLimit('book-free-session', user.id, 5, 60);
    if (!allowed) return rateLimitResponse(CORS);

    type Body = { sessionId?: unknown; bookingType?: unknown; lectureIds?: unknown };
    const body = (await req.json()) as Body;
    const sessionId = typeof body.sessionId === 'string' && isUUID(body.sessionId) ? body.sessionId : null;
    const bookingType = isOneOf(body.bookingType, ['full', 'single'] as const) ? body.bookingType : 'full';
    const lectureIds = Array.isArray(body.lectureIds)
      ? body.lectureIds.filter((id): id is string => typeof id === 'string' && isUUID(id))
      : [];

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Server-side verification — the session MUST be free.
    // This prevents a student from calling this endpoint on a paid session.
    const { data: session, error: sessErr } = await admin
      .from('live_sessions')
      .select('price_per_seat_paise, bundle_price_paise, faculty_id, status, title, vertical_id')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: 'session_not_found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (session.status !== 'published') {
      return new Response(JSON.stringify({ error: 'session_not_bookable' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (session.price_per_seat_paise > 0) {
      return new Response(
        JSON.stringify({ error: 'This session is not free. Please use the paid booking flow.' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    if (session.faculty_id === user.id) {
      return new Response(JSON.stringify({ error: 'Faculty cannot book their own session' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Atomic seat reservation — null razorpay fields, 0 amount
    const { data: rpcData, error: rpcError } = await admin.rpc('book_live_session_seat', {
      p_session_id: sessionId,
      p_student_id: user.id,
      p_booking_type: bookingType,
      p_lecture_ids: lectureIds.length > 0 ? lectureIds : null,
      p_amount_paid_paise: 0,
      p_price_type: 'standard',
      p_razorpay_order_id: null,
      p_razorpay_payment_id: null,
    });

    if (rpcError) {
      const msg = rpcError.message ?? '';
      let status = 500;
      let error = 'Booking failed';
      if (msg.includes('sold_out')) { status = 409; error = 'sold_out'; }
      else if (msg.includes('already_booked')) { status = 409; error = 'already_booked'; }
      else if (msg.includes('session_not_bookable')) { status = 400; error = 'session_not_bookable'; }
      else if (msg.includes('session_not_found')) { status = 404; error = 'session_not_found'; }
      console.error('book-free-session RPC failed', msg);
      return new Response(JSON.stringify({ error, detail: msg }), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    const bookingId = rpcRow?.booking_id;
    const seatsBooked = rpcRow?.seats_booked;
    const totalSeats = rpcRow?.total_seats;

    // ── Confirmation emails (fire-and-forget) ──
    try {
      const [{ data: student }, { data: faculty }, { data: firstLec }, { data: vertical }] = await Promise.all([
        admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
        session.faculty_id
          ? admin.from('profiles').select('full_name, email').eq('id', session.faculty_id).single()
          : Promise.resolve({ data: null as { full_name?: string; email?: string } | null }),
        admin.from('live_lectures').select('scheduled_at').eq('session_id', sessionId).order('scheduled_at', { ascending: true }).limit(1).maybeSingle(),
        session.vertical_id
          ? admin.from('verticals').select('name, emoji').eq('id', session.vertical_id).single()
          : Promise.resolve({ data: null as { name?: string; emoji?: string } | null }),
      ]);

      const studentName = student?.full_name ?? 'Student';
      const facultyName = faculty?.full_name ?? 'Faculty';
      const sessionTitle = session.title ?? 'Live Session';
      const saathiEmoji = vertical?.emoji ?? '';
      const scheduled = firstLec?.scheduled_at ? formatIST(firstLec.scheduled_at) : 'Date TBD';

      if (student?.email) {
        await sendEmail(
          student.email,
          `✓ Reserved (Free): ${sessionTitle}`,
          `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#4ADE80;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">Seat Reserved · Free ✓</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 20px;font-size:22px;line-height:1.3">${esc(saathiEmoji)} ${esc(sessionTitle)}</h2>
<p style="color:rgba(255,255,255,0.75);line-height:1.7;margin:0 0 18px">Hi ${esc(studentName)}, your seat is reserved — no payment needed.</p>
<div style="background:rgba(74,222,128,0.08);border:0.5px solid rgba(74,222,128,0.25);border-radius:10px;padding:16px;margin:0 0 20px">
<p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Faculty</p>
<p style="color:#fff;font-size:15px;margin:0 0 12px">${esc(facultyName)}</p>
<p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">First lecture</p>
<p style="color:#fff;font-size:15px;margin:0 0 12px">${esc(scheduled)}</p>
<p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Seat</p>
<p style="color:#fff;font-size:15px;margin:0">Free (₹0)</p>
</div>
<p style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;margin:0 0 20px">You'll get the meeting link 24 hours before the session. See you there.</p>
<a href="https://www.edusaathiai.in/live/${esc(sessionId)}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:11px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">View your booking →</a>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">Booking ID: ${esc(bookingId ?? '')}<br>support@edusaathiai.in</p>
</div>`,
        );
      }

      if (faculty?.email) {
        await sendEmail(
          faculty.email,
          `New free booking: ${sessionTitle}`,
          `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#4ADE80;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">New Booking</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:20px;line-height:1.3"><strong>${esc(studentName)}</strong> reserved a seat</h2>
<div style="background:rgba(74,222,128,0.08);border:0.5px solid rgba(74,222,128,0.25);border-radius:10px;padding:16px;margin:0 0 18px">
<p style="color:#fff;font-size:15px;font-weight:700;margin:0 0 8px">${esc(sessionTitle)}</p>
<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0">Seats: ${seatsBooked}/${totalSeats} · Free session</p>
</div>
<a href="https://www.edusaathiai.in/faculty/live" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:11px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">View all your sessions →</a>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">support@edusaathiai.in</p>
</div>`,
        );
      }
    } catch (emailErr) {
      console.error('book-free-session: email pipeline failed', emailErr);
    }

    return new Response(
      JSON.stringify({ bookingId, seatsBooked, totalSeats }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('book-free-session fatal', err);
    return new Response(JSON.stringify({ error: 'Could not book. Please try again.' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
