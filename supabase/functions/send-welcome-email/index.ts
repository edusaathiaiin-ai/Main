/**
 * supabase/functions/send-welcome-email/index.ts
 *
 * Sends a welcome email to new users after signup via Resend.
 * Called fire-and-forget from auth callback (students) and
 * FacultyOnboardFlow (faculty after name is known).
 *
 * Skips if welcome_email_sent is already true on the profile.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@edusaathiai.in';

serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // ── Auth: user JWT or service role + user_id body ───────────
    // Service role path: used by auth-register backfill, admin triggers.
    // User JWT path: used by client-side callers (onboard, callback).
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let userId: string;
    const token = authHeader.replace('Bearer ', '').trim();
    const cronSecret = req.headers.get('x-cron-secret') ?? '';
    const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY ||
      (CRON_SECRET && cronSecret === CRON_SECRET);

    if (isServiceRole) {
      // Server-side caller — read user_id from body
      let body: { user_id?: string } = {};
      try { body = await req.json() } catch { /* no body */ }
      if (!body.user_id) {
        return new Response(JSON.stringify({ error: 'user_id required for service role calls' }), {
          status: 400,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      userId = body.user_id;
    } else {
      // User JWT — validate and extract user id
      const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authError } = await userClient.auth.getUser();
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
      userId = user.id;
    }

    // ── Fetch profile + Saathi name ─────────────────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email, role, welcome_email_sent, primary_saathi_id, verticals(name)')
      .eq('id', userId)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_profile' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Already sent — skip (idempotent)
    if (profile.welcome_email_sent) {
      return new Response(JSON.stringify({ skipped: true, reason: 'already_sent' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const email = profile.email;
    if (!email) {
      return new Response(JSON.stringify({ skipped: true, reason: 'no_email' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const name = profile.full_name?.split(' ')[0] ?? 'there';
    const role = profile.role ?? 'student';
    const saathiName = (profile as { verticals?: { name: string } | null }).verticals?.name ?? null;

    // ── Build email ─────────────────────────────────────────────
    const subject = role === 'faculty'
      ? `Welcome to EdUsaathiAI, Professor ${name}`
      : saathiName
        ? `${name}, meet your ${saathiName}!`
        : `Welcome to EdUsaathiAI, ${name}!`;

    const html = buildWelcomeHtml(name, role, email, saathiName);

    // ── Send via Resend ─────────────────────────────────────────
    if (!RESEND_API_KEY) {
      console.error('[send-welcome-email] RESEND_API_KEY not set');
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `EdUsaathiAI <${RESEND_FROM}>`,
        to: [email],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[send-welcome-email] Resend error:', res.status, errText);
      return new Response(JSON.stringify({ error: 'Email send failed' }), {
        status: 502,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // ── Mark as sent ────────────────────────────────────────────
    await admin.from('profiles').update({ welcome_email_sent: true }).eq('id', userId);

    return new Response(JSON.stringify({ sent: true, to: email }), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-welcome-email] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildWelcomeHtml(name: string, role: string, _email: string, saathiName: string | null): string {
  let roleMessage: string;
  let ctaText: string;
  let ctaUrl: string;
  let featureList: string;

  switch (role) {
    case 'faculty':
      roleMessage = `As a faculty member, you can answer student questions on the Community Board, offer 1:1 sessions, and create live lectures.`;
      ctaText = 'Go to Faculty Dashboard';
      ctaUrl = 'https://edusaathiai.in/faculty';
      featureList = `
                <li>Answer questions and earn your Verified Faculty badge</li>
                <li>Offer 1:1 sessions and live lectures</li>
                <li>Community Board for Q&A with students and peers</li>
                <li>Daily news curated for your subject</li>`;
      break;
    case 'institution':
      roleMessage = `Your institution is now on EdUsaathiAI. Post internships, browse student talent, and showcase your organisation on the Saathi Spotlight.`;
      ctaText = 'Go to Institution Dashboard';
      ctaUrl = 'https://edusaathiai.in/institution';
      featureList = `
                <li>Post internships and browse student profiles</li>
                <li>Saathi Spotlight — showcase your institution</li>
                <li>Track student engagement and applications</li>`;
      break;
    case 'general_public':
      roleMessage = `You now have access to EdUsaathiAI as a curious learner. Explore subjects with the Study Notes and Citizen Guide bots, and join the Community Board.`;
      ctaText = 'Start Exploring';
      ctaUrl = 'https://edusaathiai.in/chat';
      featureList = `
                <li>AI chat with Study Notes and Citizen Guide bots</li>
                <li>Community Board for Q&A with peers and faculty</li>
                <li>Daily news curated for your interests</li>`;
      break;
    default: // student
      roleMessage = saathiName
        ? `Your <strong style="color:#C9993A;">${saathiName}</strong> is ready. This is your personal AI companion — it knows your name, remembers your journey, and grows with you every session.`
        : `You now have access to your personal AI Saathi — a subject companion that remembers you, learns your pace, and grows with you.`;
      ctaText = saathiName ? `Start with ${saathiName} →` : 'Start Learning';
      ctaUrl = 'https://edusaathiai.in/chat';
      featureList = `
                <li>AI chat with your Saathi — personalised to your level</li>
                <li>Community Board for Q&A with peers and faculty</li>
                <li>Daily news curated for your subject</li>
                <li>Saathi Check-ins to track your progress</li>`;
      break;
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#060F1D; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060F1D; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0B1F3A; border-radius:16px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px; text-align:center; border-bottom:1px solid rgba(201,153,58,0.2);">
              <h1 style="margin:0; font-size:28px; color:#C9993A; font-weight:700; letter-spacing:-0.5px;">
                EdUsaathiAI
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:rgba(255,255,255,0.4); letter-spacing:1px;">
                UNIFIED SOUL PARTNERSHIP
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 16px; font-size:22px; color:#FFFFFF; font-weight:600;">
                Welcome${name !== 'there' ? `, ${name}` : ''}!
              </h2>

              <p style="margin:0 0 20px; font-size:15px; color:rgba(255,255,255,0.75); line-height:1.7;">
                ${roleMessage}
              </p>

              <p style="margin:0 0 20px; font-size:15px; color:rgba(255,255,255,0.75); line-height:1.7;">
                EdUsaathiAI is built for India — 24 subject Saathis covering Law, Medicine, Engineering, Commerce, Sciences, and more. Each one knows your name, remembers your journey, and adapts to your style.
              </p>

              <p style="margin:0 0 8px; font-size:14px; color:rgba(255,255,255,0.5);">
                What you get:
              </p>
              <ul style="margin:0 0 24px; padding-left:20px; font-size:14px; color:rgba(255,255,255,0.65); line-height:1.8;">
                ${featureList}
              </ul>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
                <tr>
                  <td style="background:#C9993A; border-radius:10px; padding:14px 32px;">
                    <a href="${ctaUrl}" style="color:#0B1F3A; font-size:15px; font-weight:700; text-decoration:none; display:inline-block;">
                      ${ctaText}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.35); line-height:1.6; font-style:italic;">
                "You are not just answering questions. You are shaping a future."
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px; text-align:center; border-top:1px solid rgba(201,153,58,0.15);">
              <p style="margin:0; font-size:12px; color:rgba(255,255,255,0.25); line-height:1.6;">
                <a href="https://edusaathiai.in" style="color:#C9993A; text-decoration:none;">edusaathiai.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
