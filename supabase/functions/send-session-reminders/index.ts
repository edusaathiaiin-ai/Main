/**
 * supabase/functions/send-session-reminders/index.ts
 *
 * Cron — runs daily at 9:00 AM IST (03:30 UTC).
 *
 * Two passes per run:
 *   Pass 1 — 24h reminder: live_lectures where scheduled_at is
 *             between (now + 23h) and (now + 25h) AND status = 'scheduled'
 *             → T07 edusaathiai_session_reminder_24h → student
 *             → T12 edusaathiai_faculty_session_reminder → faculty
 *
 *   Pass 2 —  1h reminder: live_lectures where scheduled_at is
 *             between (now + 50min) and (now + 70min) AND status = 'scheduled'
 *             → T08 edusaathiai_session_reminder_1h → student
 *
 * Idempotency: uses reminder_sent_24h and reminder_sent_1h columns
 * on live_lectures to avoid re-sending on the same lecture.
 *
 * Triggered by pg_cron — no JWT required.
 * Uses SUPABASE_CRON_SECRET for basic auth.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName, fmtDate, fmtTime } from '../_shared/whatsapp.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('SUPABASE_CRON_SECRET') ?? '';

const LOG = 'send-session-reminders';

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

  console.log(`${LOG}: done — 24h sent=${sent24h}, 1h sent=${sent1h}, errors=${errors}`);

  return new Response(
    JSON.stringify({ ok: true, sent24h, sent1h, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
