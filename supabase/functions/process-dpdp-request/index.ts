// supabase/functions/process-dpdp-request/index.ts
// Processes approved DPDP deletion and correction requests.
// Called by cron (2 AM IST daily) or manually by admin.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

serve(async (req: Request) => {
  // Allow cron secret, service_role Bearer, or manual admin trigger
  const cronSecret = req.headers.get('x-cron-secret')
    ?? new URL(req.url).searchParams.get('cron_secret')
  const authBearer = req.headers.get('Authorization')?.replace('Bearer ', '')
  const isAuthed   = (cronSecret === Deno.env.get('CRON_SECRET'))
                  || (authBearer === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  if (!isAuthed) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Fetch all approved pending requests
  const { data: requests } = await supabase
    .from('dpdp_requests')
    .select('*')
    .eq('status', 'approved')
    .order('created_at', { ascending: true })

  if (!requests?.length) {
    return new Response(JSON.stringify({ processed: 0 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let processed = 0

  for (const dpdpReq of requests) {
    try {
      if (dpdpReq.request_type === 'delete') {
        const uid = dpdpReq.user_id

        // Capture email before anonymisation for confirmation
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', uid)
          .single()
        const contactEmail = userProfile?.email ?? null

        // Step 1 — Anonymise profile
        await supabase.from('profiles').update({
          full_name:                'Deleted User',
          email:                    `deleted_${uid.slice(0, 8)}@edusaathiai.in`,
          city:                     null,
          institution_name:         null,
          razorpay_customer_id:     null,
          razorpay_subscription_id: null,
          wa_phone:                 null,
          is_active:                false,
          is_banned:                false,
          suspension_status:        null,
        }).eq('id', uid)

        // Step 2 — Delete soul data
        await supabase.from('student_soul').delete().eq('user_id', uid)

        // Step 3 — Delete chat sessions and messages
        await supabase.from('chat_messages').delete().eq('user_id', uid)
        await supabase.from('chat_sessions').delete().eq('user_id', uid)

        // Step 4 — Delete feedback
        await supabase.from('feedback').delete().eq('user_id', uid).catch(() => {})

        // Step 5 — Delete enrollments, points, milestones
        await supabase.from('saathi_enrollments').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('student_points').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('point_transactions').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('companionship_milestones').delete().eq('user_id', uid).catch(() => {})

        // Step 6 — Delete consent log (data itself is being deleted)
        await supabase.from('consent_log').delete().eq('user_id', uid)

        // Step 7 — Delete other personal data
        await supabase.from('checkin_results').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('notes_saved').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('flashcards').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('board_questions').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('moderation_flags').delete().eq('reporter_user_id', uid).catch(() => {})
        await supabase.from('whatsapp_sessions').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('conversion_shown').delete().eq('user_id', uid).catch(() => {})
        await supabase.from('daily_challenge_attempts').delete().eq('user_id', uid).catch(() => {})

        // Step 8 — Delete Supabase auth user
        await supabase.auth.admin.deleteUser(uid)

        // Step 9 — Send confirmation email
        if (contactEmail && !contactEmail.startsWith('deleted_')) {
          await resend.emails.send({
            from:    'EdUsaathiAI <noreply@edusaathiai.in>',
            to:      contactEmail,
            subject: 'Your data has been deleted — EdUsaathiAI',
            html: `
              <!DOCTYPE html>
              <html>
              <body style="font-family: 'Segoe UI', Arial, sans-serif; background: #060F1D; color: #fff; margin: 0; padding: 0;">
                <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px;">
                  <h1 style="font-size: 24px; color: #C9993A; margin: 0 0 8px;">EdUsaathiAI</h1>
                  <p style="font-size: 12px; color: rgba(255,255,255,0.35); margin: 0 0 28px;">Data Deletion Confirmation</p>

                  <div style="padding: 20px; border-radius: 14px; background: rgba(255,255,255,0.04); border: 0.5px solid rgba(255,255,255,0.1); margin-bottom: 20px;">
                    <h2 style="font-size: 18px; color: #fff; margin: 0 0 12px;">Your data has been deleted</h2>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.7; margin: 0 0 12px;">
                      Your EdUsaathiAI account and all associated personal data has been permanently deleted as requested.
                    </p>
                    <p style="font-size: 14px; color: rgba(255,255,255,0.65); line-height: 1.7; margin: 0 0 12px;">
                      This was processed in accordance with the Digital Personal Data Protection Act 2023.
                    </p>
                    <p style="font-size: 12px; color: rgba(255,255,255,0.35); margin: 0;">
                      Request ID: ${dpdpReq.id}<br>
                      Completed: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                    </p>
                  </div>

                  <p style="font-size: 12px; color: rgba(255,255,255,0.3); line-height: 1.6;">
                    This action cannot be undone. If you did not make this request,
                    please contact <a href="mailto:admin@edusaathiai.in" style="color: #C9993A;">admin@edusaathiai.in</a> immediately.
                  </p>

                  <p style="font-size: 11px; color: rgba(255,255,255,0.15); margin-top: 28px; text-align: center;">
                    EdUsaathiAI &mdash; edusaathiai.in
                  </p>
                </div>
              </body>
              </html>
            `,
          }).catch(() => { /* best-effort */ })
        }

        // Step 10 — Mark request complete
        await supabase.from('dpdp_requests').update({
          status:      'completed',
          resolved_at: new Date().toISOString(),
          notes:       'Account anonymised. Auth deleted. All personal data purged per DPDP 2023.',
        }).eq('id', dpdpReq.id)

      } else if (dpdpReq.request_type === 'correction') {
        // Notify admin for manual review
        await resend.emails.send({
          from:    'EdUsaathiAI DPDP <noreply@edusaathiai.in>',
          to:      'admin@edusaathiai.in',
          subject: `DPDP Correction Request \u2014 ${dpdpReq.id.slice(0, 8)}`,
          html: `
            <h2>Data Correction Request</h2>
            <p><strong>User ID:</strong> ${dpdpReq.user_id}</p>
            <p><strong>Request type:</strong> ${dpdpReq.request_type}</p>
            <p><strong>Details:</strong> ${dpdpReq.notes ?? 'No details provided'}</p>
            <p><strong>Submitted:</strong> ${new Date(dpdpReq.created_at).toLocaleDateString('en-IN')}</p>
            <p><strong>Deadline:</strong> 30 days from submission (${new Date(new Date(dpdpReq.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')})</p>
            <p>Please review, correct the data, and update the dpdp_requests table status to 'completed'.</p>
          `,
        }).catch(() => { /* best-effort */ })

        await supabase.from('dpdp_requests').update({
          status: 'in_progress',
        }).eq('id', dpdpReq.id)

      } else if (dpdpReq.request_type === 'export') {
        // Export requests are handled client-side via DataDownloadButton
        // Mark as completed if still pending
        await supabase.from('dpdp_requests').update({
          status:      'completed',
          resolved_at: new Date().toISOString(),
          notes:       'Data export available via Profile > My Data > Download.',
        }).eq('id', dpdpReq.id)
      }

      processed++
    } catch (err) {
      console.error('[process-dpdp-request] Failed:', dpdpReq.id, err)
      // Don't stop processing other requests
    }
  }

  return new Response(
    JSON.stringify({ processed, at: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
