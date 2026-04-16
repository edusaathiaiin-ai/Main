/**
 * supabase/functions/notify-student-faculty-update/index.ts
 *
 * Notifies the nominating student when their nominated faculty takes action:
 *   - type: 'applied'  → faculty submitted the /teach form
 *   - type: 'verified' → admin verified the faculty
 *
 * Called from:
 *   - /api/faculty-apply (service role, type=applied)
 *   - admin Mark Verified action (service role, type=verified)
 *
 * Auth: service role only (called server-to-server).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    // Auth: service role only
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (token !== SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Unauthorized' }, 401, CORS)
    }

    const {
      type,           // 'applied' | 'verified'
      nominationId,
      studentEmail,
      studentName,
      facultyName,
    } = await req.json()

    if (!type || !studentEmail || !studentName || !facultyName) {
      return json({ error: 'Missing required fields' }, 400, CORS)
    }

    const firstName = studentName.split(' ')[0]
    const facultyFirstName = facultyName
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
      .split(' ')[0]

    let subject = ''
    let bodyHtml = ''

    // ── APPLIED EMAIL ──────────────────────────────────────
    if (type === 'applied') {
      subject = `\u2726 ${facultyFirstName} just applied to EdUsaathiAI!`
      bodyHtml = `
        <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
          Great news, <strong>${firstName}</strong> \u2014 your recommendation worked!
        </p>
        <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
          <strong>${facultyName}</strong> saw your recommendation and has
          applied to join EdUsaathiAI as a faculty member.
        </p>
        <div style="background:#F0FDF4;border-left:3px solid #10B981;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
          <p style="margin:0;font-size:14px;color:#065F46;line-height:1.6;">
            Their application is under admin review.
            We typically respond within 48 hours.
            We will let you know once they are verified. \ud83d\ude4f
          </p>
        </div>
        <p style="font-size:14px;color:#666;line-height:1.7;margin:0;">
          Thank you for making this connection. Your recommendation
          is building EdUsaathiAI's teacher network.
        </p>
      `
    }

    // ── VERIFIED EMAIL ─────────────────────────────────────
    if (type === 'verified') {
      subject = `\ud83c\udf89 ${facultyFirstName} is now on EdUsaathiAI!`
      bodyHtml = `
        <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
          <strong>${firstName}</strong> \u2014 your nomination made this happen.
        </p>
        <p style="font-size:15px;color:#444;line-height:1.7;margin:0 0 20px;">
          <strong>${facultyName}</strong> has been verified as a faculty
          member on EdUsaathiAI. They are now available for sessions.
        </p>
        <div style="background:#FFFBEB;border-left:3px solid #C9993A;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#92400E;text-transform:uppercase;letter-spacing:0.06em;">
            Your rewards
          </p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:3px 0;font-size:14px;color:#92400E;">
                \u2726 \u00a0\u20b950 added to your wallet
              </td>
            </tr>
            <tr>
              <td style="padding:3px 0;font-size:14px;color:#92400E;">
                \u2726 \u00a050 Saathi Points added
              </td>
            </tr>
            <tr>
              <td style="padding:3px 0;font-size:14px;color:#92400E;">
                \u2726 \u00a0Faculty Connector badge \u2014 earned
              </td>
            </tr>
          </table>
        </div>
        <p style="font-size:14px;color:#666;line-height:1.7;margin:0 0 20px;">
          You can now book a session with ${facultyFirstName} directly
          through the Faculty Finder.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td>
              <a href="https://edusaathiai.in/explore?tab=faculty"
                 style="display:inline-block;background:#C9993A;color:#FFFFFF;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">
                Find ${facultyFirstName} in Faculty Finder \u2192
              </a>
            </td>
          </tr>
        </table>
      `
    }

    // ── SHARED EMAIL WRAPPER ───────────────────────────────
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:16px;overflow:hidden;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#060F1D;padding:28px 36px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;
                         color:#FFFFFF;letter-spacing:-0.5px;">
                Edu<span style="color:#C9993A;">saathi</span>AI
              </h1>
              <p style="margin:6px 0 0;font-size:12px;
                        color:rgba(255,255,255,0.5);letter-spacing:0.05em;">
                WHERE EVERY SUBJECT FINDS ITS SAATHI
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F4;padding:20px 36px;
                       border-top:1px solid #EBEBEB;">
              <p style="margin:0;font-size:11px;color:#999;
                        line-height:1.6;text-align:center;">
                EdUsaathiAI \u00b7 Ahmedabad, Gujarat, India<br>
                <a href="https://edusaathiai.in"
                   style="color:#C9993A;text-decoration:none;">
                  edusaathiai.in
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'EdUsaathiAI <jaydeep@edusaathiai.in>',
        to: [studentEmail],
        subject,
        html: emailHtml,
        reply_to: 'jaydeep@edusaathiai.in',
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[notify-student-faculty-update] Resend error:', res.status, errText)
      return json({ error: 'Email send failed' }, 502, CORS)
    }

    return json({ success: true }, 200, CORS)

  } catch (err) {
    console.error('[notify-student-faculty-update] error:', err)
    return json({ error: 'Internal error' }, 500, corsHeaders(req))
  }
})

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}
