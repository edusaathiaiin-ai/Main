// supabase/functions/delete-account/index.ts
// Handles account deletion for ALL roles:
// student · faculty · institution · general public
// Sends confirmation email to user + alert to admin

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY      = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_KEY    = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL   = 'admin@edusaathiai.in'

const resend = new Resend(RESEND_KEY)

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    // ── Auth ───────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Verify the user making the request
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const { reason } = await req.json().catch(() => ({ reason: '' }))
    const userId     = user.id
    const userEmail  = user.email ?? ''

    // ── Admin client (service role — bypasses RLS) ─────────────────
    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // ── Fetch profile before deletion (for records + email) ────────
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, role, plan_id, subscription_status, city, institution_name')
      .eq('id', userId)
      .maybeSingle()

    const fullName  = profile?.full_name ?? 'User'
    const role      = profile?.role      ?? 'student'
    const planId    = profile?.plan_id   ?? 'free'
    const deletedAt = new Date().toISOString()

    // ── Log the deletion request ───────────────────────────────────
    await admin.from('dpdp_requests').insert({
      user_id:      userId,
      request_type: 'delete',
      status:       'completed',
      notes:        reason || 'Self-initiated account deletion',
      resolved_at:  deletedAt,
    }).select('id').maybeSingle()

    // ── Cascade delete — all personal data (parallel for speed) ──────
    // All tables are independent — run in one Promise.allSettled() batch.
    // Must complete before profile anonymise + auth user deletion.
    await Promise.allSettled([
      // Student learning
      admin.from('student_soul').delete().eq('user_id', userId),
      admin.from('student_subjects').delete().eq('user_id', userId),
      admin.from('student_points').delete().eq('user_id', userId),
      admin.from('point_transactions').delete().eq('user_id', userId),
      admin.from('saathi_enrollments').delete().eq('user_id', userId),
      admin.from('saathi_addons').delete().eq('user_id', userId),
      admin.from('companionship_milestones').delete().eq('user_id', userId),
      admin.from('checkin_results').delete().eq('user_id', userId),
      admin.from('notes_saved').delete().eq('user_id', userId),
      admin.from('flashcards').delete().eq('user_id', userId),
      admin.from('daily_challenge_attempts').delete().eq('user_id', userId),
      admin.from('learning_intents').delete().eq('student_id', userId),
      // Chat
      admin.from('chat_messages').delete().eq('user_id', userId),
      admin.from('chat_sessions').delete().eq('user_id', userId),
      admin.from('digest_sent_log').delete().eq('user_id', userId),
      // Community
      admin.from('board_answers').delete().eq('user_id', userId),
      admin.from('board_questions').delete().eq('user_id', userId),
      admin.from('feedback').delete().eq('user_id', userId),
      // Sessions / bookings
      admin.from('live_bookings').delete().eq('student_id', userId),
      admin.from('lecture_requests').delete().eq('student_id', userId),
      admin.from('intern_applications').delete().eq('student_id', userId),
      admin.from('intern_interests').delete().eq('student_user_id', userId),
      admin.from('intern_matches').delete().eq('student_user_id', userId),
      admin.from('faculty_bookmarks').delete().eq('student_id', userId),
      admin.from('notifications').delete().eq('user_id', userId),
      admin.from('conversion_shown').delete().eq('user_id', userId),
      // Compliance
      admin.from('consent_log').delete().eq('user_id', userId),
      admin.from('whatsapp_sessions').delete().eq('user_id', userId),
      // Faculty / institution
      admin.from('faculty_profiles').delete().eq('user_id', userId),
      admin.from('faculty_bookmarks').delete().eq('faculty_id', userId),
      admin.from('faculty_sessions').delete().eq('faculty_id', userId),
      admin.from('live_sessions').delete().eq('faculty_id', userId),
      admin.from('lecture_requests').delete().eq('faculty_id', userId),
      admin.from('research_projects').delete().eq('faculty_id', userId),
      admin.from('internship_postings').delete().eq('posted_by', userId),
      admin.from('intern_listings').delete().eq('institution_user_id', userId),
      admin.from('institution_profiles').delete().eq('user_id', userId),
    ])

    // ── Anonymise profile (keep row for FK integrity, scrub PII) ─────
    await admin.from('profiles').update({
      full_name:                'Deleted User',
      email:                    `deleted_${userId.slice(0, 8)}@edusaathiai.in`,
      city:                     null,
      institution_name:         null,
      exam_target:              null,
      razorpay_customer_id:     null,
      razorpay_subscription_id: null,
      primary_saathi_id:        null,
      wa_phone:                 null,
      is_active:                false,
      subscription_status:      'cancelled',
      plan_id:                  'deleted',
      cancellation_reason:      reason || 'Self-initiated deletion',
      degree_programme:         null,
      university_affiliation:   null,
      current_subjects:         null,
      interest_areas:           null,
      learning_style:           null,
      thesis_area:              null,
      previous_degree:          null,
    }).eq('id', userId)

    // ── Delete auth user (last — after all data cleaned) ─────────────
    await admin.auth.admin.deleteUser(userId)

    // ── Confirmation email to user ─────────────────────────────────
    if (userEmail && !userEmail.includes('deleted_')) {
      await resend.emails.send({
        from:    'EdUsaathiAI <noreply@edusaathiai.in>',
        to:      userEmail,
        subject: 'Your EdUsaathiAI account has been deleted',
        html: `
          <!DOCTYPE html>
          <html>
          <body style="font-family: 'DM Sans', Arial, sans-serif;
            background: #060F1D; color: #fff;
            margin: 0; padding: 0;">
            <div style="max-width: 520px; margin: 0 auto; padding: 40px 24px;">

              <h1 style="font-family: 'Playfair Display', Georgia, serif;
                font-size: 24px; font-weight: 800;
                color: #C9993A; margin: 0 0 24px;">
                EdUsaathiAI
              </h1>

              <h2 style="font-size: 18px; font-weight: 700;
                color: #fff; margin: 0 0 16px;">
                Your account has been deleted
              </h2>

              <p style="font-size: 14px; color: rgba(255,255,255,0.6);
                line-height: 1.7; margin: 0 0 16px;">
                Hello ${fullName},
              </p>

              <p style="font-size: 14px; color: rgba(255,255,255,0.6);
                line-height: 1.7; margin: 0 0 20px;">
                As requested, your EdUsaathiAI account and all
                associated personal data has been permanently deleted.
                This is your confirmation.
              </p>

              <div style="padding: 16px 20px; border-radius: 12px;
                background: rgba(255,255,255,0.04);
                border: 0.5px solid rgba(255,255,255,0.1);
                margin-bottom: 20px;">
                <p style="font-size: 11px; font-weight: 600;
                  color: rgba(255,255,255,0.35); margin: 0 0 10px;
                  text-transform: uppercase; letter-spacing: 0.06em;">
                  Deletion summary
                </p>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                      padding: 3px 0; width: 140px;">Account</td>
                    <td style="font-size: 12px; color: #fff; padding: 3px 0;">
                      ${userEmail}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                      padding: 3px 0;">Role</td>
                    <td style="font-size: 12px; color: #fff; padding: 3px 0;">
                      ${role.charAt(0).toUpperCase() + role.slice(1)}
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                      padding: 3px 0;">Deleted at</td>
                    <td style="font-size: 12px; color: #fff; padding: 3px 0;">
                      ${new Date(deletedAt).toLocaleString('en-IN', {
                        timeZone:   'Asia/Kolkata',
                        day:        'numeric',
                        month:      'short',
                        year:       'numeric',
                        hour:       '2-digit',
                        minute:     '2-digit',
                      })} IST
                    </td>
                  </tr>
                </table>
              </div>

              <p style="font-size: 13px; color: rgba(255,255,255,0.5);
                line-height: 1.7; margin: 0 0 16px;">
                The following data has been permanently removed:
              </p>
              <ul style="font-size: 12px; color: rgba(255,255,255,0.4);
                line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
                <li>Profile and personal information</li>
                <li>All chat sessions and learning history</li>
                <li>Saathi soul data and progress</li>
                <li>Saathi Points and enrollments</li>
                <li>Faculty profile and sessions (if applicable)</li>
              </ul>

              <p style="font-size: 12px; color: rgba(255,255,255,0.4);
                line-height: 1.7; margin: 0 0 24px;">
                This deletion was processed in accordance with the
                Digital Personal Data Protection Act 2023 (India).
                If you did not request this deletion, please contact
                <a href="mailto:admin@edusaathiai.in"
                  style="color: #C9993A;">
                  admin@edusaathiai.in
                </a>
                immediately.
              </p>

              <p style="font-size: 12px; color: rgba(255,255,255,0.3);
                margin: 0;">
                EdUsaathiAI \u00B7 Ahmedabad, Gujarat, India<br/>
                Grievance Officer: Jaydeep Buch \u00B7
                admin@edusaathiai.in
              </p>
            </div>
          </body>
          </html>
        `,
      }).catch((emailErr: unknown) => {
        console.error('delete-account: confirmation email failed', emailErr)
      })
    }

    // ── Admin notification ─────────────────────────────────────────
    await resend.emails.send({
      from:    'EdUsaathiAI System <noreply@edusaathiai.in>',
      to:      ADMIN_EMAIL,
      subject: `\u{1F5D1}\u{FE0F} Account deleted \u2014 ${fullName} \u00B7 ${role} \u00B7 ${planId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif;
          background: #060F1D; color: #fff;
          margin: 0; padding: 0;">
          <div style="max-width: 520px; margin: 0 auto; padding: 32px 24px;">

            <h2 style="font-family: Georgia, serif; color: #C9993A;
              margin: 0 0 20px;">
              Account Deletion Alert
            </h2>

            <div style="padding: 16px 20px; border-radius: 12px;
              background: rgba(239,68,68,0.08);
              border: 0.5px solid rgba(239,68,68,0.25);
              margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                    padding: 4px 0; width: 120px;">Name</td>
                  <td style="font-size: 12px; color: #fff; padding: 4px 0;">
                    ${fullName}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                    padding: 4px 0;">Email</td>
                  <td style="font-size: 12px; color: #fff; padding: 4px 0;">
                    ${userEmail}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                    padding: 4px 0;">Role</td>
                  <td style="font-size: 12px; color: #fff; padding: 4px 0;">
                    ${role}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                    padding: 4px 0;">Plan</td>
                  <td style="font-size: 12px; color: #C9993A;
                    padding: 4px 0; font-weight: 600;">
                    ${planId}
                  </td>
                </tr>
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                    padding: 4px 0;">Deleted at</td>
                  <td style="font-size: 12px; color: #fff; padding: 4px 0;">
                    ${new Date(deletedAt).toLocaleString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })} IST
                  </td>
                </tr>
                ${reason ? `
                <tr>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.4);
                    padding: 4px 0; vertical-align: top;">Reason</td>
                  <td style="font-size: 12px; color: rgba(255,255,255,0.7);
                    padding: 4px 0;">
                    ${reason}
                  </td>
                </tr>` : ''}
              </table>
            </div>

            <p style="font-size: 12px; color: rgba(255,255,255,0.3); margin: 0;">
              All data purged. DPDP request logged and completed.
              No action required.
            </p>
          </div>
        </body>
        </html>
      `,
    }).catch(() => {})

    return new Response(
      JSON.stringify({ ok: true, message: 'Account deleted successfully' }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('delete-account error:', message)
    return new Response(
      JSON.stringify({ error: 'Deletion failed. Please contact admin@edusaathiai.in' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  }
})
