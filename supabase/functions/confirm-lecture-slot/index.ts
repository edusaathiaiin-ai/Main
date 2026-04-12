/**
 * supabase/functions/confirm-lecture-slot/index.ts
 *
 * Called by the student when they pick a slot from a faculty proposal.
 * Runs under service_role because students cannot INSERT live_sessions
 * (RLS requires faculty_id = auth.uid() on that table).
 *
 * Flow:
 *  1. Verify JWT → student identity
 *  2. Load lecture_request → confirm student_id matches, status='accepted'
 *  3. Validate the chosen slotStart is one of the proposed_slots
 *  4. INSERT live_sessions (1:1, total_seats=1)
 *  5. INSERT live_lectures (lecture_number=1, scheduled_at=slot)
 *  6. INSERT live_bookings (payment_status='paid' — Razorpay TBD)
 *  7. UPDATE live_sessions.seats_booked = 1
 *  8. UPDATE lecture_requests: student_confirmed_slot, linked_session_id, status='session_created'
 *  9. Notify faculty (email + WhatsApp, fire-and-forget)
 * 10. Return { sessionId }
 *
 * Body: { requestId: string, slotStart: string }   ← ISO datetime of chosen slot
 * Auth: JWT (student's access token)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { captureError } from '../_shared/sentry.ts';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY         = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? '';
const WA_TOKEN                  = Deno.env.get('WHATSAPP_TOKEN') ?? '';
const PHONE_NUMBER_ID           = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return s.replace(/[<>"'`]/g, '');
}

function fmtSlotIST(start: string, durationMin: number): string {
  const d   = new Date(start);
  const end = new Date(d.getTime() + durationMin * 60_000);
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
  });
  const timeStart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
  const timeEnd = end.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
  return `${date}, ${timeStart} – ${timeEnd} IST`;
}

function paise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN')}`;
}

// ─── Faculty notification ─────────────────────────────────────────────────────

async function notifyFaculty(
  facultyEmail: string | null,
  facultyWa:   string | null,
  facultyName: string,
  studentName: string,
  subject:     string,
  slotLabel:   string,
  sessionId:   string,
): Promise<void> {
  const tasks: Promise<void>[] = [];

  if (RESEND_API_KEY && facultyEmail) {
    const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:540px;margin:0 auto;
  background:#0B1F3A;color:#fff;border-radius:16px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#0B1F3A,#1A3A5C);
    padding:28px 32px 20px;border-bottom:1px solid rgba(74,222,128,0.25)">
    <div style="display:inline-block;background:#4ADE80;color:#060F1D;
      font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
      padding:4px 12px;border-radius:100px;margin-bottom:12px">
      Slot Confirmed
    </div>
    <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;line-height:1.3">
      ${sanitize(studentName)} confirmed their slot! 🎙️
    </h1>
    <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.45)">
      ${sanitize(subject)}
    </p>
  </div>
  <div style="padding:24px 32px">
    <div style="background:rgba(74,222,128,0.06);border:0.5px solid rgba(74,222,128,0.2);
      border-radius:12px;padding:14px 18px;margin-bottom:20px">
      <p style="font-size:11px;font-weight:700;color:#4ADE80;
        text-transform:uppercase;letter-spacing:0.06em;margin:0 0 4px">
        Confirmed slot
      </p>
      <p style="font-size:15px;font-weight:700;color:#fff;margin:0">
        📅 ${sanitize(slotLabel)}
      </p>
    </div>
    <p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 20px">
      The student's seat is reserved. Share the meeting link from your sessions
      dashboard at least 30 minutes before the session starts.
    </p>
    <a href="https://www.edusaathiai.in/faculty/live"
       style="display:block;text-align:center;background:#C9993A;color:#060F1D;
       padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px;
       text-decoration:none">
      Go to Sessions Dashboard →
    </a>
  </div>
  <div style="background:rgba(0,0,0,0.2);padding:12px 32px;
    border-top:1px solid rgba(255,255,255,0.06)">
    <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;text-align:center">
      EdUsaathiAI · <a href="mailto:support@edusaathiai.in"
        style="color:#C9993A;text-decoration:none">support@edusaathiai.in</a>
    </p>
  </div>
</div>`;

    tasks.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:     'EdUsaathiAI <support@edusaathiai.in>',
          to:       [facultyEmail],
          reply_to: 'support@edusaathiai.in',
          subject:  `✓ ${studentName} confirmed their slot — "${subject}"`,
          html,
        }),
      }).then(() => undefined),
    );
  }

  if (WA_TOKEN && PHONE_NUMBER_ID && facultyWa) {
    const firstName = facultyName.split(' ')[0];
    tasks.push(
      fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${WA_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: facultyWa,
          type: 'text',
          text: {
            body: `✦ *EdUsaathiAI* — Slot Confirmed!\n\nHi ${firstName}! *${studentName}* has confirmed their slot for *${subject}*.\n\n📅 ${slotLabel}\n\nPlease share your meeting link before the session: https://www.edusaathiai.in/faculty/live`,
            preview_url: false,
          },
        }),
      }).then(() => undefined),
    );
  }

  if (tasks.length > 0) await Promise.allSettled(tasks);
}

// ─── Student WhatsApp: session booked ────────────────────────────────────────

async function notifyStudentWhatsApp(
  waPhone:      string,
  firstName:    string,
  sessionTopic: string,
  facultyName:  string,
  slotStart:    string,
  sessionId:    string,
): Promise<void> {
  if (!WA_TOKEN || !PHONE_NUMBER_ID || !waPhone) return;

  const slotDt = new Date(slotStart);
  const sessionDate = slotDt.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  }); // e.g. "14 April 2026"
  const sessionTime = slotDt.toLocaleTimeString('en-IN', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  }); // e.g. "5:00 PM"
  const sessionIdShort = sessionId.slice(0, 8);

  try {
    const res = await fetch(
      `https://graph.facebook.com/v25.0/${PHONE_NUMBER_ID}/messages`,
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
            name: 'edusaathiai_session_booked',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: firstName },
                  { type: 'text', text: sessionTopic },
                  { type: 'text', text: facultyName },
                  { type: 'text', text: sessionDate },
                  { type: 'text', text: sessionTime },
                  { type: 'text', text: sessionIdShort },
                ],
              },
            ],
          },
        }),
      },
    );
    const body = await res.text();
    console.log(`confirm-lecture-slot: WA session_booked sent to ${waPhone}, status=${res.status}, body=${body}`);
  } catch (err) {
    console.error('confirm-lecture-slot: WA session_booked failed', err instanceof Error ? err.message : err);
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST')
    return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    // ── 1. Verify JWT ─────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Parse body ─────────────────────────────────────────────────────────
    const body = await req.json() as { requestId?: unknown; slotStart?: unknown };
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : null;
    const slotStart = typeof body.slotStart === 'string' ? body.slotStart.trim() : null;

    if (!requestId || !slotStart) {
      return new Response(JSON.stringify({ error: 'requestId and slotStart required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Validate slotStart is a parseable date
    const slotDate = new Date(slotStart);
    if (isNaN(slotDate.getTime())) {
      return new Response(JSON.stringify({ error: 'Invalid slotStart date' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── 3. Load lecture_request ───────────────────────────────────────────────
    const { data: lr, error: lrErr } = await admin
      .from('lecture_requests')
      .select(`
        id, student_id, faculty_id, vertical_id, subject,
        proposed_slots, proposed_fee_paise, proposed_duration,
        status, linked_session_id
      `)
      .eq('id', requestId)
      .single();

    if (lrErr || !lr) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 4. Verify ownership + state ───────────────────────────────────────────
    if (lr.student_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    if (lr.status === 'session_created' && lr.linked_session_id) {
      // Already confirmed — return existing session ID (idempotent)
      return new Response(
        JSON.stringify({ sessionId: lr.linked_session_id, alreadyConfirmed: true }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    if (lr.status !== 'accepted') {
      return new Response(JSON.stringify({ error: 'Request is not in a confirmable state' }), {
        status: 409, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 5. Validate chosen slot is one of the proposed slots ──────────────────
    type ProposedSlot = { start: string; end: string; label?: string };
    const proposedSlots = (lr.proposed_slots as ProposedSlot[] | null) ?? [];
    const chosenSlot = proposedSlots.find(
      (s) => new Date(s.start).getTime() === slotDate.getTime(),
    );

    if (!chosenSlot) {
      return new Response(JSON.stringify({ error: 'Chosen slot is not in the proposal' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const feePaise    = (lr.proposed_fee_paise as number | null) ?? 0;
    const durationMin = (lr.proposed_duration  as number | null) ?? 60;
    const subject     = lr.subject as string;
    const facultyId   = lr.faculty_id as string;

    // ── 6. Resolve vertical_id from faculty's primary_saathi_id ──────────────
    // live_sessions.vertical_id is NOT NULL — look it up from the faculty profile
    const { data: facultyRow } = await admin
      .from('profiles')
      .select('primary_saathi_id')
      .eq('id', facultyId)
      .single();

    const verticalId = (facultyRow?.primary_saathi_id as string | null) ?? null;
    if (!verticalId) {
      return new Response(JSON.stringify({ error: 'Faculty has no primary Saathi configured' }), {
        status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── 7. INSERT live_sessions ───────────────────────────────────────────────
    const { data: newSession, error: sessErr } = await admin
      .from('live_sessions')
      .insert({
        faculty_id:            facultyId,
        vertical_id:           verticalId,
        title:                 subject,
        description:           `Private 1:1 session — ${subject}`,
        session_format:        'single',
        price_per_seat_paise:  feePaise,
        total_seats:           1,
        seats_booked:          0,
        status:                'published',
      })
      .select('id')
      .single();

    if (sessErr || !newSession) {
      throw new Error(`Failed to create session: ${sessErr?.message}`);
    }

    const sessionId = (newSession as { id: string }).id;

    // ── 7. INSERT live_lectures ───────────────────────────────────────────────
    await admin.from('live_lectures').insert({
      session_id:       sessionId,
      lecture_number:   1,
      title:            subject,
      scheduled_at:     chosenSlot.start,
      duration_minutes: durationMin,
      status:           'scheduled',
    });

    // ── 8. INSERT live_bookings (payment_status = 'paid' — simplified) ────────
    await admin.from('live_bookings').insert({
      session_id:         sessionId,
      student_id:         user.id,
      booking_type:       'full',
      amount_paid_paise:  feePaise,
      price_type:         'standard',
      payment_status:     'paid',
      paid_at:            new Date().toISOString(),
    });

    // ── 9. UPDATE live_sessions.seats_booked ─────────────────────────────────
    await admin
      .from('live_sessions')
      .update({ seats_booked: 1 })
      .eq('id', sessionId);

    // ── 10. UPDATE lecture_requests ───────────────────────────────────────────
    await admin
      .from('lecture_requests')
      .update({
        student_confirmed_slot: chosenSlot.start,
        linked_session_id:      sessionId,
        status:                 'session_created',
        faculty_responded_at:   new Date().toISOString(),
      })
      .eq('id', requestId);

    // ── 11. Notify faculty (fire-and-forget) ──────────────────────────────────
    const [{ data: facultyProfile }, { data: studentProfile }] = await Promise.all([
      admin.from('profiles').select('full_name, email, wa_phone').eq('id', facultyId).single(),
      admin.from('profiles').select('full_name, wa_phone').eq('id', user.id).single(),
    ]);

    const facultyName  = (facultyProfile?.full_name  as string | null) ?? 'Professor';
    const studentName  = (studentProfile?.full_name   as string | null) ?? 'Student';
    const facultyEmail = (facultyProfile?.email       as string | null);
    const facultyWa    = (facultyProfile?.wa_phone    as string | null);
    const studentWa    = ((studentProfile?.wa_phone   as string | null) ?? '').replace(/^\+/, '');
    const studentFirst = studentName.split(' ')[0];
    const slotLabel    = chosenSlot.label ?? fmtSlotIST(chosenSlot.start, durationMin);

    void notifyFaculty(
      facultyEmail, facultyWa, facultyName,
      studentName, subject, slotLabel, sessionId,
    );

    if (studentWa) {
      void notifyStudentWhatsApp(
        studentWa, studentFirst, subject,
        facultyName, chosenSlot.start, sessionId,
      );
    }

    return new Response(
      JSON.stringify({ success: true, sessionId }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { function: 'confirm-lecture-slot' },
    });
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
