/**
 * supabase/functions/session-request/index.ts
 *
 * Faculty Finder session lifecycle handler.
 * Actions: create, accept, decline, confirm, dispute, release-payment
 * JWT protected.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureError } from '../_shared/sentry.ts';
import { isUUID, isNonEmptyString, isISODate, isOneOf, sanitize } from '../_shared/validate.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { selectVideoProvider } from '../_shared/selectVideoProvider.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';


Deno.serve(async (req) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse body ONCE — body stream can only be consumed once
    type RequestBody = {
      action?: unknown;
      sessionId?: unknown;
      slot?: unknown;
      reason?: unknown;
      liveSessionId?: unknown;
      verticalId?: unknown;
      title?: unknown;
      facultyId?: unknown;
    };
    const body = (await req.json()) as RequestBody;

    const VALID_ACTIONS = ['accept', 'decline', 'confirm', 'dispute', 'notify-live-published', 'notify-live-booking', 'notify-faculty-session-created'] as const;
    if (!isOneOf(body.action, VALID_ACTIONS)) {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const action = body.action;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : null;
    const slot = typeof body.slot === 'string' ? body.slot : null;
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null;

    // ── ACCEPT ────────────────────────────────────────────
    if (action === 'accept' && sessionId) {
      if (!isUUID(sessionId)) {
        return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      const { data: session } = await admin.from('faculty_sessions').select('*').eq('id', sessionId).single();
      if (!session || session.faculty_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // Video provider — the matrix splits free vs paid 1:1.
      // - Free (fee_paise === 0): provider locked to google_meet here, since
      //   no payment webhook will fire. Faculty self-manages the link.
      // - Paid (fee_paise > 0): provider is set by razorpay-webhook after
      //   payment lands, and the room is provisioned at Join.
      const acceptProvider = selectVideoProvider(
        'faculty_session', 1, session.fee_paise ?? 0,
      );

      await admin.from('faculty_sessions').update({
        status: 'accepted',
        confirmed_slot: (slot && isISODate(slot)) ? slot : null,
        video_provider: acceptProvider,
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);

      // Notify student
      const { data: student } = await admin.from('profiles').select('email, full_name').eq('id', session.student_id).single();
      const { data: faculty } = await admin.from('profiles').select('full_name').eq('id', session.faculty_id).single();
      if (student?.email && RESEND_API_KEY) {
        const safeFacultyName = sanitize(faculty?.full_name ?? 'Faculty');
        const slotStr = slot ? ` for ${new Date(slot).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : '';
        await sendEmail(student.email, `${safeFacultyName} accepted your session request`,
          `Your session with ${safeFacultyName} has been accepted${slotStr}. You'll receive payment details shortly.`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ── DECLINE ───────────────────────────────────────────
    if (action === 'decline' && sessionId) {
      if (!isUUID(sessionId)) {
        return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Pre-fetch to verify ownership and state before updating
      const { data: decSession } = await admin
        .from('faculty_sessions')
        .select('id, faculty_id, status')
        .eq('id', sessionId)
        .single();

      if (!decSession) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      if (decSession.faculty_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      if (decSession.status !== 'requested') {
        return new Response(JSON.stringify({ error: 'Session cannot be declined in current state' }), {
          status: 409, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      await admin.from('faculty_sessions').update({
        status: 'declined',
        faculty_declined_reason: reason ? sanitize(reason) : 'Faculty declined',
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);

      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ── CONFIRM (student confirms session happened) ──────
    // Moves status → completed, payout_status → pending.
    // Earnings are NOT updated here — admin does that via releaseToFaculty
    // (which calculates TDS, creates the payout record, and emails the faculty).
    if (action === 'confirm' && sessionId) {
      if (!isUUID(sessionId)) {
        return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      await admin.from('faculty_sessions').update({
        student_confirmed_at: new Date().toISOString(),
        status:               'completed',
        payout_status:        'pending',
        updated_at:           new Date().toISOString(),
      }).eq('id', sessionId).eq('student_id', user.id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ── DISPUTE ───────────────────────────────────────────
    if (action === 'dispute' && sessionId) {
      if (!isUUID(sessionId)) {
        return new Response(JSON.stringify({ error: 'Invalid sessionId' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Load session first — verify user is a participant, and status is disputable
      const { data: dispSession } = await admin
        .from('faculty_sessions')
        .select('student_id, faculty_id, status')
        .eq('id', sessionId)
        .single();

      if (!dispSession) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const isParticipant = dispSession.student_id === user.id || dispSession.faculty_id === user.id;
      if (!isParticipant) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const disputableStatuses = ['confirmed', 'completed', 'accepted'];
      if (!disputableStatuses.includes(dispSession.status)) {
        return new Response(JSON.stringify({ error: 'Cannot dispute session in this state' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const disputedBy = dispSession.student_id === user.id ? 'student' : 'faculty';
      const safeReason = reason ? sanitize(reason) : 'Session did not happen as expected';

      await admin.from('faculty_sessions').update({
        disputed_by: disputedBy,
        dispute_reason: safeReason,
        status: 'disputed',
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);

      // Alert admin
      if (RESEND_API_KEY) {
        await sendEmail('jaydeep@edusaathiai.in', `Session dispute: ${sessionId}`, `A session has been disputed. Reason: ${safeReason}`);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ── NOTIFY-LIVE-PUBLISHED (Saathi-filtered) ────────
    if (action === 'notify-live-published') {
      const liveSessionId = typeof body.liveSessionId === 'string' ? body.liveSessionId : sessionId;
      const verticalId = typeof body.verticalId === 'string' ? body.verticalId : null;
      const sessionTitle = typeof body.title === 'string' ? body.title.slice(0, 200) : '';
      if (!verticalId || !isUUID(verticalId)) {
        return new Response(JSON.stringify({ error: 'verticalId required and must be a UUID' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
      }

      // Verify user is the faculty owner of this live session
      if (liveSessionId && isUUID(liveSessionId)) {
        const { data: liveCheck } = await admin
          .from('live_sessions')
          .select('faculty_id')
          .eq('id', liveSessionId)
          .single();
        if (!liveCheck || liveCheck.faculty_id !== user.id) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
      }

      // Get faculty name
      const { data: facProfile } = await admin.from('profiles').select('full_name').eq('id', user.id).single();
      const facultyName = facProfile?.full_name ?? 'A faculty member';

      // Get Saathi name for context
      const { data: vertical } = await admin.from('verticals').select('name, emoji').eq('id', verticalId).single();
      const saathiName = vertical?.name ?? 'your subject';
      const saathiEmoji = vertical?.emoji ?? '';

      // Find ONLY students with this primary_saathi_id — max 100 most active
      const { data: students } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'student')
        .eq('primary_saathi_id', verticalId)
        .eq('is_active', true)
        .not('email', 'is', null)
        .limit(100);

      if (students && students.length > 0 && RESEND_API_KEY) {
        // Batch email — send to all matching students
        const emails = students.map((s: { email: string }) => s.email).filter(Boolean);

        // Send in batches of 50 (Resend limit)
        for (let i = 0; i < emails.length; i += 50) {
          const batch = emails.slice(i, i + 50);
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'EdUsaathiAI <support@edusaathiai.in>',
              to: batch,
              subject: `${saathiEmoji} New live session: ${sessionTitle || 'A new session is available'}`,
              html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
<h2 style="color:#C9993A;font-family:Georgia,serif;margin:0 0 16px">${saathiEmoji} New ${saathiName} Session</h2>
<p style="color:rgba(255,255,255,0.7);line-height:1.7;margin:0 0 16px"><strong>${facultyName}</strong> just announced a live session:</p>
<div style="background:rgba(201,153,58,0.08);border:0.5px solid rgba(201,153,58,0.25);border-radius:10px;padding:16px;margin:0 0 20px">
<p style="color:#fff;font-size:16px;font-weight:700;margin:0 0 6px">${sessionTitle || 'New Live Session'}</p>
<p style="color:rgba(255,255,255,0.5);font-size:13px;margin:0">Seats are limited. Book early.</p>
</div>
<a href="https://edusaathiai.in/live/${liveSessionId}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700">View &amp; Book Seat &rarr;</a>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:24px">You received this because you are a ${saathiName} student on EdUsaathiAI.<br>support@edusaathiai.in</p>
</div>`,
            }),
          });
        }
      }

      return new Response(JSON.stringify({ success: true, notified: students?.length ?? 0 }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ── NOTIFY-FACULTY-SESSION-CREATED ─────────────────
    // Confirmation email to the faculty themselves after they publish.
    // Gives them the shareable link, session summary, and a manage-my-sessions CTA.
    if (action === 'notify-faculty-session-created') {
      const liveSessionId = typeof body.liveSessionId === 'string' ? body.liveSessionId : sessionId;

      if (!liveSessionId || !isUUID(liveSessionId)) {
        return new Response(JSON.stringify({ error: 'liveSessionId required' }), {
          status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      // Verify the caller owns the session
      const { data: sess } = await admin
        .from('live_sessions')
        .select('title, faculty_id, vertical_id, total_seats, price_per_seat_paise, session_format')
        .eq('id', liveSessionId)
        .single();

      if (!sess || sess.faculty_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }

      const [{ data: facProfile }, { data: vertical }, { data: firstLec }] = await Promise.all([
        admin.from('profiles').select('full_name, email').eq('id', user.id).single(),
        admin.from('verticals').select('name, emoji').eq('id', sess.vertical_id).single(),
        admin.from('live_lectures').select('scheduled_at').eq('session_id', liveSessionId).order('scheduled_at', { ascending: true }).limit(1).maybeSingle(),
      ]);

      if (facProfile?.email && RESEND_API_KEY) {
        const facName = facProfile.full_name ?? 'Faculty';
        const saathiName = vertical?.name ?? 'your Saathi';
        const saathiEmoji = vertical?.emoji ?? '';
        const price = `₹${(sess.price_per_seat_paise / 100).toLocaleString('en-IN')}`;
        const scheduled = firstLec?.scheduled_at
          ? new Date(firstLec.scheduled_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) + ' IST'
          : 'Date TBD';

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'EdUsaathiAI <support@edusaathiai.in>',
            to: [facProfile.email],
            subject: `${saathiEmoji} Published: ${sess.title}`,
            html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#C9993A;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">Session Published ✓</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:22px;line-height:1.3">${saathiEmoji} ${sanitize(sess.title)}</h2>
<p style="color:rgba(255,255,255,0.75);line-height:1.7;margin:0 0 18px">Hi ${sanitize(facName)}, your session is live. Matching ${sanitize(saathiName)} students have been notified by email.</p>
<div style="background:rgba(201,153,58,0.1);border:0.5px solid rgba(201,153,58,0.3);border-radius:10px;padding:16px;margin:0 0 20px">
<p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">First lecture</p>
<p style="color:#fff;font-size:15px;margin:0 0 12px">${sanitize(scheduled)}</p>
<p style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin:0 0 6px">Seats / Price</p>
<p style="color:#fff;font-size:15px;margin:0">${sess.total_seats} seats · ${price}/seat</p>
</div>
<a href="https://www.edusaathiai.in/live/${liveSessionId}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:11px 26px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:700;margin-right:8px">View public page →</a>
<a href="https://www.edusaathiai.in/faculty/live" style="display:inline-block;background:transparent;border:0.5px solid rgba(255,255,255,0.3);color:#fff;padding:10px 22px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:600">My sessions</a>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">You'll receive an email each time a student books. Seats fill faster when you share the public link on WhatsApp/LinkedIn.<br>support@edusaathiai.in</p>
</div>`,
          }),
        }).catch((err) => console.error('faculty-created email failed', err));
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    // ── NOTIFY-LIVE-BOOKING ─────────────────────────────
    if (action === 'notify-live-booking') {
      const liveSessionId = typeof body.sessionId === 'string' ? body.sessionId : sessionId;
      const facultyId = typeof body.facultyId === 'string' ? body.facultyId : null;

      // Get student details + soul
      const { data: student } = await admin.from('profiles').select('full_name, city, institution_name').eq('id', user.id).single();
      const { data: liveSess } = await admin.from('live_sessions').select('title, vertical_id').eq('id', liveSessionId ?? sessionId).single();
      const { data: soul } = await admin.from('student_soul')
        .select('academic_level, enrolled_subjects, flame_stage')
        .eq('user_id', user.id)
        .eq('vertical_id', liveSess?.vertical_id ?? '')
        .maybeSingle();

      const studentName = sanitize(student?.full_name ?? 'A student');
      const level = sanitize(soul?.academic_level ?? 'student');
      const institution = sanitize(student?.institution_name ?? '');
      const city = sanitize(student?.city ?? '');
      const subjects = Array.isArray(soul?.enrolled_subjects)
        ? (soul.enrolled_subjects as string[]).slice(0, 3).map(s => sanitize(String(s))).join(', ')
        : '';
      const flame = sanitize(soul?.flame_stage ?? 'spark');
      const sessionTitle = sanitize(liveSess?.title ?? 'your live session');

      const emailBody = `<strong>${studentName}</strong> just booked a seat for <strong>${sessionTitle}</strong>!<br><br>` +
        `They are a <strong>${level}</strong>${institution ? ` at ${institution}` : ''}${city ? `, ${city}` : ''}.<br>` +
        `${subjects ? `Studying: ${subjects}<br>` : ''}` +
        `Flame stage: ${flame}<br><br>` +
        `<em>Your session is filling up!</em>`;

      // Send email to faculty
      const { data: facProfile } = await admin.from('profiles').select('email, full_name').eq('id', facultyId ?? '').single();
      if (facProfile?.email && RESEND_API_KEY) {
        await sendEmail(facProfile.email, `New booking: ${studentName} joined your live session`, emailBody);
      }

      return new Response(JSON.stringify({ success: true }), { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });

  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), { tags: { function: 'session-request' } });
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
  }
});

async function sendEmail(to: string, subject: string, body: string) {
  if (!RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'EdUsaathiAI <support@edusaathiai.in>',
      to: [to],
      reply_to: 'support@edusaathiai.in',
      subject,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px"><p style="color:rgba(255,255,255,0.7);line-height:1.7">${body}</p><br><p style="color:rgba(255,255,255,0.3);font-size:11px">EdUsaathiAI &middot; support@edusaathiai.in</p></div>`,
    }),
  });
}
