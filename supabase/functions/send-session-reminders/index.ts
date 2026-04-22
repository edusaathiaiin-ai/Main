/**
 * supabase/functions/send-session-reminders/index.ts
 *
 * Cron — runs every 30 minutes (scheduled in migration 131).
 *
 * Three passes per run:
 *   Pass 1 — 24h reminder: live_lectures where scheduled_at is
 *             between (now + 23h) and (now + 25h)
 *             → T07 edusaathiai_session_reminder_24h → student (WA)
 *             → T12 edusaathiai_faculty_session_reminder → faculty (WA)
 *
 *   Pass 2 —  1h reminder: live_lectures where scheduled_at is
 *             between (now + 50min) and (now + 70min)
 *             → T08 edusaathiai_session_reminder_1h → student (WA, with meeting link)
 *
 *   Pass 3 — T-10min host nudge: live_lectures where scheduled_at is
 *             between (now + 5min) and (now + 15min)
 *             → email to faculty: "Open your Meet now so students can join"
 *             (email only — no Meta template required, immediate deliverability)
 *
 * Idempotency: uses reminder_sent_24h, reminder_sent_1h, host_reminder_sent
 * columns on live_lectures to avoid duplicates across cron firings.
 *
 * Triggered by pg_cron — no JWT required.
 * Uses SUPABASE_CRON_SECRET for basic auth.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName, fmtDate, fmtTime } from '../_shared/whatsapp.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('SUPABASE_CRON_SECRET') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';

const LOG = 'send-session-reminders';

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sendHostNudgeEmail(params: {
  to: string;
  facultyFirstName: string;
  sessionTitle: string;
  scheduledAt: string;   // ISO
  meetingLink: string;
  studentCount: number;
}): Promise<void> {
  if (!RESEND_API_KEY) return;
  const timeIst = new Date(params.scheduledAt).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
  const html = `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px 32px;border-radius:16px">
<p style="color:#F59E0B;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;font-weight:700">⏰ Starts in 10 minutes</p>
<h2 style="color:#fff;font-family:Georgia,serif;margin:0 0 18px;font-size:22px;line-height:1.3">${escHtml(params.sessionTitle)}</h2>
<p style="color:rgba(255,255,255,0.8);line-height:1.7;margin:0 0 18px">Hi ${escHtml(params.facultyFirstName)}, your session starts at <strong>${escHtml(timeIst)} IST</strong>. ${params.studentCount} student${params.studentCount === 1 ? '' : 's'} ${params.studentCount === 1 ? 'is' : 'are'} waiting.</p>
<p style="color:rgba(255,255,255,0.8);line-height:1.7;margin:0 0 20px"><strong style="color:#F59E0B">Please open your Meet link now</strong> so students can join the moment you go live.</p>
<a href="${escHtml(params.meetingLink)}" style="display:inline-block;background:#C9993A;color:#0B1F3A;padding:13px 30px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700">Open meeting link →</a>
<p style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:28px">This reminder only sends once per session. See you there.<br>support@edusaathiai.in</p>
</div>`;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: 'EdUsaathiAI <support@edusaathiai.in>',
      to: [params.to],
      subject: `⏰ Starts in 10 min: ${params.sessionTitle}`,
      html,
    }),
  }).catch((err) => console.error(`${LOG}: host email send failed`, err));
}

interface LectureRow {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  title: string;
  meeting_link: string | null;
  session_id: string;
  reminder_sent_24h: boolean;
  reminder_sent_1h: boolean;
  // joined
  faculty_id: string;
  faculty_name: string;
  faculty_wa: string | null;
  student_id: string;
  student_name: string;
  student_wa: string | null;
}

Deno.serve(async (req: Request) => {
  // ── Auth ────────────────────────────────────────────────────────────────────
  if (CRON_SECRET) {
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    if (cronHeader !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now   = Date.now();
  let sent24h = 0;
  let sent1h  = 0;
  let errors  = 0;

  // ── Pass 1: 24h window ──────────────────────────────────────────────────────
  const window24hStart = new Date(now + 23 * 3_600_000).toISOString();
  const window24hEnd   = new Date(now + 25 * 3_600_000).toISOString();

  const { data: lectures24h, error: err24h } = await admin
    .from('live_lectures')
    .select(`
      id, scheduled_at, duration_minutes, title, meeting_link, session_id,
      reminder_sent_24h, reminder_sent_1h,
      live_sessions!inner(
        faculty_id,
        faculty:profiles!live_sessions_faculty_id_fkey(full_name, wa_phone)
      ),
      live_bookings!inner(
        student_id,
        student:profiles!live_bookings_student_id_fkey(full_name, wa_phone)
      )
    `)
    .eq('status', 'scheduled')
    .eq('reminder_sent_24h', false)
    .gte('scheduled_at', window24hStart)
    .lte('scheduled_at', window24hEnd);

  if (err24h) {
    console.error(`${LOG}: 24h query failed`, err24h.message);
    errors++;
  }

  for (const row of (lectures24h ?? []) as Record<string, unknown>[]) {
    try {
      const session    = row.live_sessions as Record<string, unknown>;
      const booking    = row.live_bookings as Record<string, unknown>;
      const faculty    = session?.faculty  as Record<string, unknown> | null;
      const student    = booking?.student  as Record<string, unknown> | null;

      const lectureId     = row.id as string;
      const scheduledAt   = row.scheduled_at as string;
      const topic         = row.title as string;
      const facultyId     = session?.faculty_id as string;
      const facultyName   = (faculty?.full_name as string | null) ?? 'Faculty';
      const facultyWa     = (faculty?.wa_phone  as string | null);
      const studentName   = (student?.full_name as string | null) ?? 'Student';
      const studentWa     = (student?.wa_phone  as string | null);
      const sessionIdShort = (row.session_id as string).slice(0, 8);

      const tasks: Promise<unknown>[] = [];

      // T07 — edusaathiai_session_reminder_24h → student
      // {{1}} student firstName, {{2}} topic, {{3}} date, {{4}} time, {{5}} faculty name, {{6}} session ID short
      if (studentWa) {
        tasks.push(
          sendWhatsAppTemplate({
            templateName: 'edusaathiai_session_reminder_24h',
            to: stripPhone(studentWa),
            params: [
              firstName(studentName),
              topic,
              fmtDate(scheduledAt),
              fmtTime(scheduledAt),
              facultyName,
              sessionIdShort,
            ],
            logPrefix: LOG,
          }),
        );
      }

      // T12 — edusaathiai_faculty_session_reminder → faculty (same trigger: 24h)
      // {{1}} faculty firstName, {{2}} student name, {{3}} topic, {{4}} date, {{5}} time, {{6}} session ID short
      if (facultyWa) {
        tasks.push(
          sendWhatsAppTemplate({
            templateName: 'edusaathiai_faculty_session_reminder',
            to: stripPhone(facultyWa),
            params: [
              firstName(facultyName),
              studentName,
              topic,
              fmtDate(scheduledAt),
              fmtTime(scheduledAt),
              sessionIdShort,
            ],
            logPrefix: LOG,
          }),
        );
      }

      await Promise.allSettled(tasks);

      // Mark 24h reminder sent
      await admin
        .from('live_lectures')
        .update({ reminder_sent_24h: true })
        .eq('id', lectureId);

      sent24h++;
    } catch (err) {
      console.error(`${LOG}: 24h reminder failed for lecture ${row.id}`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  // ── Pass 2: 1h window ───────────────────────────────────────────────────────
  const window1hStart = new Date(now + 50 * 60_000).toISOString();
  const window1hEnd   = new Date(now + 70 * 60_000).toISOString();

  const { data: lectures1h, error: err1h } = await admin
    .from('live_lectures')
    .select(`
      id, scheduled_at, duration_minutes, title, meeting_link, session_id,
      reminder_sent_24h, reminder_sent_1h,
      live_sessions!inner(
        faculty_id
      ),
      live_bookings!inner(
        student_id,
        student:profiles!live_bookings_student_id_fkey(full_name, wa_phone)
      )
    `)
    .eq('status', 'scheduled')
    .eq('reminder_sent_1h', false)
    .gte('scheduled_at', window1hStart)
    .lte('scheduled_at', window1hEnd);

  if (err1h) {
    console.error(`${LOG}: 1h query failed`, err1h.message);
    errors++;
  }

  for (const row of (lectures1h ?? []) as Record<string, unknown>[]) {
    try {
      const booking     = row.live_bookings as Record<string, unknown>;
      const student     = booking?.student  as Record<string, unknown> | null;

      const lectureId   = row.id as string;
      const scheduledAt = row.scheduled_at as string;
      const topic       = row.title as string;
      const meetingLink = (row.meeting_link as string | null) ?? 'https://www.edusaathiai.in/faculty/live';
      const studentName = (student?.full_name as string | null) ?? 'Student';
      const studentWa   = (student?.wa_phone  as string | null);

      // For faculty name on 1h reminder, we need a separate lookup since we didn't join it above
      const { data: sessRow } = await admin
        .from('live_sessions')
        .select('faculty_id, faculty:profiles!live_sessions_faculty_id_fkey(full_name)')
        .eq('id', row.session_id as string)
        .single();
      const facultyName = ((sessRow?.faculty as Record<string, unknown> | null)?.full_name as string | null) ?? 'Faculty';

      // T08 — edusaathiai_session_reminder_1h → student
      // {{1}} student firstName, {{2}} topic, {{3}} time, {{4}} faculty name, {{5}} meeting link
      if (studentWa) {
        await sendWhatsAppTemplate({
          templateName: 'edusaathiai_session_reminder_1h',
          to: stripPhone(studentWa),
          params: [
            firstName(studentName),
            topic,
            fmtTime(scheduledAt),
            facultyName,
            meetingLink,
          ],
          logPrefix: LOG,
        });
      }

      // Mark 1h reminder sent
      await admin
        .from('live_lectures')
        .update({ reminder_sent_1h: true })
        .eq('id', lectureId);

      sent1h++;
    } catch (err) {
      console.error(`${LOG}: 1h reminder failed for lecture ${row.id}`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  // ── Pass 3: T-10min host nudge (email only) ────────────────────────────────
  // Sends once per lecture — a polite "open your Meet now" so students aren't
  // staring at an empty room at session start.
  let sentHost = 0;
  const windowHostStart = new Date(now + 5 * 60_000).toISOString();
  const windowHostEnd   = new Date(now + 15 * 60_000).toISOString();

  const { data: lecturesHost, error: errHost } = await admin
    .from('live_lectures')
    .select(`
      id, scheduled_at, title, meeting_link, session_id,
      live_sessions!inner(
        faculty_id, title,
        faculty:profiles!live_sessions_faculty_id_fkey(full_name, email)
      )
    `)
    .eq('status', 'scheduled')
    .eq('host_reminder_sent', false)
    .gte('scheduled_at', windowHostStart)
    .lte('scheduled_at', windowHostEnd);

  if (errHost) {
    console.error(`${LOG}: host query failed`, errHost.message);
    errors++;
  }

  for (const row of (lecturesHost ?? []) as Record<string, unknown>[]) {
    try {
      const session = row.live_sessions as Record<string, unknown>;
      const faculty = session?.faculty as Record<string, unknown> | null;
      const lectureId = row.id as string;
      const scheduledAt = row.scheduled_at as string;
      const sessionTitle = (session?.title as string | null) ?? (row.title as string);
      const meetingLink = (row.meeting_link as string | null) ?? 'https://www.edusaathiai.in/faculty/live';
      const facultyName = (faculty?.full_name as string | null) ?? 'Faculty';
      const facultyEmail = faculty?.email as string | null;

      // Count booked students for this session (for the email body)
      const { count: studentCount } = await admin
        .from('live_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', row.session_id as string)
        .eq('payment_status', 'paid');

      if (facultyEmail) {
        await sendHostNudgeEmail({
          to: facultyEmail,
          facultyFirstName: firstName(facultyName),
          sessionTitle,
          scheduledAt,
          meetingLink,
          studentCount: studentCount ?? 0,
        });
      }

      await admin
        .from('live_lectures')
        .update({ host_reminder_sent: true })
        .eq('id', lectureId);

      sentHost++;
    } catch (err) {
      console.error(`${LOG}: host reminder failed for lecture ${row.id}`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  console.log(`${LOG}: done — 24h sent=${sent24h}, 1h sent=${sent1h}, host sent=${sentHost}, errors=${errors}`);

  return new Response(
    JSON.stringify({ ok: true, sent24h, sent1h, sentHost, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
