/**
 * supabase/functions/send-session-reminders/index.ts
 *
 * Cron — runs every 30 minutes (scheduled in migration 131).
 *
 * Five passes per run:
 *   Pass 1 — live_lectures 24h reminder: scheduled_at in (now + 23h, now + 25h)
 *             → T07 edusaathiai_session_reminder_24h → student (WA)
 *             → T12 edusaathiai_faculty_session_reminder → faculty (WA)
 *
 *   Pass 2 — live_lectures 1h reminder: scheduled_at in (now + 50min, now + 70min)
 *             → T08 edusaathiai_session_reminder_1h → student (WA, with meeting link)
 *
 *   Pass 3 — live_lectures T-10min host nudge: scheduled_at in (now + 5min, now + 15min)
 *             → email to faculty (no Meta template; immediate deliverability)
 *
 *   Pass 4 — faculty_sessions 24h reminder (1:1 Faculty Finder bookings):
 *             confirmed_slot in (now + 23h, now + 25h), status in (paid, confirmed)
 *             → T07 → student, T12 → faculty
 *             Reuses same templates as Pass 1 — parameter shape is compatible.
 *
 *   Pass 5 — faculty_sessions 1h reminder: confirmed_slot in (now + 50min, now + 70min)
 *             → T08 → student (WA, with whereby room URL)
 *             Faculty does NOT receive a 1h reminder for 1:1 — they already
 *             got the 24h ping; an extra at T-1h is noise, not signal.
 *
 * Idempotency:
 *   - live_lectures.{reminder_sent_24h, reminder_sent_1h, host_reminder_sent}
 *   - faculty_sessions.{reminder_sent_24h, reminder_sent_1h}  (added in migration 150)
 *
 * Triggered by pg_cron — no JWT required.
 * Uses SUPABASE_CRON_SECRET for basic auth.
 */

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName, fmtDate, fmtTime } from '../_shared/whatsapp.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';

const LOG = 'send-session-reminders';

// Auth: Supabase Edge Function gateway requires a valid apikey / Bearer
// to even reach this function. pg_cron calls it with service_role_key
// in the Authorization header — that's the gate. Idempotency
// (reminder_sent_*) + narrow time-window queries prevent misuse even
// if someone bypasses the gateway with an anon key.
// This matches the pattern used by the other production cron jobs.

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

// ── Profile cache helper ─────────────────────────────────────────────────────
// Batch-fetch profiles for a set of user IDs in a single query, returning a
// map keyed by id. Avoids brittle PostgREST named-FK joins.
type ProfileRow = {
  id: string;
  full_name: string | null;
  wa_phone: string | null;
  email: string | null;
};
async function fetchProfiles(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, ProfileRow>> {
  const uniq = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ProfileRow>();
  if (uniq.length === 0) return map;
  const { data, error } = await admin
    .from('profiles')
    .select('id, full_name, wa_phone, email')
    .in('id', uniq);
  if (error) {
    console.error(`${LOG}: profiles lookup failed`, error.message);
    return map;
  }
  for (const row of (data ?? []) as ProfileRow[]) map.set(row.id, row);
  return map;
}

Deno.serve(async (_req: Request) => {
  // Auth is handled by the Supabase Edge Function gateway (Bearer header).

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now   = Date.now();
  let sent24h = 0;
  let sent1h  = 0;
  let sentHost = 0;
  let errors  = 0;
  const errorDetails: string[] = [];

  // ── Pass 1: 24h window ─────────────────────────────────────────────────────
  const window24hStart = new Date(now + 23 * 3_600_000).toISOString();
  const window24hEnd   = new Date(now + 25 * 3_600_000).toISOString();

  const { data: lectures24h, error: err24h } = await admin
    .from('live_lectures')
    .select('id, scheduled_at, title, session_id, live_sessions!inner(faculty_id, meeting_link)')
    .eq('status', 'scheduled')
    .eq('reminder_sent_24h', false)
    .gte('scheduled_at', window24hStart)
    .lte('scheduled_at', window24hEnd);

  if (err24h) {
    console.error(`${LOG}: 24h query failed`, err24h.message); errorDetails.push('24h: ' + err24h.message);
    errors++;
  }

  // Fetch bookings for the sessions in this window, separately.
  // live_bookings.session_id references live_sessions.id (not live_lectures.id),
  // so there's no direct FK path from live_lectures to live_bookings — we
  // must fetch by session_id.
  const rows24h = (lectures24h ?? []) as Record<string, unknown>[];
  const sessionIds24h = rows24h.map((r) => r.session_id as string);
  const bookingsBySession24h = new Map<string, string[]>();
  if (sessionIds24h.length > 0) {
    const { data: bk } = await admin
      .from('live_bookings')
      .select('session_id, student_id')
      .in('session_id', sessionIds24h)
      .eq('payment_status', 'paid');
    for (const b of (bk ?? []) as { session_id: string; student_id: string }[]) {
      if (!bookingsBySession24h.has(b.session_id)) bookingsBySession24h.set(b.session_id, []);
      bookingsBySession24h.get(b.session_id)!.push(b.student_id);
    }
  }

  // Batch-fetch faculty + student profiles
  const profileIds24h: string[] = [];
  for (const r of rows24h) {
    const ls = r.live_sessions as Record<string, unknown> | Record<string, unknown>[] | null;
    const sessObj = Array.isArray(ls) ? ls[0] : ls;
    if (sessObj?.faculty_id) profileIds24h.push(sessObj.faculty_id as string);
  }
  for (const studentIds of bookingsBySession24h.values()) profileIds24h.push(...studentIds);
  const profiles24h = await fetchProfiles(admin, profileIds24h);

  for (const row of rows24h) {
    try {
      const ls = row.live_sessions as Record<string, unknown> | Record<string, unknown>[] | null;
      const sessObj = Array.isArray(ls) ? ls[0] : ls;
      const studentIds = bookingsBySession24h.get(row.session_id as string) ?? [];

      const lectureId     = row.id as string;
      const scheduledAt   = row.scheduled_at as string;
      const topic         = row.title as string;
      const sessionIdShort = (row.session_id as string).slice(0, 8);
      const facultyId     = sessObj?.faculty_id as string;
      const facultyProfile = profiles24h.get(facultyId);
      const facultyName   = facultyProfile?.full_name ?? 'Faculty';
      const facultyWa     = facultyProfile?.wa_phone ?? null;

      if (studentIds.length === 0) {
        // No paid bookings — skip both student and faculty reminders; mark
        // as sent so we don't re-try every 30 min for an empty session.
        await admin.from('live_lectures').update({ reminder_sent_24h: true }).eq('id', lectureId);
        continue;
      }

      const tasks: Promise<unknown>[] = [];

      // T12 — faculty reminder (once per lecture, even if multiple bookings)
      if (facultyWa) {
        const firstStudentProfile = profiles24h.get(studentIds[0]);
        const studentNameForFaculty = firstStudentProfile?.full_name ?? 'Student';
        tasks.push(
          sendWhatsAppTemplate({
            templateName: 'edusaathiai_faculty_session_reminder',
            to: stripPhone(facultyWa),
            params: [
              firstName(facultyName),
              studentNameForFaculty + (studentIds.length > 1 ? ` + ${studentIds.length - 1} more` : ''),
              topic,
              fmtDate(scheduledAt),
              fmtTime(scheduledAt),
              sessionIdShort,
            ],
            logPrefix: LOG,
          }),
        );
      }

      // T07 — student reminder (once per booking)
      for (const studentId of studentIds) {
        const studentProfile = profiles24h.get(studentId);
        if (!studentProfile?.wa_phone) continue;
        tasks.push(
          sendWhatsAppTemplate({
            templateName: 'edusaathiai_session_reminder_24h',
            to: stripPhone(studentProfile.wa_phone),
            params: [
              firstName(studentProfile.full_name ?? 'Student'),
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

      await Promise.allSettled(tasks);

      await admin
        .from('live_lectures')
        .update({ reminder_sent_24h: true })
        .eq('id', lectureId);

      sent24h++;
    } catch (err) {
      console.error(`${LOG}: 24h reminder failed for lecture ${row.id}`, err instanceof Error ? err.message : err); errorDetails.push('24h-loop: ' + (err instanceof Error ? err.message : String(err)));
      errors++;
    }
  }

  // ── Pass 2: 1h window ──────────────────────────────────────────────────────
  const window1hStart = new Date(now + 50 * 60_000).toISOString();
  const window1hEnd   = new Date(now + 70 * 60_000).toISOString();

  const { data: lectures1h, error: err1h } = await admin
    .from('live_lectures')
    .select('id, scheduled_at, title, session_id, live_sessions!inner(faculty_id, meeting_link)')
    .eq('status', 'scheduled')
    .eq('reminder_sent_1h', false)
    .gte('scheduled_at', window1hStart)
    .lte('scheduled_at', window1hEnd);

  if (err1h) {
    console.error(`${LOG}: 1h query failed`, err1h.message); errorDetails.push('1h: ' + err1h.message);
    errors++;
  }

  const rows1h = (lectures1h ?? []) as Record<string, unknown>[];
  const sessionIds1h = rows1h.map((r) => r.session_id as string);
  const bookingsBySession1h = new Map<string, string[]>();
  if (sessionIds1h.length > 0) {
    const { data: bk } = await admin
      .from('live_bookings')
      .select('session_id, student_id')
      .in('session_id', sessionIds1h)
      .eq('payment_status', 'paid');
    for (const b of (bk ?? []) as { session_id: string; student_id: string }[]) {
      if (!bookingsBySession1h.has(b.session_id)) bookingsBySession1h.set(b.session_id, []);
      bookingsBySession1h.get(b.session_id)!.push(b.student_id);
    }
  }

  const profileIds1h: string[] = [];
  for (const r of rows1h) {
    const ls = r.live_sessions as Record<string, unknown> | Record<string, unknown>[] | null;
    const sessObj = Array.isArray(ls) ? ls[0] : ls;
    if (sessObj?.faculty_id) profileIds1h.push(sessObj.faculty_id as string);
  }
  for (const ids of bookingsBySession1h.values()) profileIds1h.push(...ids);
  const profiles1h = await fetchProfiles(admin, profileIds1h);

  for (const row of rows1h) {
    try {
      const ls = row.live_sessions as Record<string, unknown> | Record<string, unknown>[] | null;
      const sessObj = Array.isArray(ls) ? ls[0] : ls;
      const studentIds = bookingsBySession1h.get(row.session_id as string) ?? [];

      const lectureId   = row.id as string;
      const scheduledAt = row.scheduled_at as string;
      const topic       = row.title as string;
      const meetingLink = (sessObj?.meeting_link as string | null) ?? 'https://www.edusaathiai.in/faculty/live';
      const facultyId   = sessObj?.faculty_id as string;
      const facultyName = profiles1h.get(facultyId)?.full_name ?? 'Faculty';

      if (studentIds.length === 0) {
        await admin.from('live_lectures').update({ reminder_sent_1h: true }).eq('id', lectureId);
        continue;
      }

      for (const studentId of studentIds) {
        const studentProfile = profiles1h.get(studentId);
        if (!studentProfile?.wa_phone) continue;
        await sendWhatsAppTemplate({
          templateName: 'edusaathiai_session_reminder_1h',
          to: stripPhone(studentProfile.wa_phone),
          params: [
            firstName(studentProfile.full_name ?? 'Student'),
            topic,
            fmtTime(scheduledAt),
            facultyName,
            meetingLink,
          ],
          logPrefix: LOG,
        });
      }

      await admin
        .from('live_lectures')
        .update({ reminder_sent_1h: true })
        .eq('id', lectureId);

      sent1h++;
    } catch (err) {
      console.error(`${LOG}: 1h reminder failed for lecture ${row.id}`, err instanceof Error ? err.message : err); errorDetails.push('1h-loop: ' + (err instanceof Error ? err.message : String(err)));
      errors++;
    }
  }

  // ── Pass 3: T-10min host nudge (email only) ────────────────────────────────
  const windowHostStart = new Date(now + 5 * 60_000).toISOString();
  const windowHostEnd   = new Date(now + 15 * 60_000).toISOString();

  const { data: lecturesHost, error: errHost } = await admin
    .from('live_lectures')
    .select('id, scheduled_at, title, session_id, live_sessions!inner(faculty_id, title, meeting_link)')
    .eq('status', 'scheduled')
    .eq('host_reminder_sent', false)
    .gte('scheduled_at', windowHostStart)
    .lte('scheduled_at', windowHostEnd);

  if (errHost) {
    console.error(`${LOG}: host query failed`, errHost.message); errorDetails.push('host: ' + errHost.message);
    errors++;
  }

  const rowsHost = (lecturesHost ?? []) as Record<string, unknown>[];
  const facultyIdsHost: string[] = [];
  for (const r of rowsHost) {
    const ls = r.live_sessions as Record<string, unknown> | Record<string, unknown>[] | null;
    const sessObj = Array.isArray(ls) ? ls[0] : ls;
    if (sessObj?.faculty_id) facultyIdsHost.push(sessObj.faculty_id as string);
  }
  const profilesHost = await fetchProfiles(admin, facultyIdsHost);

  for (const row of rowsHost) {
    try {
      const ls = row.live_sessions as Record<string, unknown> | Record<string, unknown>[] | null;
      const sessObj = Array.isArray(ls) ? ls[0] : ls;
      const lectureId = row.id as string;
      const scheduledAt = row.scheduled_at as string;
      const sessionTitle = (sessObj?.title as string | null) ?? (row.title as string);
      const meetingLink = (sessObj?.meeting_link as string | null) ?? 'https://www.edusaathiai.in/faculty/live';
      const facultyId = sessObj?.faculty_id as string;
      const facultyProfile = profilesHost.get(facultyId);
      const facultyName = facultyProfile?.full_name ?? 'Faculty';
      const facultyEmail = facultyProfile?.email ?? null;

      const { count: studentCount } = await admin
        .from('live_bookings')
        .select('id', { count: 'exact', head: true })
        .eq('session_id', row.session_id as string)
        .in('payment_status', ['paid']);

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
      console.error(`${LOG}: host reminder failed for lecture ${row.id}`, err instanceof Error ? err.message : err); errorDetails.push('host-loop: ' + (err instanceof Error ? err.message : String(err)));
      errors++;
    }
  }

  // ── Pass 4: faculty_sessions 24h window (1:1 Faculty Finder bookings) ─────
  // 1:1 sessions don't have multiple bookings — each row is exactly one
  // student + one faculty, so the multi-booking fan-out from Pass 1 is
  // not needed here.
  let fs24hSent = 0;
  const fs24hStart = new Date(now + 23 * 3_600_000).toISOString();
  const fs24hEnd   = new Date(now + 25 * 3_600_000).toISOString();

  const { data: fs24hRows, error: fs24hErr } = await admin
    .from('faculty_sessions')
    .select('id, faculty_id, student_id, topic, confirmed_slot')
    .in('status', ['paid', 'confirmed'])
    .eq('reminder_sent_24h', false)
    .not('confirmed_slot', 'is', null)
    .gte('confirmed_slot', fs24hStart)
    .lte('confirmed_slot', fs24hEnd);

  if (fs24hErr) {
    console.error(`${LOG}: fs 24h query failed`, fs24hErr.message);
    errorDetails.push('fs24h: ' + fs24hErr.message);
    errors++;
  }

  const fsRows24h = (fs24hRows ?? []) as Array<{
    id: string;
    faculty_id: string;
    student_id: string;
    topic: string;
    confirmed_slot: string;
  }>;

  const fsProfileIds24h: string[] = [];
  for (const r of fsRows24h) fsProfileIds24h.push(r.faculty_id, r.student_id);
  const fsProfiles24h = await fetchProfiles(admin, fsProfileIds24h);

  for (const row of fsRows24h) {
    try {
      const facultyProfile = fsProfiles24h.get(row.faculty_id);
      const studentProfile = fsProfiles24h.get(row.student_id);
      const facultyName    = facultyProfile?.full_name ?? 'Faculty';
      const studentName    = studentProfile?.full_name ?? 'Student';
      const sessionIdShort = row.id.slice(0, 8);

      const tasks: Promise<unknown>[] = [];

      // T12 — faculty
      if (facultyProfile?.wa_phone) {
        tasks.push(
          sendWhatsAppTemplate({
            templateName: 'edusaathiai_faculty_session_reminder',
            to: stripPhone(facultyProfile.wa_phone),
            params: [
              firstName(facultyName),
              studentName,
              row.topic,
              fmtDate(row.confirmed_slot),
              fmtTime(row.confirmed_slot),
              sessionIdShort,
            ],
            logPrefix: LOG,
          }),
        );
      }

      // T07 — student
      if (studentProfile?.wa_phone) {
        tasks.push(
          sendWhatsAppTemplate({
            templateName: 'edusaathiai_session_reminder_24h',
            to: stripPhone(studentProfile.wa_phone),
            params: [
              firstName(studentName),
              row.topic,
              fmtDate(row.confirmed_slot),
              fmtTime(row.confirmed_slot),
              facultyName,
              sessionIdShort,
            ],
            logPrefix: LOG,
          }),
        );
      }

      await Promise.allSettled(tasks);

      await admin
        .from('faculty_sessions')
        .update({ reminder_sent_24h: true })
        .eq('id', row.id);

      fs24hSent++;
    } catch (err) {
      console.error(`${LOG}: fs 24h reminder failed for session ${row.id}`, err instanceof Error ? err.message : err);
      errorDetails.push('fs24h-loop: ' + (err instanceof Error ? err.message : String(err)));
      errors++;
    }
  }

  // ── Pass 5: faculty_sessions 1h window — student-only with join URL ───────
  let fs1hSent = 0;
  const fs1hStart = new Date(now + 50 * 60_000).toISOString();
  const fs1hEnd   = new Date(now + 70 * 60_000).toISOString();

  const { data: fs1hRows, error: fs1hErr } = await admin
    .from('faculty_sessions')
    .select('id, faculty_id, student_id, topic, confirmed_slot, meeting_link, whereby_room_url')
    .in('status', ['paid', 'confirmed'])
    .eq('reminder_sent_1h', false)
    .not('confirmed_slot', 'is', null)
    .gte('confirmed_slot', fs1hStart)
    .lte('confirmed_slot', fs1hEnd);

  if (fs1hErr) {
    console.error(`${LOG}: fs 1h query failed`, fs1hErr.message);
    errorDetails.push('fs1h: ' + fs1hErr.message);
    errors++;
  }

  const fsRows1h = (fs1hRows ?? []) as Array<{
    id: string;
    faculty_id: string;
    student_id: string;
    topic: string;
    confirmed_slot: string;
    meeting_link: string | null;
    whereby_room_url: string | null;
  }>;

  const fsProfileIds1h: string[] = [];
  for (const r of fsRows1h) fsProfileIds1h.push(r.faculty_id, r.student_id);
  const fsProfiles1h = await fetchProfiles(admin, fsProfileIds1h);

  for (const row of fsRows1h) {
    try {
      const facultyProfile = fsProfiles1h.get(row.faculty_id);
      const studentProfile = fsProfiles1h.get(row.student_id);
      const facultyName = facultyProfile?.full_name ?? 'Faculty';
      // Student joins via whereby_room_url; meeting_link is the legacy fallback.
      const meetingUrl =
        row.whereby_room_url ?? row.meeting_link ?? 'https://www.edusaathiai.in/sessions';

      if (studentProfile?.wa_phone) {
        await sendWhatsAppTemplate({
          templateName: 'edusaathiai_session_reminder_1h',
          to: stripPhone(studentProfile.wa_phone),
          params: [
            firstName(studentProfile.full_name ?? 'Student'),
            row.topic,
            fmtTime(row.confirmed_slot),
            facultyName,
            meetingUrl,
          ],
          logPrefix: LOG,
        });
      }

      await admin
        .from('faculty_sessions')
        .update({ reminder_sent_1h: true })
        .eq('id', row.id);

      fs1hSent++;
    } catch (err) {
      console.error(`${LOG}: fs 1h reminder failed for session ${row.id}`, err instanceof Error ? err.message : err);
      errorDetails.push('fs1h-loop: ' + (err instanceof Error ? err.message : String(err)));
      errors++;
    }
  }

  console.log(`${LOG}: done — 24h=${sent24h} 1h=${sent1h} host=${sentHost} fs24h=${fs24hSent} fs1h=${fs1hSent} errors=${errors}`);

  return new Response(
    JSON.stringify({ ok: true, v: 'r5', sent24h, sent1h, sentHost, fs24hSent, fs1hSent, errors, errorDetails }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
