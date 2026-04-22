/**
 * supabase/functions/complete-live-sessions/index.ts
 *
 * Cron — runs every 15 minutes (scheduled by migration 132 cron block, see below).
 *
 * Two passes per run:
 *
 *   Pass 1 — auto-complete live_lectures whose scheduled end has passed
 *            (scheduled_at + duration_minutes + 10min grace).
 *            Sets status='completed', completed_at=now().
 *
 *   Pass 2 — for each live_session whose lectures are ALL completed/cancelled
 *            and whose status is still 'published', mark the session
 *            status='completed' and completed_at=now(), then email the
 *            faculty: "Session is over — please upload notes for students."
 *
 * Idempotency:
 *   - Lecture pass uses status filter (only flips scheduled/live → completed).
 *   - Session pass uses status='published' filter, so it transitions only once.
 *   - Faculty notes-nudge email piggybacks the session transition (also one-shot).
 *
 * Triggered by pg_cron — Authorization: Bearer service_role_key gate.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';

const LOG = 'complete-live-sessions';
const SITE_URL = 'https://www.edusaathiai.in';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function firstName(s: string): string {
  return (s ?? '').trim().split(/\s+/)[0] || 'Faculty';
}

async function sendNotesNudgeEmail(params: {
  to: string;
  facultyFirstName: string;
  sessionTitle: string;
  sessionId: string;
  studentCount: number;
}): Promise<void> {
  if (!RESEND_API_KEY) return;
  const uploadUrl = `${SITE_URL}/faculty/live/${params.sessionId}/notes`;
  const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#C9993A;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">Session complete</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:22px;line-height:1.3">${escHtml(params.sessionTitle)}</h2>
<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 16px">Hi ${escHtml(params.facultyFirstName)}, your session has wrapped up. ${params.studentCount} student${params.studentCount === 1 ? '' : 's'} attended.</p>
<p style="color:rgba(255,255,255,0.85);line-height:1.7;margin:0 0 22px">Now share your <strong>session notes</strong> — a PDF, slide link, or written summary. Students remember the teacher who follows up.</p>
<a href="${escHtml(uploadUrl)}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:13px 30px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">Upload notes →</a>
<p style="color:rgba(255,255,255,0.55);font-size:12px;line-height:1.6;margin-top:22px">After notes are shared, your earnings become eligible for release.<br>You can also release directly from the Faculty Earnings page.</p>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">support@edusaathiai.in</p>
</div>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'EdUsaathiAI <support@edusaathiai.in>',
      to: [params.to],
      subject: `Session complete — please share notes: ${params.sessionTitle}`,
      html,
    }),
  }).catch((err) => console.error(`${LOG}: notes nudge email failed`, err));
}

Deno.serve(async (_req: Request) => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  let lecturesCompleted = 0;
  let sessionsCompleted = 0;
  let nudgeEmailsSent = 0;
  let errors = 0;
  const errorDetails: string[] = [];

  // ── Pass 1: auto-complete lectures whose scheduled end + 10min grace passed
  // We don't have "scheduled_at + interval(duration_minutes)" in PostgREST
  // directly, so fetch a slightly wider candidate set and filter in JS.
  // Anything scheduled_at < now() - 10min is a candidate; refine by duration.
  try {
    const cutoffIso = new Date(Date.now() - 10 * 60_000).toISOString();
    const { data: candidates, error: errLec } = await admin
      .from('live_lectures')
      .select('id, scheduled_at, duration_minutes, status, session_id')
      .in('status', ['scheduled', 'live'])
      .lt('scheduled_at', cutoffIso);

    if (errLec) {
      errors++;
      errorDetails.push('lecture-query: ' + errLec.message);
    } else {
      const now = Date.now();
      const toComplete: string[] = [];
      for (const row of (candidates ?? []) as Array<{
        id: string;
        scheduled_at: string;
        duration_minutes: number | null;
      }>) {
        const dur = (row.duration_minutes ?? 60) * 60_000;
        const grace = 10 * 60_000;
        const endsAt = new Date(row.scheduled_at).getTime() + dur + grace;
        if (endsAt <= now) toComplete.push(row.id);
      }

      if (toComplete.length > 0) {
        const { error: updErr } = await admin
          .from('live_lectures')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .in('id', toComplete);
        if (updErr) {
          errors++;
          errorDetails.push('lecture-update: ' + updErr.message);
        } else {
          lecturesCompleted = toComplete.length;
        }
      }
    }
  } catch (err) {
    errors++;
    errorDetails.push('pass1: ' + (err instanceof Error ? err.message : String(err)));
  }

  // ── Pass 2: complete sessions whose lectures are all done; nudge faculty.
  try {
    // Find published sessions that have at least one lecture but no
    // remaining incomplete lectures.
    const { data: pubSessions, error: errSess } = await admin
      .from('live_sessions')
      .select('id, faculty_id, title')
      .eq('status', 'published');

    if (errSess) {
      errors++;
      errorDetails.push('session-query: ' + errSess.message);
    } else {
      for (const s of (pubSessions ?? []) as Array<{
        id: string; faculty_id: string; title: string;
      }>) {
        try {
          const { count: incomplete, error: cErr } = await admin
            .from('live_lectures')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', s.id)
            .not('status', 'in', '(completed,cancelled)');

          if (cErr) {
            errors++;
            errorDetails.push(`incomplete-count(${s.id}): ${cErr.message}`);
            continue;
          }

          // Skip if there are still incomplete lectures (or no lectures at all).
          if ((incomplete ?? 0) > 0) continue;

          const { count: totalLectures } = await admin
            .from('live_lectures')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', s.id);
          if ((totalLectures ?? 0) === 0) continue;

          // Transition session to completed.
          const { error: updSessErr } = await admin
            .from('live_sessions')
            .update({ status: 'completed', completed_at: new Date().toISOString() })
            .eq('id', s.id)
            .eq('status', 'published');  // race-safe
          if (updSessErr) {
            errors++;
            errorDetails.push(`session-update(${s.id}): ${updSessErr.message}`);
            continue;
          }
          sessionsCompleted++;

          // Lookup faculty + paid student count for the nudge email.
          const { data: facProfile } = await admin
            .from('profiles')
            .select('full_name, email')
            .eq('id', s.faculty_id)
            .maybeSingle();

          const { count: paidCount } = await admin
            .from('live_bookings')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', s.id)
            .eq('payment_status', 'paid');

          if (facProfile?.email) {
            await sendNotesNudgeEmail({
              to: facProfile.email as string,
              facultyFirstName: firstName(facProfile.full_name as string ?? 'Faculty'),
              sessionTitle: s.title,
              sessionId: s.id,
              studentCount: paidCount ?? 0,
            });
            nudgeEmailsSent++;
          }
        } catch (innerErr) {
          errors++;
          errorDetails.push(`session-loop(${s.id}): ${innerErr instanceof Error ? innerErr.message : String(innerErr)}`);
        }
      }
    }
  } catch (err) {
    errors++;
    errorDetails.push('pass2: ' + (err instanceof Error ? err.message : String(err)));
  }

  return new Response(
    JSON.stringify({
      ok: true, v: 'r1',
      lecturesCompleted, sessionsCompleted, nudgeEmailsSent,
      errors, errorDetails,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
