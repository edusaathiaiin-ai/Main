/**
 * supabase/functions/faculty-reject/index.ts
 *
 * Admin rejection action for a pending faculty profile.
 *
 * Flow:
 *   1. UPDATE faculty_profiles
 *        verification_status = 'rejected'
 *        rejection_reason    = <from body>
 *   2. Log to moderation_flags (flag_type='faculty_rejected')
 *   3. Send a warm, constructive rejection email via Resend so the faculty
 *      can resubmit if they wish. No WhatsApp for rejection — too blunt
 *      for a sensitive moment; email gives space to read, breathe, and
 *      decide what to do next.
 *
 * Body:  { facultyId: string, reason: string, adminNote?: string }
 * Auth:  Bearer SUPABASE_SERVICE_ROLE_KEY (admin-only via server action).
 *
 * Idempotency: calling on an already-rejected profile just updates the
 * reason text (no email re-send).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { firstName } from '../_shared/whatsapp.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY')            ?? '';
const RESEND_FROM_EMAIL    = Deno.env.get('RESEND_FROM_EMAIL')
                               ?? 'EdUsaathiAI <admin@edusaathiai.in>';

const LOG = 'faculty-reject';

function authorised(req: Request): boolean {
  const bearer = req.headers.get('Authorization') ?? '';
  if (SUPABASE_SERVICE_KEY && bearer === `Bearer ${SUPABASE_SERVICE_KEY}`) return true;
  return false;
}

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  if (!authorised(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json() as Record<string, unknown>;
    const facultyId = typeof body.facultyId === 'string' ? body.facultyId.trim() : null;
    const reason    = typeof body.reason    === 'string' ? body.reason.trim()    : null;
    const adminNote = typeof body.adminNote === 'string' ? body.adminNote.trim() : null;

    if (!facultyId) {
      return new Response(JSON.stringify({ error: 'facultyId required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
    if (!reason) {
      return new Response(JSON.stringify({ error: 'reason required' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── Read current state for idempotency ──────────────────────────────
    const { data: current } = await admin
      .from('faculty_profiles')
      .select('verification_status')
      .eq('user_id', facultyId)
      .maybeSingle();

    if (!current) {
      return new Response(JSON.stringify({ error: 'Faculty profile not found' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    const alreadyRejected = current.verification_status === 'rejected';

    // ── Update DB ────────────────────────────────────────────────────────
    const { error: updateErr } = await admin
      .from('faculty_profiles')
      .update({
        verification_status: 'rejected',
        rejection_reason:    reason,
        updated_at:          new Date().toISOString(),
      })
      .eq('user_id', facultyId);

    if (updateErr) {
      console.error(`${LOG}: update failed for ${facultyId}`, updateErr.message);
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }

    // ── Audit log ────────────────────────────────────────────────────────
    await admin.from('moderation_flags').insert({
      flag_type:   'faculty_rejected',
      content:     `Faculty ${facultyId} rejected — ${reason}${adminNote ? ` · ${adminNote}` : ''}`,
      reported_by: null,
      resolved:    true,
    });

    // ── Skip notification on re-reject (just reason update) ─────────────
    if (alreadyRejected) {
      console.log(`${LOG}: faculty ${facultyId} already rejected — reason updated, no email`);
      return new Response(
        JSON.stringify({ ok: true, alreadyRejected: true }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
      );
    }

    // ── Rejection email ──────────────────────────────────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', facultyId)
      .single();

    const facultyName  = (profile?.full_name as string | null) ?? 'Faculty';
    const facultyEmail = (profile?.email     as string | null);

    let emailSent = false;
    if (facultyEmail && RESEND_API_KEY) {
      try {
        emailSent = await sendRejectionEmail(facultyEmail, facultyName, reason);
      } catch (err) {
        console.error(`${LOG}: email send failed for ${facultyId}`, err instanceof Error ? err.message : err);
      }
    }

    console.log(`${LOG}: faculty ${facultyId} rejected — reason="${reason}" email=${emailSent}`);

    return new Response(
      JSON.stringify({ ok: true, facultyId, notifications: { email: emailSent } }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    console.error(`${LOG}: unhandled error`, err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});

async function sendRejectionEmail(to: string, facultyName: string, reason: string): Promise<boolean> {
  const greeting = firstName(facultyName);

  const body = `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #FAFAF8;">
  <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">
    <h1 style="font-family: Georgia, serif; font-size: 24px; color: #1A1814; margin: 0 0 12px 0;">
      Hi ${greeting},
    </h1>
    <p style="font-size: 15px; color: #4A4740; line-height: 1.7; margin: 0 0 20px 0;">
      Thank you for applying to teach on EdUsaathiAI. After reviewing your profile,
      we're not able to verify it at this time.
    </p>

    <div style="background: #FFFFFF; border-left: 3px solid #B8860B; padding: 16px 20px; margin: 0 0 24px 0; border-radius: 4px;">
      <p style="margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #B8860B; font-weight: 600;">
        Reason
      </p>
      <p style="margin: 0; font-size: 14px; color: #1A1814; line-height: 1.6;">
        ${escapeHtml(reason)}
      </p>
    </div>

    <p style="font-size: 14px; color: #4A4740; line-height: 1.7; margin: 0 0 20px 0;">
      This is not permanent. You can update your profile, add supporting documents or
      a clearer LinkedIn / Scholar link, and resubmit any time.
    </p>
    <p style="font-size: 14px; color: #4A4740; line-height: 1.7; margin: 0 0 24px 0;">
      <a href="https://www.edusaathiai.in/profile" style="color: #B8860B; font-weight: 600;">Update your profile →</a>
    </p>

    <p style="font-size: 13px; color: #7A7570; line-height: 1.6; margin: 0 0 8px 0;">
      If this decision feels wrong, reply to this email — a human reads every response.
    </p>
    <p style="font-size: 13px; color: #7A7570; margin: 0;">
      — Jaydeep<br>
      <span style="color: #A8A49E;">EdUsaathiAI · Ahmedabad</span>
    </p>
  </div>
</body>
</html>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:    RESEND_FROM_EMAIL,
      to:      [to],
      subject: 'Update on your EdUsaathiAI faculty application',
      html:    body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`${LOG}: Resend error ${res.status}: ${text}`);
    return false;
  }
  return true;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c] ?? c));
}
