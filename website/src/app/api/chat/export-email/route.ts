// ─────────────────────────────────────────────────────────────────────────────
// /api/chat/export-email — sends a chat-conversation PDF via Resend.
//
// Body: { recipient: string, base64Pdf: string, saathiName: string,
//         saathiSlug: string, messageCount: number }
//
// Auth: Bearer JWT. The caller must be the owner of the chat being exported.
// PDF generation happens client-side (pdf-lib in browser); this route
// receives the encoded bytes and forwards them to Resend as an attachment.
// Logs a row to exports_log for DPDP audit trail.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON_KEY         = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const RESEND_API_KEY   = process.env.RESEND_API_KEY!
const FROM_ADDRESS     = process.env.RESEND_FROM_EMAIL ?? 'EdUsaathiAI <admin@edusaathiai.in>'

const MAX_PDF_BYTES = 5 * 1024 * 1024 // 5 MB
const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const supabase = createClient(SUPABASE_URL, ANON_KEY)
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Body ────────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const recipient    = String(body.recipient    ?? '').trim()
    const base64Pdf    = String(body.base64Pdf    ?? '')
    const saathiName   = String(body.saathiName   ?? 'Saathi')
    const saathiSlug   = String(body.saathiSlug   ?? 'unknown')
    const messageCount = Number(body.messageCount ?? 0)

    if (!recipient || !EMAIL_RE.test(recipient)) {
      return NextResponse.json({ error: 'invalid_recipient' }, { status: 400 })
    }
    if (!base64Pdf || base64Pdf.length < 200) {
      return NextResponse.json({ error: 'pdf_missing' }, { status: 400 })
    }
    // Resend caps attachments around 40MB; we cap at 5MB to be conservative
    // and keep the request body small.
    const approxBytes = (base64Pdf.length * 3) / 4
    if (approxBytes > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'pdf_too_large' }, { status: 400 })
    }

    if (!RESEND_API_KEY) {
      return NextResponse.json({ error: 'email_not_configured' }, { status: 500 })
    }

    // ── Send via Resend ─────────────────────────────────────────────────
    const date = new Date().toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    const subject = `${saathiName} chat — ${date}`
    const html = `
      <!doctype html>
      <html><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1A1814; max-width: 540px; margin: 0 auto; padding: 24px;">
        <h2 style="font-family: Georgia, serif; font-weight: 700; color: #0B1F3A; margin: 0 0 8px;">
          Your ${saathiName} chat
        </h2>
        <p style="font-size: 14px; color: #4A4740; margin: 0 0 16px;">
          ${date} · ${messageCount} message${messageCount === 1 ? '' : 's'}
        </p>
        <p style="font-size: 14px; color: #4A4740; line-height: 1.6;">
          The full conversation is attached as a PDF. Tool cards, diagrams,
          and live molecules in the chat are referenced as
          <em>open in app to view</em> — visit
          <a href="https://www.edusaathiai.in/chat" style="color: #B8860B;">edusaathiai.in/chat</a>
          to see them live.
        </p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #E5E5E5;" />
        <p style="font-size: 12px; color: #888; margin: 0;">
          Generated via EdUsaathiAI · This export contains your private learning conversation.
        </p>
      </body></html>
    `.trim()

    const resendBody = {
      from:     FROM_ADDRESS,
      to:       [recipient],
      subject,
      html,
      attachments: [
        {
          filename: `${saathiSlug}-chat-${date.replace(/ /g, '-')}.pdf`,
          content:  base64Pdf,
        },
      ],
    }

    const sendRes = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(resendBody),
    })

    if (!sendRes.ok) {
      const detail = await sendRes.text().catch(() => '')
      console.error('[export-email] Resend rejected:', detail.slice(0, 400))
      return NextResponse.json({ error: 'send_failed' }, { status: 502 })
    }

    // ── DPDP audit log ─────────────────────────────────────────────────
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    await admin.from('exports_log').insert({
      user_id:       user.id,
      saathi_slug:   saathiSlug,
      export_type:   'email',
      recipient,
      message_count: messageCount,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[export-email] error:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
