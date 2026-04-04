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

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
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

    const VALID_ACTIONS = ['accept', 'decline', 'confirm', 'dispute', 'notify-live-published', 'notify-live-booking'] as const;
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

      await admin.from('faculty_sessions').update({
        status: 'accepted',
        confirmed_slot: (slot && isISODate(slot)) ? slot : null,
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId);

      // Notify student
      const { data: student } = await admin.from('profiles').select('email, full_name').eq('id', session.student_id).single();
      const { data: faculty } = await admin.from('profiles').select('full_name').eq('id', session.faculty_id).single();
      if (student?.email && RESEND_API_KEY) {
        await sendEmail(student.email, `${faculty?.full_name ?? 'Faculty'} accepted your session request`,
          `Your session with ${faculty?.full_name} has been accepted${slot ? ` for ${new Date(slot).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : ''}. You'll receive payment details shortly.`);
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
      await admin.from('faculty_sessions').update({
        status: 'declined',
        faculty_declined_reason: reason ? sanitize(reason) : 'Faculty declined',
        updated_at: new Date().toISOString(),
      }).eq('id', sessionId).eq('faculty_id', user.id);

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
      const safeReason = reason ? sanitize(reason) : 'Session did not happen as expected';
      await admin.from('faculty_sessions').update({
        disputed_by: user.id === (await admin.from('faculty_sessions').select('student_id').eq('id', sessionId).single()).data?.student_id ? 'student' : 'faculty',
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

      const studentName = student?.full_name ?? 'A student';
      const level = soul?.academic_level ?? 'student';
      const institution = student?.institution_name ?? '';
      const city = student?.city ?? '';
      const subjects = Array.isArray(soul?.enrolled_subjects) ? (soul.enrolled_subjects as string[]).slice(0, 3).join(', ') : '';
      const flame = soul?.flame_stage ?? 'spark';

      const body = `<strong>${studentName}</strong> just booked a seat for <strong>${liveSess?.title ?? 'your live session'}</strong>!<br><br>` +
        `They are a <strong>${level}</strong>${institution ? ` at ${institution}` : ''}${city ? `, ${city}` : ''}.<br>` +
        `${subjects ? `Studying: ${subjects}<br>` : ''}` +
        `Flame stage: ${flame}<br><br>` +
        `<em>Your session is filling up!</em>`;

      // Send email to faculty
      const { data: facProfile } = await admin.from('profiles').select('email, full_name').eq('id', facultyId ?? '').single();
      if (facProfile?.email && RESEND_API_KEY) {
        await sendEmail(facProfile.email, `New booking: ${studentName} joined your live session`, body);
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
      subject,
      html: `<div style="font-family:sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px"><p style="color:rgba(255,255,255,0.7);line-height:1.7">${body}</p><br><p style="color:rgba(255,255,255,0.3);font-size:11px">EdUsaathiAI &middot; support@edusaathiai.in</p></div>`,
    }),
  });
}
