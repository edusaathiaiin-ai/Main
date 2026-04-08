/**
 * supabase/functions/notify-meeting-link/index.ts
 *
 * Called by faculty when they set or update the meeting link on a live session.
 * 1. Verifies the caller is the session's faculty_id.
 * 2. Saves the link + timestamps meeting_link_shared_at.
 * 3. Fetches all paid-booking students.
 * 4. Sends each student an email (Resend) + WhatsApp message (Meta Cloud API).
 *
 * Body: { sessionId: string, meetingLink: string }
 * Auth: JWT (faculty's access token)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { captureError } from '../_shared/sentry.ts';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY        = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const RESEND_API_KEY           = Deno.env.get('RESEND_API_KEY') ?? '';
const WA_TOKEN                 = Deno.env.get('WHATSAPP_TOKEN') ?? '';
const PHONE_NUMBER_ID          = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitize(s: string): string {
  return s.replace(/[<>"'`]/g, '');
}

async function sendEmail(
  to: string,
  studentName: string,
  sessionTitle: string,
  meetingLink: string,
  scheduledAt: string | null,
): Promise<void> {
  if (!RESEND_API_KEY) return;

  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST'
    : null;

  const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;background:#0B1F3A;color:#fff;border-radius:16px;overflow:hidden">

  <div style="background:linear-gradient(135deg,#0B1F3A,#1A3A5C);padding:32px 36px 24px;border-bottom:1px solid rgba(201,153,58,0.2)">
    <div style="display:inline-block;background:#4ADE80;color:#060F1D;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:100px;margin-bottom:14px">
      Meeting Link Ready
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3">
      Your session is confirmed, ${sanitize(studentName)}! 🎙️
    </h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.5)">
      ${sanitize(sessionTitle)}
    </p>
  </div>

  <div style="padding:28px 36px">
    ${timeStr ? `<p style="color:rgba(255,255,255,0.6);font-size:13px;margin:0 0 20px">📅 ${timeStr}</p>` : ''}

    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0 0 16px">
      Your faculty has shared the meeting link. Click below to join when the session starts:
    </p>

    <a href="${sanitize(meetingLink)}"
       style="display:block;text-align:center;background:#C9993A;color:#060F1D;padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:20px">
      🔗 Join Session
    </a>

    <div style="background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);border-radius:10px;padding:12px 16px;margin-bottom:24px">
      <p style="font-size:10px;color:rgba(255,255,255,0.35);margin:0 0 4px">Meeting link</p>
      <p style="font-size:12px;color:rgba(255,255,255,0.6);margin:0;word-break:break-all">${sanitize(meetingLink)}</p>
    </div>

    <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0">
      Keep this email handy. Questions? Reply to this email or WhatsApp us.
    </p>
  </div>

  <div style="background:rgba(0,0,0,0.2);padding:14px 36px;border-top:1px solid rgba(255,255,255,0.06)">
    <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;text-align:center">
      EdUsaathiAI · <a href="mailto:support@edusaathiai.in" style="color:#C9993A;text-decoration:none">support@edusaathiai.in</a>
    </p>
  </div>

</div>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     'EdUsaathiAI <support@edusaathiai.in>',
      to:       [to],
      reply_to: 'support@edusaathiai.in',
      subject:  `🔗 Meeting link for "${sessionTitle}" — join now`,
      html,
    }),
  });
}

async function sendWhatsApp(waPhone: string, studentName: string, sessionTitle: string, meetingLink: string): Promise<void> {
  if (!WA_TOKEN || !PHONE_NUMBER_ID) return;

  const firstName = studentName.split(' ')[0];
  const msg = `✦ *EdUsaathiAI* — Meeting Link Ready\n\nHey ${firstName}! Your faculty just shared the link for *${sessionTitle}*.\n\n🔗 Join here:\n${meetingLink}\n\n_Save this link. See you in session!_`;

  await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: waPhone,
      type: 'text',
      text: { body: msg, preview_url: true },
    }),
  });
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS });

  try {
    // ── Verify JWT ────────────────────────────────────────────────────────────
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

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json() as { sessionId?: unknown; meetingLink?: unknown };
    const sessionId  = typeof body.sessionId  === 'string' ? body.sessionId.trim()  : null;
    const meetingLink = typeof body.meetingLink === 'string' ? body.meetingLink.trim() : null;

    if (!sessionId || !meetingLink) {
      return new Response(JSON.stringify({ error: 'sessionId and meetingLink required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // Basic URL validation
    try { new URL(meetingLink); } catch {
      return new Response(JSON.stringify({ error: 'Invalid meeting link URL' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Verify caller owns this session ───────────────────────────────────────
    const { data: session, error: sessErr } = await admin
      .from('live_sessions')
      .select('id, title, faculty_id')
      .eq('id', sessionId)
      .single();

    if (sessErr || !session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (session.faculty_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Save link + timestamp ─────────────────────────────────────────────────
    await admin
      .from('live_sessions')
      .update({
        meeting_link: meetingLink,
        meeting_link_shared_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    // ── Fetch the next scheduled lecture (for time display in notifications) ──
    const { data: nextLecture } = await admin
      .from('live_lectures')
      .select('scheduled_at')
      .eq('session_id', sessionId)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    const scheduledAt = nextLecture?.scheduled_at ?? null;

    // ── Fetch all paid bookings with student email + wa_phone ────────────────
    const { data: bookings } = await admin
      .from('live_bookings')
      .select('student_id')
      .eq('session_id', sessionId)
      .eq('payment_status', 'paid');

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ notified: 0, message: 'No paid students yet' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const studentIds = bookings.map((b) => b.student_id);
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, email, wa_phone')
      .in('id', studentIds);

    if (!profiles) {
      return new Response(JSON.stringify({ notified: 0 }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Notify each student — parallel, failures are swallowed ───────────────
    let notified = 0;
    await Promise.allSettled(
      profiles.map(async (p) => {
        const name = (p.full_name as string | null) ?? 'Student';
        const email = p.email as string | null;
        const wa = p.wa_phone as string | null;

        const tasks: Promise<void>[] = [];

        if (email) {
          tasks.push(sendEmail(email, name, session.title, meetingLink, scheduledAt));
        }
        if (wa) {
          tasks.push(sendWhatsApp(wa, name, session.title, meetingLink));
        }

        if (tasks.length > 0) {
          await Promise.allSettled(tasks);
          notified++;
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, notified, total: profiles.length }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { function: 'notify-meeting-link' },
    });
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
