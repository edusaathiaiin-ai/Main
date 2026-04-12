// supabase/functions/send-feedback-alert/index.ts
// Triggered after a student submits feedback
// Sends: email to Jaydeep + WhatsApp to Jaydeep's number

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY       = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY    = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL       = 'admin@edusaathiai.in'
const ADMIN_PHONE       = '919825593262'   // Jaydeep's personal WhatsApp (91 prefix, no +)
const WHATSAPP_TOKEN    = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

const TYPE_LABELS: Record<string, string> = {
  bug:        '\u{1F41B} Bug report',
  question:   '\u2753 Question',
  suggestion: '\u{1F4A1} Suggestion',
  other:      '\u{1F4AC} Feedback',
}

const STATUS_EMOJI: Record<string, string> = {
  bug:        '\u{1F534}',
  question:   '\u{1F535}',
  suggestion: '\u{1F7E1}',
  other:      '\u26AA',
}

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { feedbackId } = await req.json()
    if (!feedbackId) {
      return new Response(JSON.stringify({ error: 'Missing feedbackId' }), { status: 400 })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

    // Fetch feedback with student profile
    const { data: fb } = await supabase
      .from('feedback')
      .select(`
        *,
        student:profiles!feedback_user_id_fkey(
          full_name, email, plan_id, city
        ),
        saathi:verticals!feedback_saathi_id_fkey(name)
      `)
      .eq('id', feedbackId)
      .single()

    if (!fb) {
      return new Response(JSON.stringify({ error: 'Feedback not found' }), { status: 404 })
    }

    const studentName  = fb.student?.full_name ?? 'Unknown student'
    const studentEmail = fb.student?.email ?? ''
    const studentPlan  = fb.student?.plan_id ?? 'unknown'
    const studentCity  = fb.student?.city ?? ''
    const saathiName   = fb.saathi?.name ?? 'Unknown Saathi'
    const typeLabel    = TYPE_LABELS[fb.type] ?? '\u{1F4AC} Feedback'
    const statusEmoji  = STATUS_EMOJI[fb.type] ?? '\u26AA'
    const pageUrl      = fb.page_url ?? 'Unknown page'
    const timeIST      = new Date(fb.created_at).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    })

    // ── Send email ────────────────────────────────────────────────────────────

    const resend = new Resend(RESEND_API_KEY)

    await resend.emails.send({
      from:    'EdUsaathiAI Feedback <noreply@edusaathiai.in>',
      to:      ADMIN_EMAIL,
      subject: `${statusEmoji} ${typeLabel} \u2014 ${studentName} \u00B7 ${pageUrl.replace('https://edusaathiai.in', '')}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: 'DM Sans', Arial, sans-serif; background: #060F1D; color: #fff; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">

            <!-- Header -->
            <div style="margin-bottom: 28px;">
              <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 800; color: #C9993A; margin: 0 0 4px;">
                EdUsaathiAI
              </h1>
              <p style="font-size: 13px; color: rgba(255,255,255,0.4); margin: 0;">
                Student feedback alert
              </p>
            </div>

            <!-- Type badge -->
            <div style="display: inline-block; padding: 6px 14px; border-radius: 100px; background: rgba(201,153,58,0.15); border: 1px solid rgba(201,153,58,0.35); margin-bottom: 20px;">
              <span style="font-size: 13px; font-weight: 700; color: #C9993A;">${typeLabel}</span>
            </div>

            <!-- Message -->
            <div style="padding: 20px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
              <p style="font-size: 15px; color: #fff; line-height: 1.7; margin: 0; white-space: pre-wrap;">${fb.message}</p>
            </div>

            <!-- Screenshot -->
            ${fb.screenshot_url ? `
            <div style="margin-bottom: 20px;">
              <p style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.4); margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.06em;">Screenshot</p>
              <a href="${fb.screenshot_url}" target="_blank">
                <img src="${fb.screenshot_url}" alt="Screenshot" style="width: 100%; border-radius: 10px; border: 0.5px solid rgba(255,255,255,0.1);" />
              </a>
            </div>
            ` : ''}

            <!-- Student info -->
            <div style="padding: 16px 20px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 0.5px solid rgba(255,255,255,0.08); margin-bottom: 16px;">
              <p style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.06em;">Student</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0; width: 100px;">Name</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0;">${studentName}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0;">Email</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0;">${studentEmail}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0;">Plan</td>
                  <td style="font-size: 12px; color: #C9993A; padding: 3px 0; font-weight: 600;">${studentPlan}</td>
                </tr>
                ${studentCity ? `
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0;">City</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0;">${studentCity}</td>
                </tr>` : ''}
              </table>
            </div>

            <!-- Context -->
            <div style="padding: 16px 20px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 0.5px solid rgba(255,255,255,0.08); margin-bottom: 24px;">
              <p style="font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); margin: 0 0 10px; text-transform: uppercase; letter-spacing: 0.06em;">Context</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0; width: 100px;">Page</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0; word-break: break-all;">${pageUrl}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0;">Saathi</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0;">${saathiName}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0;">Device</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0;">${fb.browser_info ?? 'Unknown'}</td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4); padding: 3px 0;">Time</td>
                  <td style="font-size: 12px; color: #fff; padding: 3px 0;">${timeIST} IST</td>
                </tr>
              </table>
            </div>

            <!-- Footer -->
            <p style="font-size: 11px; color: rgba(255,255,255,0.2); text-align: center; margin: 0;">
              EdUsaathiAI \u00B7 Feedback ID: ${fb.id.slice(0, 8)}
            </p>
          </div>
        </body>
        </html>
      `,
    })

    // ── Send WhatsApp ─────────────────────────────────────────────────────────

    if (WHATSAPP_TOKEN && WHATSAPP_PHONE_ID) {
      const shortMessage = fb.message.length > 200
        ? fb.message.slice(0, 200) + '\u2026'
        : fb.message

      const waBody = `${statusEmoji} *${typeLabel}*\n\n` +
        `*Student:* ${studentName} (${studentPlan})\n` +
        `*Page:* ${pageUrl.replace('https://edusaathiai.in', '') || '/'}\n` +
        `*Saathi:* ${saathiName}\n` +
        `*Device:* ${fb.browser_info ?? 'Unknown'}\n\n` +
        `*Message:*\n${shortMessage}\n\n` +
        `_${timeIST} IST_`

      await fetch(
        `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_ID}/messages`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${WHATSAPP_TOKEN}`,
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to:                ADMIN_PHONE,
            type:              'text',
            text:              { body: waBody },
          }),
        }
      )
    }

    // Mark feedback as notified
    await supabase
      .from('feedback')
      .update({ status: 'seen' })
      .eq('id', feedbackId)

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
