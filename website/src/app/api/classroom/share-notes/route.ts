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
    const notesHtml = notes?.html ?? `<pre style="white-space:pre-wrap;">${plainText}</pre>`

    // Faculty name
    const { data: facultyProfile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single()
    const facultyName = facultyProfile?.full_name ?? 'Faculty'

    // Session date
    const sessionDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

    // Artifact summary from research_archives
    const { data: archives } = await admin
      .from('research_archives')
      .select('artifacts, summary')
      .eq('session_id', sessionId)
      .limit(1)
      .maybeSingle()

    const artifactList = (archives?.artifacts as Array<{ type: string; source: string }> ?? [])
      .filter(a => a.type !== 'command_log' && a.type !== 'session_notes')
      .slice(0, 5)

    const artifactHtml = artifactList.length > 0
      ? `<div style="padding:16px 20px;border-radius:12px;background:#FAFAF8;border:1px solid rgba(26,24,20,0.06);margin:16px 0;">
          <p style="font-size:11px;font-weight:700;color:#7A7570;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Research Artifacts</p>
          ${artifactList.map(a => `<p style="font-size:13px;color:#4A4740;margin:0 0 6px;">• <strong>${a.type.replace(/_/g, ' ')}</strong> — ${a.source}</p>`).join('')}
          <a href="https://www.edusaathiai.in/profile?tab=archive" style="display:inline-block;margin-top:12px;padding:8px 20px;border-radius:8px;background:#B8860B;color:#fff;font-size:12px;font-weight:600;text-decoration:none;">View Research Archive →</a>
        </div>`
      : ''

    // Send in batches of 10
    const emailStudents = (students ?? []).filter(s => s.email)
    for (let i = 0; i < emailStudents.length; i += 10) {
      const batch = emailStudents.slice(i, i + 10)
      const results = await Promise.allSettled(
        batch.map(async (student) => {
          const firstName = (student.full_name ?? 'Student').split(' ')[0]
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'EdUsaathiAI <admin@edusaathiai.in>',
              to: student.email,
              subject: `📒 Notes from ${saathiName} session — ${facultyName} — ${sessionDate}`,
              html: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Plus Jakarta Sans',Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 20px;color:#1A1814;background:#FFFFFF;">
  <h1 style="font-family:Georgia,serif;font-size:22px;font-weight:800;color:#B8860B;margin:0 0 4px;">EdUsaathiAI</h1>
  <p style="font-size:11px;color:#A8A49E;margin:0 0 24px;">Session notes from your classroom</p>

  <p style="font-size:15px;color:#1A1814;margin:0 0 20px;">Hi ${firstName},</p>

  <p style="font-size:13px;color:#4A4740;margin:0 0 6px;">Here are your notes from today's <strong>${saathiName}</strong> session with <strong>${facultyName}</strong>.</p>
  <p style="font-size:11px;color:#7A7570;margin:0 0 20px;">${sessionDate}</p>

  <div style="padding:20px;border-radius:12px;background:#F5F4F0;border:1px solid rgba(26,24,20,0.08);font-size:14px;line-height:1.8;color:#1A1814;">
    ${notesHtml}
  </div>

  ${artifactHtml}

  <div style="text-align:center;margin:28px 0;">
    <a href="https://www.edusaathiai.in/chat" style="display:inline-block;padding:12px 28px;border-radius:10px;background:#B8860B;color:#fff;font-size:13px;font-weight:700;text-decoration:none;">Continue with ${saathiName} →</a>
    <p style="font-size:10px;color:#A8A49E;margin:8px 0 0;">Your Saathi remembers where you left off.</p>
  </div>

  <div style="border-top:1px solid rgba(26,24,20,0.06);padding-top:16px;text-align:center;">
    <p style="font-size:10px;color:#A8A49E;margin:0;">EdUsaathiAI · Ahmedabad, Gujarat, India</p>
  </div>
</body></html>`,
            }),
          })
          return res.ok
        })
      )

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) emailSent++
        else emailFailed++
      }
    }
  }

  return NextResponse.json({
    sent: waSent + emailSent,
    failed: waFailed + emailFailed,
    breakdown: { waSent, waFailed, emailSent, emailFailed },
    totalStudents: students?.length ?? 0,
  })
}
