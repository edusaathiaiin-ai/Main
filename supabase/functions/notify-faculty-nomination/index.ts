/**
 * supabase/functions/notify-faculty-nomination/index.ts
 *
 * Sends a faculty invitation email via Resend when a student or faculty
 * nominates someone. Also sends an admin notification to Jaydeep.
 *
 * Called from NominateFacultyModal after successful insert.
 * Auth: nomination-ID-only — the row existing in DB is proof it was
 * authenticated at insert time. No JWT required (avoids stale-token 401s
 * from fire-and-forget invoke).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  try {
    // ── Parse body ─────────────────────────────────────────────
    const { nominationId } = await req.json()
    if (!nominationId) {
      return json({ error: 'nominationId required' }, 400, CORS)
    }

    // ── Fetch nomination (service role — bypasses RLS) ─────────
    // Auth: nomination existing in DB is sufficient — it was
    // authenticated when the student/faculty submitted the form.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: nomination, error: fetchErr } = await admin
      .from('faculty_nominations')
      .select('*')
      .eq('id', nominationId)
      .single()

    if (fetchErr || !nomination) {
      return json({ error: 'Nomination not found' }, 404, CORS)
    }

    // Already sent — skip (idempotent)
    if (nomination.email_sent_at) {
      return json({ skipped: true, reason: 'already_sent' }, 200, CORS)
    }

    // ── Get nominator details ──────────────────────────────────
    let nominatorName = 'A student'
    let nominatorInstitution: string | null = null

    if (nomination.nominator_type === 'student' && nomination.nominated_by_user_id) {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name, institution, city')
        .eq('id', nomination.nominated_by_user_id)
        .single()
      if (profile) {
        nominatorName = profile.full_name ?? 'A student'
        nominatorInstitution = profile.institution
      }
    } else if (nomination.nominator_type === 'faculty' && nomination.nominated_by_faculty_id) {
      const { data: fp } = await admin
        .from('faculty_profiles')
        .select('user_id')
        .eq('id', nomination.nominated_by_faculty_id)
        .single()
      if (fp?.user_id) {
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', fp.user_id)
          .single()
        if (profile) nominatorName = profile.full_name ?? 'A faculty member'
      }
    }

    // ── Parse faculty first name ───────────────────────────────
    const cleanName = nomination.faculty_name
      .replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '')
    const firstName = cleanName.split(' ')[0]

    // ── Build invitation email HTML ────────────────────────────
    const emailHtml = buildInvitationEmail({
      firstName,
      nominatorName,
      nominatorType: nomination.nominator_type as string,
      nominatorInstitution,
      expertiseArea: nomination.expertise_area,
      bioNote: nomination.bio_note,
      nominationId,
    })

    const subject = nomination.nominator_type === 'faculty'
      ? `${nominatorName} thinks you should join EdUsaathiAI`
      : `${nominatorName.split(' ')[0]} thinks you should be on EdUsaathiAI`

    // ── Send faculty invitation via Resend ─────────────────────
    const sendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Jaydeep Buch \u2014 EdUsaathiAI <jaydeep@edusaathiai.in>',
        to: [nomination.faculty_email],
        subject,
        html: emailHtml,
        reply_to: 'jaydeep@edusaathiai.in',
      }),
    })

    if (!sendRes.ok) {
      const errText = await sendRes.text()
      console.error('[notify-faculty-nomination] Resend error:', sendRes.status, errText)

      await admin
        .from('faculty_nominations')
        .update({
          email_error: `${sendRes.status}: ${errText.slice(0, 500)}`,
          email_delivered: false,
        })
        .eq('id', nominationId)

      return json({ error: 'Email send failed' }, 502, CORS)
    }

    const resendData = await sendRes.json()

    // ── Mark success ───────────────────────────────────────────
    await admin
      .from('faculty_nominations')
      .update({
        email_sent_at: new Date().toISOString(),
        email_delivered: true,
        email_error: null,
      })
      .eq('id', nominationId)

    // ── Admin notification (fire-and-forget) ───────────────────
    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'EdUsaathiAI System <noreply@edusaathiai.in>',
        to: ['jaydeep@edusaathiai.in'],
        subject: `New Faculty Nomination \u2014 ${nomination.faculty_name} (${nomination.expertise_area})`,
        html: buildAdminEmail(nomination, nominatorName),
      }),
    }).catch((e) => console.error('[notify-faculty-nomination] Admin email error:', e))

    return json({ success: true, emailId: resendData?.id }, 200, CORS)

  } catch (err) {
    console.error('[notify-faculty-nomination] Unhandled error:', err)
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

// ─── Faculty invitation email ───────────────────────────────────────────────

function buildInvitationEmail(p: {
  firstName: string
  nominatorName: string
  nominatorType: string
  nominatorInstitution: string | null
  expertiseArea: string
  bioNote: string | null
  nominationId: string
}): string {
  const bioBlock = p.bioNote
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#F9F7F4;border-left:3px solid #C9993A;border-radius:0 8px 8px 0;padding:16px 20px;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#C9993A;letter-spacing:0.08em;text-transform:uppercase;">
              ${p.nominatorName.split(' ')[0]} wrote
            </p>
            <p style="margin:0;font-size:14px;color:#444;line-height:1.7;font-style:italic;">
              "${p.bioNote}"
            </p>
          </td>
        </tr>
      </table>`
    : ''

  const introText = p.nominatorType === 'faculty'
    ? `<strong>${p.nominatorName}</strong>, a verified faculty member on EdUsaathiAI, has personally recommended you as a colleague whose expertise in <strong>${p.expertiseArea}</strong> would be invaluable to our students.`
    : `<strong>${p.nominatorName}</strong>${p.nominatorInstitution ? `, a student at ${p.nominatorInstitution},` : ''} has personally recommended you as someone whose expertise in <strong>${p.expertiseArea}</strong> would be invaluable to students on EdUsaathiAI.`

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>You have been recommended \u2014 EdUsaathiAI</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F0;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#060F1D;padding:28px 36px;text-align:center;">
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#FFFFFF;letter-spacing:-0.5px;">
                Edu<span style="color:#C9993A;">saathi</span>AI
              </h1>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.5);letter-spacing:0.05em;">
                WHERE EVERY SUBJECT FINDS ITS SAATHI
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">

              <p style="margin:0 0 20px;font-size:16px;color:#1A1814;line-height:1.6;">
                Dear ${p.firstName},
              </p>

              <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
                ${introText}
              </p>

              ${bioBlock}

              <p style="margin:0 0 20px;font-size:15px;color:#444;line-height:1.7;">
                <strong>EdUsaathiAI</strong> is India's first subject-specific AI companion platform \u2014 30 specialist Saathis serving students across medicine, law, engineering, science, and commerce. We are building a network of verified faculty and professionals who can mentor students through live sessions.
              </p>

              <!-- What joining involves -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;background:#F9F7F4;border-radius:10px;overflow:hidden;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#1A1814;text-transform:uppercase;letter-spacing:0.06em;">
                      What joining involves
                    </p>
                    <table cellpadding="0" cellspacing="0">
                      <tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Set your own availability and session fees</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Earn 80% of every session \u2014 paid weekly</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0Help students who genuinely need your expertise</td></tr>
                      <tr><td style="padding:4px 0;font-size:14px;color:#444;">\u2726 \u00a0No commitment \u2014 join at your own pace</td></tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="https://edusaathiai.in/teach?ref=nomination&id=${p.nominationId}"
                       style="display:inline-block;background:#C9993A;color:#FFFFFF;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.02em;">
                      Learn More &amp; Apply \u2192
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;color:#666;line-height:1.7;">
                This invitation was personally sponsored by <strong>${p.nominatorName}</strong>, who believed you would make a difference.
              </p>

              <p style="margin:0 0 28px;font-size:14px;color:#666;line-height:1.7;">
                We hope to welcome you to EdUsaathiAI. \ud83d\ude4f
              </p>

              <p style="margin:0;font-size:14px;color:#444;">
                With respect,<br>
                <strong>Jaydeep Buch</strong><br>
                <span style="color:#888;font-size:13px;">Founder, EdUsaathiAI \u00b7 Ahmedabad</span>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F9F7F4;padding:20px 36px;border-top:1px solid #EBEBEB;">
              <p style="margin:0;font-size:11px;color:#999;line-height:1.6;text-align:center;">
                EdUsaathiAI \u00b7 Ahmedabad, Gujarat, India<br>
                <a href="https://edusaathiai.in" style="color:#C9993A;text-decoration:none;">edusaathiai.in</a>
                \u00a0\u00b7\u00a0
                <a href="https://edusaathiai.in/teach" style="color:#C9993A;text-decoration:none;">Join as Faculty</a>
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

// ─── Admin notification email ───────────────────────────────────────────────

function buildAdminEmail(
  n: Record<string, unknown>,
  nominatorName: string,
): string {
  return `
    <h2>New Faculty Nomination</h2>
    <table style="border-collapse:collapse;width:100%;">
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Nominated by</td>
          <td style="padding:8px;border:1px solid #ddd;">${nominatorName}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Faculty name</td>
          <td style="padding:8px;border:1px solid #ddd;">${n.faculty_name}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Email</td>
          <td style="padding:8px;border:1px solid #ddd;">${n.faculty_email}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Phone</td>
          <td style="padding:8px;border:1px solid #ddd;">${n.faculty_phone ?? 'Not provided'}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Expertise</td>
          <td style="padding:8px;border:1px solid #ddd;">${n.expertise_area}</td></tr>
      <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;">Bio note</td>
          <td style="padding:8px;border:1px solid #ddd;">${n.bio_note ?? '\u2014'}</td></tr>
    </table>
    <br>
    <a href="https://edusaathiai-admin.vercel.app/faculty/nominations"
       style="background:#C9993A;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;">
      Review in Admin Dashboard \u2192
    </a>
  `
}
