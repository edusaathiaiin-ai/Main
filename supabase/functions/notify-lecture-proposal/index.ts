/**
 * supabase/functions/notify-lecture-proposal/index.ts
 *
 * Called by faculty after they propose slots OR decline a lecture request.
 * 1. Verifies the caller is the request's faculty_id.
 * 2. Fetches the full request + student profile.
 * 3. Sends the student an email (Resend) + WhatsApp (Meta Cloud API).
 *
 * Body (proposal):  { requestId: string }
 * Body (decline):   { requestId: string, declined: true, reason: string }
 * Auth: JWT (faculty's access token)
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

function paise(p: number): string {
  return `₹${(p / 100).toLocaleString('en-IN')}`;
}

function fmtSlot(start: string, end: string): string {
  const d = new Date(start);
  const e = new Date(end);
  const date = d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata',
  });
  const timeStart = d.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
  const timeEnd = e.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
  });
  return `${date}, ${timeStart} – ${timeEnd} IST`;
}

// ─── Email: Proposal ──────────────────────────────────────────────────────────

async function sendProposalEmail(
  to: string,
  studentName: string,
  facultyName: string,
  subject: string,
  slots: Array<{ start: string; end: string; label?: string }>,
  feePaise: number,
  durationMin: number,
  proposalMessage: string | null,
): Promise<void> {
  if (!RESEND_API_KEY) return;

  const slotRows = slots.map((s) => {
    const label = s.label ?? fmtSlot(s.start, s.end);
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:0.5px solid rgba(255,255,255,0.06);
          font-size:13px;color:rgba(255,255,255,0.75)">
          📅 ${sanitize(label)}
        </td>
      </tr>`;
  }).join('');

  const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;
  background:#0B1F3A;color:#fff;border-radius:16px;overflow:hidden">

  <div style="background:linear-gradient(135deg,#0B1F3A,#1A3A5C);
    padding:32px 36px 24px;border-bottom:1px solid rgba(201,153,58,0.2)">
    <div style="display:inline-block;background:#C9993A;color:#060F1D;
      font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
      padding:4px 12px;border-radius:100px;margin-bottom:14px">
      Session Proposed
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3">
      ${sanitize(facultyName)} has responded to your request! 🎙️
    </h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.5)">
      Topic: ${sanitize(subject)}
    </p>
  </div>

  <div style="padding:28px 36px">
    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0 0 20px">
      Hi ${sanitize(studentName)}, your faculty has proposed the following time slots
      for your 1:1 session. Please log in to confirm your preferred slot.
    </p>

    <!-- Slots table -->
    <div style="background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.1);
      border-radius:12px;overflow:hidden;margin-bottom:20px">
      <div style="padding:10px 12px;background:rgba(201,153,58,0.1);
        border-bottom:0.5px solid rgba(201,153,58,0.2)">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.06em;
          text-transform:uppercase;color:rgba(201,153,58,0.8)">Available Slots</p>
      </div>
      <table style="width:100%;border-collapse:collapse">${slotRows}</table>
    </div>

    <!-- Fee + Duration -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px">
      <div style="background:rgba(74,222,128,0.06);border:0.5px solid rgba(74,222,128,0.18);
        border-radius:10px;padding:12px 14px">
        <p style="font-size:20px;font-weight:800;color:#4ADE80;margin:0 0 2px">
          ${sanitize(paise(feePaise))}
        </p>
        <p style="font-size:10px;color:rgba(255,255,255,0.35);margin:0">session fee</p>
      </div>
      <div style="background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);
        border-radius:10px;padding:12px 14px">
        <p style="font-size:20px;font-weight:800;color:#fff;margin:0 0 2px">
          ${durationMin} min
        </p>
        <p style="font-size:10px;color:rgba(255,255,255,0.35);margin:0">duration</p>
      </div>
    </div>

    ${proposalMessage ? `
    <div style="background:rgba(255,255,255,0.03);border-left:3px solid #C9993A;
      padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px">
      <p style="font-size:10px;font-weight:700;color:rgba(201,153,58,0.8);
        text-transform:uppercase;letter-spacing:0.06em;margin:0 0 6px">
        Message from Faculty
      </p>
      <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0;font-style:italic">
        "${sanitize(proposalMessage)}"
      </p>
    </div>` : ''}

    <a href="https://www.edusaathiai.in/faculty/finder"
       style="display:block;text-align:center;background:#C9993A;color:#060F1D;
       padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;
       text-decoration:none;margin-bottom:12px">
      Confirm Your Slot →
    </a>

    <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0;text-align:center">
      Log in to EdUsaathiAI to confirm the slot and complete payment.
    </p>
  </div>

  <div style="background:rgba(0,0,0,0.2);padding:14px 36px;
    border-top:1px solid rgba(255,255,255,0.06)">
    <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;text-align:center">
      EdUsaathiAI · <a href="mailto:support@edusaathiai.in"
        style="color:#C9993A;text-decoration:none">support@edusaathiai.in</a>
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
      subject:  `📅 ${facultyName} has proposed slots for "${subject}"`,
      html,
    }),
  });
}

// ─── Email: Decline ───────────────────────────────────────────────────────────

async function sendDeclineEmail(
  to: string,
  studentName: string,
  facultyName: string,
  subject: string,
  reason: string,
): Promise<void> {
  if (!RESEND_API_KEY) return;

  const html = `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;
  background:#0B1F3A;color:#fff;border-radius:16px;overflow:hidden">

  <div style="background:linear-gradient(135deg,#0B1F3A,#1A3A5C);
    padding:32px 36px 24px;border-bottom:1px solid rgba(255,255,255,0.08)">
    <div style="display:inline-block;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.6);
      font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;
      padding:4px 12px;border-radius:100px;margin-bottom:14px">
      Request Update
    </div>
    <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.3">
      Hi ${sanitize(studentName)}, a quick update on your session request
    </h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.5)">
      Topic: ${sanitize(subject)}
    </p>
  </div>

  <div style="padding:28px 36px">
    <p style="color:rgba(255,255,255,0.75);font-size:14px;margin:0 0 16px">
      ${sanitize(facultyName)} is unable to take this session at the moment.
      Here's what they shared:
    </p>

    <div style="background:rgba(255,255,255,0.04);border-left:3px solid rgba(255,255,255,0.2);
      padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:24px">
      <p style="font-size:13px;color:rgba(255,255,255,0.6);margin:0;font-style:italic">
        "${sanitize(reason)}"
      </p>
    </div>

    <p style="color:rgba(255,255,255,0.55);font-size:14px;margin:0 0 20px">
      Don't be discouraged — there are many other expert faculty on EdUsaathiAI
      who may be a great fit for this topic.
    </p>

    <a href="https://www.edusaathiai.in/faculty/finder"
       style="display:block;text-align:center;background:#C9993A;color:#060F1D;
       padding:14px 32px;border-radius:12px;font-weight:700;font-size:15px;
       text-decoration:none;margin-bottom:12px">
      Find Another Faculty →
    </a>
  </div>

  <div style="background:rgba(0,0,0,0.2);padding:14px 36px;
    border-top:1px solid rgba(255,255,255,0.06)">
    <p style="font-size:11px;color:rgba(255,255,255,0.2);margin:0;text-align:center">
      EdUsaathiAI · <a href="mailto:support@edusaathiai.in"
        style="color:#C9993A;text-decoration:none">support@edusaathiai.in</a>
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
      subject:  `Update on your session request: "${subject}"`,
      html,
    }),
  });
}

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

async function sendWhatsApp(waPhone: string, body: string): Promise<void> {
  if (!WA_TOKEN || !PHONE_NUMBER_ID) return;
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
      text: { body, preview_url: false },
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
    const body = await req.json() as {
      requestId?: unknown;
      declined?:  unknown;
      reason?:    unknown;
    };
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : null;
    const declined  = body.declined === true;
    const reason    = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (!requestId) {
      return new Response(JSON.stringify({ error: 'requestId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Fetch the request ─────────────────────────────────────────────────────
    const { data: lr, error: lrErr } = await admin
      .from('lecture_requests')
      .select(`
        id, student_id, faculty_id, subject,
        proposed_slots, proposed_fee_paise, proposed_duration,
        proposal_message, decline_reason
      `)
      .eq('id', requestId)
      .single();

    if (lrErr || !lr) {
      return new Response(JSON.stringify({ error: 'Request not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Verify caller is the faculty for this request ─────────────────────────
    if (lr.faculty_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Fetch faculty + student profiles in parallel ───────────────────────────
    const [{ data: facultyProfile }, { data: studentProfile }] = await Promise.all([
      admin.from('profiles').select('full_name').eq('id', user.id).single(),
      admin.from('profiles').select('full_name, email, wa_phone').eq('id', lr.student_id).single(),
    ]);

    const facultyName  = (facultyProfile?.full_name as string | null) ?? 'Your faculty';
    const studentName  = (studentProfile?.full_name  as string | null) ?? 'Student';
    const studentEmail = studentProfile?.email    as string | null;
    const studentWa    = studentProfile?.wa_phone as string | null;

    const subject = lr.subject as string;

    // ── Notify student ────────────────────────────────────────────────────────
    if (declined) {
      // Decline notifications
      const declineReason = reason || (lr.decline_reason as string | null) || 'The faculty is unavailable at this time.';

      await Promise.allSettled([
        studentEmail
          ? sendDeclineEmail(studentEmail, studentName, facultyName, subject, declineReason)
          : Promise.resolve(),
        studentWa
          ? sendWhatsApp(
              studentWa,
              `✦ *EdUsaathiAI* — Session Request Update\n\nHi ${studentName.split(' ')[0]}, ${facultyName} is unable to take the session on *${subject}* at the moment.\n\n_"${declineReason}"_\n\nYou can find another faculty on EdUsaathiAI: https://www.edusaathiai.in/faculty/finder`,
            )
          : Promise.resolve(),
      ]);
    } else {
      // Proposal notifications
      const slots         = (lr.proposed_slots     as Array<{ start: string; end: string; label?: string }> | null) ?? [];
      const feePaise      = (lr.proposed_fee_paise as number | null) ?? 0;
      const durationMin   = (lr.proposed_duration  as number | null) ?? 60;
      const proposalMsg   = (lr.proposal_message   as string | null) ?? null;

      const slotLines = slots
        .map((s, i) => `  ${i + 1}. ${s.label ?? fmtSlot(s.start, s.end)}`)
        .join('\n');

      await Promise.allSettled([
        studentEmail
          ? sendProposalEmail(
              studentEmail, studentName, facultyName, subject,
              slots, feePaise, durationMin, proposalMsg,
            )
          : Promise.resolve(),
        studentWa
          ? sendWhatsApp(
              studentWa,
              `✦ *EdUsaathiAI* — Session Proposed!\n\nHi ${studentName.split(' ')[0]}! *${facultyName}* has responded to your request for *${subject}*.\n\n📅 *Available Slots:*\n${slotLines}\n\n💰 Fee: ₹${(feePaise / 100).toLocaleString('en-IN')} · ⏱ ${durationMin} min\n${proposalMsg ? `\n_"${proposalMsg}"_\n` : ''}\nLog in to confirm your slot: https://www.edusaathiai.in/faculty/finder`,
            )
          : Promise.resolve(),
      ]);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { function: 'notify-lecture-proposal' },
    });
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
