import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * Share faculty notes with all booked students via WhatsApp + Email.
 *
 * POST /api/classroom/share-notes
 * Body: { sessionId, channel: 'whatsapp' | 'email' | 'both' }
 *
 * Auth: JWT, faculty only.
 * Reads notes from live_sessions.session_artifacts.session_notes.
 * Reads students from live_bookings.
 *
 * WhatsApp: uses edusaathiai_session_notes template (pending Meta approval).
 * Email: uses Resend (always works).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sessionId, channel } = await req.json() as {
    sessionId: string
    channel: 'whatsapp' | 'email' | 'both'
  }

  if (!sessionId || !channel) {
    return NextResponse.json({ error: 'sessionId and channel required' }, { status: 400 })
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Verify caller is faculty of this session
  const { data: session } = await admin
    .from('live_sessions')
    .select('faculty_id, title, session_artifacts, vertical_id')
    .eq('id', sessionId)
    .single()

  if (!session || session.faculty_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Get notes
  const artifacts = session.session_artifacts as Record<string, unknown> | null
  const notes = artifacts?.session_notes as { html?: string; plain_text?: string } | undefined
  const plainText = notes?.plain_text ?? ''

  if (!plainText.trim()) {
    return NextResponse.json({ error: 'No notes to share' }, { status: 400 })
  }

  // Get Saathi name
  const { data: vertical } = await admin
    .from('verticals')
    .select('name')
    .eq('id', session.vertical_id)
    .single()
  const saathiName = vertical?.name ?? 'Saathi'

  // Get booked students with contact info
  const { data: bookings } = await admin
    .from('live_bookings')
    .select('student_id')
    .eq('session_id', sessionId)

  const studentIds = (bookings ?? []).map(b => b.student_id).filter(Boolean)

  if (studentIds.length === 0) {
    return NextResponse.json({ error: 'No students booked', sent: 0, failed: 0 }, { status: 200 })
  }

  const { data: students } = await admin
    .from('profiles')
    .select('id, full_name, email, wa_phone')
    .in('id', studentIds)

  let waSent = 0
  let waFailed = 0
  let emailSent = 0
  let emailFailed = 0

  const waToken = process.env.WHATSAPP_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const resendKey = process.env.RESEND_API_KEY

  // Truncate for WhatsApp template (max 1024 chars per param)
  const noteSnippet = plainText.slice(0, 900)

  // ── WhatsApp delivery ──
  if ((channel === 'whatsapp' || channel === 'both') && waToken && phoneNumberId) {
    for (const student of students ?? []) {
      if (!student.wa_phone) continue
      const phone = student.wa_phone.replace(/^\+/, '')

      try {
        const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${waToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: phone,
            type: 'template',
            template: {
              name: 'edusaathiai_session_notes',
              language: { code: 'en' },
              components: [{
                type: 'body',
                parameters: [
                  { type: 'text', text: saathiName },
                  { type: 'text', text: session.title ?? 'Classroom Session' },
                  { type: 'text', text: noteSnippet },
                ],
              }],
            },
          }),
        })

        if (res.ok) waSent++
        else {
          console.error('[share-notes] WA failed for', phone, await res.text())
          waFailed++
        }
      } catch { waFailed++ }
    }
  }

  // ── Email delivery ──
  if ((channel === 'email' || channel === 'both') && resendKey) {
    const notesHtml = notes?.html ?? `<pre>${plainText}</pre>`

    for (const student of students ?? []) {
      if (!student.email) continue

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'EdUsaathiAI <noreply@edusaathiai.in>',
            to: student.email,
            subject: `📒 Session Notes — ${session.title ?? saathiName}`,
            html: `<!DOCTYPE html><html><body style="font-family:'Plus Jakarta Sans',sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;color:#1A1814;">
              <h1 style="font-size:20px;font-weight:700;margin:0 0 4px;">📒 Session Notes</h1>
              <p style="font-size:13px;color:#7A7570;margin:0 0 20px;">${saathiName} · ${session.title ?? 'Classroom Session'}</p>
              <div style="padding:20px;border-radius:12px;background:#F5F4F0;border:1px solid rgba(26,24,20,0.08);font-size:14px;line-height:1.8;">
                ${notesHtml}
              </div>
              <p style="font-size:11px;color:#A8A49E;margin:24px 0 0;text-align:center;">EdUsaathiAI · edusaathiai.in</p>
            </body></html>`,
          }),
        })

        if (res.ok) emailSent++
        else emailFailed++
      } catch { emailFailed++ }
    }
  }

  return NextResponse.json({
    sent: waSent + emailSent,
    failed: waFailed + emailFailed,
    breakdown: { waSent, waFailed, emailSent, emailFailed },
    totalStudents: students?.length ?? 0,
  })
}
