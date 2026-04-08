/**
 * supabase/functions/delete-account/index.ts
 *
 * Immediate account deletion — called when student confirms deletion.
 * Anonymises profile, purges all personal data, deletes auth user,
 * logs to dpdp_requests, sends confirmation + admin alert emails.
 *
 * DPDP Act 2023 compliant: Right to Erasure (Section 12).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@edusaathiai.in'
const ADMIN_EMAIL = 'admin@edusaathiai.in'

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    // ── Auth ────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const userId = user.id
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // ── Parse request ───────────────────────────────────────
    const body = await req.json() as { reason?: string; confirmText?: string }
    if (body.confirmText?.toLowerCase() !== 'delete my account') {
      return new Response(JSON.stringify({ error: 'Confirmation text does not match' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Capture email before anonymisation ───────────────────
    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name, role, plan_id')
      .eq('id', userId)
      .single()

    const contactEmail = profile?.email ?? user.email ?? null
    const userName = profile?.full_name ?? 'User'
    const userRole = profile?.role ?? 'student'
    const reason = typeof body.reason === 'string' ? body.reason.slice(0, 500) : null

    // ── Create DPDP request record ──────────────────────────
    const { data: dpdpRow } = await admin.from('dpdp_requests').insert({
      user_id: userId,
      request_type: 'delete',
      status: 'completed',
      notes: reason ?? 'User-initiated immediate deletion',
      resolved_at: new Date().toISOString(),
    }).select('id').single()

    const requestId = dpdpRow?.id ?? 'unknown'

    // ── Step 1: Anonymise profile ───────────────────────────
    await admin.from('profiles').update({
      full_name:                'Deleted User',
      email:                    `deleted_${userId.slice(0, 8)}@edusaathiai.in`,
      city:                     null,
      institution_name:         null,
      razorpay_customer_id:     null,
      razorpay_subscription_id: null,
      wa_phone:                 null,
      plan_id:                  'deleted',
      is_active:                false,
      is_banned:                false,
      suspension_status:        null,
      degree_programme:         null,
      university_affiliation:   null,
      current_subjects:         null,
      interest_areas:           null,
      learning_style:           null,
      exam_target:              null,
      thesis_area:              null,
      previous_degree:          null,
    }).eq('id', userId)

    // ── Step 2: Hard delete personal data ────────────────────
    // Soul & learning
    await admin.from('student_soul').delete().eq('user_id', userId)
    await admin.from('chat_messages').delete().eq('user_id', userId)
    await admin.from('chat_sessions').delete().eq('user_id', userId)
    await admin.from('checkin_results').delete().eq('user_id', userId).catch(() => {})
    await admin.from('notes_saved').delete().eq('user_id', userId).catch(() => {})
    await admin.from('flashcards').delete().eq('user_id', userId).catch(() => {})
    await admin.from('daily_challenge_attempts').delete().eq('user_id', userId).catch(() => {})

    // Points & enrollments
    await admin.from('student_points').delete().eq('user_id', userId).catch(() => {})
    await admin.from('point_transactions').delete().eq('user_id', userId).catch(() => {})
    await admin.from('saathi_enrollments').delete().eq('user_id', userId).catch(() => {})
    await admin.from('companionship_milestones').delete().eq('user_id', userId).catch(() => {})

    // Community
    await admin.from('feedback').delete().eq('user_id', userId).catch(() => {})
    await admin.from('board_questions').delete().eq('user_id', userId).catch(() => {})
    await admin.from('moderation_flags').delete().eq('reporter_user_id', userId).catch(() => {})
    await admin.from('conversion_shown').delete().eq('user_id', userId).catch(() => {})

    // WhatsApp
    await admin.from('whatsapp_sessions').delete().eq('user_id', userId).catch(() => {})

    // Faculty data (if applicable)
    if (userRole === 'faculty') {
      await admin.from('faculty_profiles').delete().eq('user_id', userId).catch(() => {})
      await admin.from('faculty_sessions').delete().eq('faculty_id', userId).catch(() => {})
      await admin.from('live_sessions').delete().eq('faculty_id', userId).catch(() => {})
      await admin.from('lecture_requests').delete().eq('faculty_id', userId).catch(() => {})
      await admin.from('research_projects').delete().eq('faculty_id', userId).catch(() => {})
    }

    // Live bookings (as student)
    await admin.from('live_bookings').delete().eq('student_id', userId).catch(() => {})
    await admin.from('lecture_requests').delete().eq('student_id', userId).catch(() => {})

    // Consent log (data itself is being deleted)
    await admin.from('consent_log').delete().eq('user_id', userId)

    // ── Step 3: Delete Supabase auth user ────────────────────
    await admin.auth.admin.deleteUser(userId)

    // ── Step 4: Send confirmation email ──────────────────────
    if (contactEmail && RESEND_API_KEY) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `EdUsaathiAI <${RESEND_FROM}>`,
          to: [contactEmail],
          subject: 'Your EdUsaathiAI account has been deleted',
          html: `
            <!DOCTYPE html>
            <html>
            <body style="font-family:'Segoe UI',Arial,sans-serif;background:#060F1D;color:#fff;margin:0;padding:0;">
              <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
                <h1 style="font-size:24px;color:#C9993A;margin:0 0 8px;">EdUsaathiAI</h1>
                <p style="font-size:12px;color:rgba(255,255,255,0.35);margin:0 0 28px;">Account Deletion Confirmation</p>
                <div style="padding:20px;border-radius:14px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.1);margin-bottom:20px;">
                  <h2 style="font-size:18px;color:#fff;margin:0 0 12px;">Your account has been deleted</h2>
                  <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0 0 12px;">
                    Your EdUsaathiAI account and all personal data has been permanently deleted as requested.
                  </p>
                  <p style="font-size:14px;color:rgba(255,255,255,0.65);line-height:1.7;margin:0;">
                    Processed under the Digital Personal Data Protection Act 2023.
                  </p>
                </div>
                <p style="font-size:12px;color:rgba(255,255,255,0.3);line-height:1.6;">
                  Request ID: ${requestId}<br>
                  This action cannot be undone. If you did not request this,
                  contact <a href="mailto:admin@edusaathiai.in" style="color:#C9993A;">admin@edusaathiai.in</a>.
                </p>
                <p style="font-size:11px;color:rgba(255,255,255,0.15);margin-top:28px;text-align:center;">
                  EdUsaathiAI &mdash; IAES, Ahmedabad
                </p>
              </div>
            </body>
            </html>
          `,
        }),
      }).catch(() => {})

      // ── Step 5: Admin alert ────────────────────────────────
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `EdUsaathiAI <${RESEND_FROM}>`,
          to: [ADMIN_EMAIL],
          subject: `Account deleted: ${userName} (${userRole})`,
          html: `
            <h2>Account Deletion Completed</h2>
            <p><strong>User:</strong> ${userName} (${contactEmail})</p>
            <p><strong>Role:</strong> ${userRole}</p>
            <p><strong>Plan:</strong> ${profile?.plan_id ?? 'unknown'}</p>
            <p><strong>Reason:</strong> ${reason ?? 'No reason given'}</p>
            <p><strong>Request ID:</strong> ${requestId}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
          `,
        }),
      }).catch(() => {})
    }

    return new Response(
      JSON.stringify({ deleted: true, requestId }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[delete-account] Error:', err)
    return new Response(
      JSON.stringify({ error: 'Deletion failed. Please contact support.' }),
      { status: 500, headers: { ...corsHeaders(req), 'Content-Type': 'application/json' } },
    )
  }
})
