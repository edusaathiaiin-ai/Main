/**
 * supabase/functions/notify-student-faculty-update/index.ts
 *
 * Notifies the nominating student when their nominated faculty takes action:
 *   - type: 'applied'  → faculty submitted the /teach form
 *   - type: 'verified' → admin verified the faculty (Step 6, future)
 *
 * Called from:
 *   - /api/faculty-apply (service role, type=applied)
 *   - admin dashboard (service role, type=verified, future)
 *
 * Auth: service role only (called server-to-server).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

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

    const body = await req.json()
    const { type, nominationId, studentEmail, studentName, facultyName } = body as {
      type: 'applied' | 'verified'
      nominationId: string
      studentEmail: string
      studentName: string
      facultyName: string
    }

    if (!type || !nominationId || !studentEmail || !facultyName) {
      return json({ error: 'Missing required fields' }, 400, CORS)
    }

    const firstName = (studentName ?? 'there').split(' ')[0]
    const facultyFirst = facultyName
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
      .split(' ')[0]

    const subject =
      type === 'applied'
        ? `${facultyFirst} just applied to EdUsaathiAI — thanks to you!`
        : `${facultyFirst} is now verified on EdUsaathiAI!`

    const html = buildEmail({ type, firstName, facultyName, facultyFirst })

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'EdUsaathiAI <noreply@edusaathiai.in>',
        to: [studentEmail],
        subject,
        html,
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

// ─── Email builder ──────────────────────────────────────────────────────────

function buildEmail(p: {
  type: 'applied' | 'verified'
  firstName: string
  facultyName: string
  facultyFirst: string
}): string {
  const isApplied = p.type === 'applied'

  const headline = isApplied
    ? `${p.facultyFirst} just applied!`
    : `${p.facultyFirst} is now verified!`

  const body = isApplied
    ? `<p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
        Great news \u2014 <strong>${p.facultyName}</strong>, the faculty member you
        nominated, has just submitted their application to join EdUsaathiAI.
      </p>
      <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
        Our team will review their profile and verify them shortly.
        We will notify you again once they are officially on the platform.
      </p>`
    : `<p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
        <strong>${p.facultyName}</strong> is now a verified faculty member
        on EdUsaathiAI \u2014 and it happened because of your nomination.
      </p>
      <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
        You can now book a session with them directly through the Faculty Finder.
        Thank you for helping build our teacher network. \ud83d\ude4f
      </p>`

  const ctaLabel = isApplied ? 'Continue Learning' : 'Find them in Faculty Finder \u2192'
  const ctaHref = isApplied
    ? 'https://edusaathiai.in/chat'
    : 'https://edusaathiai.in/faculty-finder'

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#060F1D;padding:24px 36px;text-align:center;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#FFFFFF;">
                Edu<span style="color:#C9993A;">saathi</span>AI
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <p style="margin:0 0 20px;font-size:16px;color:#1A1814;line-height:1.6;">
                Hi ${p.firstName},
              </p>

              <!-- Headline card -->
              <div style="background:#F9F7F4;border-left:3px solid #C9993A;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 24px;">
                <p style="margin:0;font-size:15px;font-weight:700;color:#1A1814;">
                  ${headline}
                </p>
              </div>

              ${body}

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center">
                    <a href="${ctaHref}"
                       style="display:inline-block;background:#C9993A;color:#FFFFFF;text-decoration:none;padding:12px 32px;border-radius:10px;font-size:14px;font-weight:700;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                Your nominations help build India\u2019s strongest faculty network.
                Thank you for being part of EdUsaathiAI.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F4;padding:16px 36px;border-top:1px solid #EBEBEB;">
              <p style="margin:0;font-size:11px;color:#999;text-align:center;">
                EdUsaathiAI \u00b7 Ahmedabad, Gujarat
                \u00a0\u00b7\u00a0
                <a href="https://edusaathiai.in" style="color:#C9993A;text-decoration:none;">edusaathiai.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
