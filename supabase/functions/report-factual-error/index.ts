// ════════════════════════════════════════════════════════════════
// supabase/functions/report-factual-error/index.ts
//
// Called when a user submits a factual error report.
// 1. Inserts into fact_corrections
// 2. Awards 10 SP to reporter (pending reward)
// 3. Emails admin@edusaathiai.in immediately
// ════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY')!
const RESEND_KEY   = Deno.env.get('RESEND_API_KEY')!
const ADMIN_EMAIL  = 'admin@edusaathiai.in'

const resend = new Resend(RESEND_KEY)

serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    const uc = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await uc.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const {
      verticalId, verticalSlug, botSlot, sessionId,
      wrongClaim, correctClaim, topic,
      messageExcerpt, evidenceUrl,
    } = body

    if (!verticalId || !wrongClaim?.trim() || !correctClaim?.trim()) {
      return new Response(
        JSON.stringify({ error: 'verticalId, wrongClaim and correctClaim are required' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY)

    // Fetch reporter profile
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email, role, plan_id')
      .eq('id', user.id)
      .maybeSingle()

    // ── Anti-abuse checks ─────────────────────────────────────────────────────

    const today = new Date().toISOString().slice(0, 10)

    // Max 5 reports per day per user
    const { count: todayCount } = await admin
      .from('fact_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`)

    if ((todayCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({
          error: 'You have submitted 5 reports today. Thank you — our team is reviewing them. Please continue tomorrow.',
        }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Max 3 reports per Saathi per week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: weekCount } = await admin
      .from('fact_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .eq('vertical_id', verticalId)
      .gte('created_at', weekAgo)

    if ((weekCount ?? 0) >= 3) {
      return new Response(
        JSON.stringify({
          error: 'You have reported 3 errors for this Saathi this week. Our team is reviewing. Please check back next week.',
        }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Minimum message length validation
    if (wrongClaim.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: 'Please describe the error in more detail (minimum 20 characters).' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }
    if (correctClaim.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: 'Please provide the correct information in more detail (minimum 20 characters).' }),
        { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } }
      )
    }

    // Check prior rejected reports — flag in insert if 2+
    const { count: rejectedCount } = await admin
      .from('fact_corrections')
      .select('id', { count: 'exact', head: true })
      .eq('reporter_id', user.id)
      .eq('status', 'rejected')

    const isRepeatedRejector = (rejectedCount ?? 0) >= 2

    // ─────────────────────────────────────────────────────────────────────────

    // Check for duplicate — same wrong claim on same Saathi, already pending/verified
    const { data: existing } = await admin
      .from('fact_corrections')
      .select('id, status')
      .eq('vertical_id', verticalId)
      .ilike('wrong_claim', `%${wrongClaim.slice(0, 50)}%`)
      .in('status', ['pending', 'verified'])
      .maybeSingle()

    let correctionId: string

    if (existing) {
      // Duplicate — don't insert again, but acknowledge reporter
      correctionId = existing.id
    } else {
      // Insert new correction
      const { data: inserted, error: insertErr } = await admin
        .from('fact_corrections')
        .insert({
          reporter_id:      user.id,
          reporter_role:    profile?.role ?? 'student',
          reporter_email:   profile?.email ?? user.email,
          vertical_id:      verticalId,
          vertical_slug:    verticalSlug,
          bot_slot:         botSlot ?? null,
          session_id:       sessionId ?? null,
          wrong_claim:      wrongClaim.trim(),
          correct_claim:    correctClaim.trim(),
          topic:            topic?.trim() ?? null,
          message_excerpt:  messageExcerpt?.slice(0, 1000) ?? null,
          evidence_url:     evidenceUrl?.trim() ?? null,
          status:           'pending',
          points_awarded:   10,
          admin_note:       isRepeatedRejector ? '⚠️ This reporter has 2+ prior rejected reports — review carefully' : null,
        })
        .select('id')
        .single()

      if (insertErr) throw insertErr
      correctionId = inserted.id

      // Award 10 SP immediately for reporting (pending verification bonus later)
      admin.rpc('award_saathi_points', {
        p_user_id:     user.id,
        p_action_type: 'error_report',
        p_base_points: 10,
        p_plan_id:     profile?.plan_id ?? 'free',
        p_metadata:    { correction_id: correctionId, saathi: verticalSlug },
      }).then(() => {}).catch(() => {})

      // Email admin immediately
      const isDuplicate = !!existing

      // Build credibility signal string for admin email
      const credibilityLines: string[] = []
      credibilityLines.push(evidenceUrl
        ? `✓ Evidence URL provided — <a href="${evidenceUrl}" style="color:#C9993A;">${evidenceUrl}</a>`
        : '✗ No evidence URL — manual verification needed')
      credibilityLines.push(`Reporter role: <strong style="color:#fff;">${profile?.role ?? 'unknown'}</strong>`)
      credibilityLines.push(`Plan: ${profile?.plan_id ?? 'free'}`)
      credibilityLines.push(topic
        ? `Topic specified: <strong style="color:#fff;">${topic}</strong>`
        : '✗ No topic specified')
      credibilityLines.push(wrongClaim.trim().length > 80
        ? '✓ Detailed wrong claim (good signal)'
        : '⚠ Short wrong claim — may be vague')
      credibilityLines.push(isRepeatedRejector
        ? '🚩 Reporter has 2+ prior rejected reports'
        : `✓ Prior rejected reports: ${rejectedCount ?? 0}`)
      const evidenceScore = credibilityLines.join('<br/>')

      await resend.emails.send({
        from:    'EdUsaathiAI Corrections <admin@edusaathiai.in>',
        to:      ADMIN_EMAIL,
        subject: `⚠️ Factual error reported — ${verticalSlug} · ${topic ?? 'Unknown topic'}`,
        html: `
          <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;
            background:#060F1D;color:#fff;margin:0;padding:0;">
          <div style="max-width:560px;margin:0 auto;padding:32px 24px;">

            <h1 style="font-family:Georgia,serif;font-size:22px;
              color:#C9993A;margin:0 0 20px;">
              EdUsaathiAI · Factual Error Report
            </h1>

            <div style="padding:16px 20px;border-radius:12px;margin-bottom:16px;
              background:rgba(239,68,68,0.08);
              border:0.5px solid rgba(239,68,68,0.25);">
              <p style="font-size:11px;font-weight:600;color:#FCA5A5;
                margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em;">
                What the Saathi said (WRONG)</p>
              <p style="font-size:14px;color:#fff;margin:0;line-height:1.6;">
                "${wrongClaim}"</p>
            </div>

            <div style="padding:16px 20px;border-radius:12px;margin-bottom:16px;
              background:rgba(74,222,128,0.07);
              border:0.5px solid rgba(74,222,128,0.2);">
              <p style="font-size:11px;font-weight:600;color:#4ADE80;
                margin:0 0 8px;text-transform:uppercase;letter-spacing:0.06em;">
                Correct information (reporter's claim)</p>
              <p style="font-size:14px;color:#fff;margin:0;line-height:1.6;">
                "${correctClaim}"</p>
            </div>

            <div style="padding:16px 20px;border-radius:12px;margin-bottom:20px;
              background:rgba(255,255,255,0.04);
              border:0.5px solid rgba(255,255,255,0.08);">
              <table style="width:100%;border-collapse:collapse;">
                <tr>
                  <td style="font-size:12px;color:rgba(255,255,255,0.4);
                    padding:3px 0;width:120px;">Saathi</td>
                  <td style="font-size:12px;color:#fff;padding:3px 0;">
                    ${verticalSlug}</td>
                </tr>
                ${topic ? `<tr>
                  <td style="font-size:12px;color:rgba(255,255,255,0.4);padding:3px 0;">
                    Topic</td>
                  <td style="font-size:12px;color:#fff;padding:3px 0;">${topic}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-size:12px;color:rgba(255,255,255,0.4);padding:3px 0;">
                    Reporter</td>
                  <td style="font-size:12px;color:#fff;padding:3px 0;">
                    ${profile?.full_name ?? 'Unknown'}
                    (${profile?.role ?? 'student'}) ·
                    ${profile?.email ?? user.email ?? ''}</td>
                </tr>
                ${evidenceUrl ? `<tr>
                  <td style="font-size:12px;color:rgba(255,255,255,0.4);padding:3px 0;">
                    Source</td>
                  <td style="font-size:12px;padding:3px 0;">
                    <a href="${evidenceUrl}" style="color:#C9993A;">${evidenceUrl}</a>
                  </td>
                </tr>` : ''}
                ${isDuplicate ? `<tr>
                  <td colspan="2" style="font-size:11px;color:#FBBF24;padding:6px 0;">
                    ⚠️ Duplicate — this error was already reported.
                    Consider fast-tracking verification.</td>
                </tr>` : ''}
                ${isRepeatedRejector ? `<tr>
                  <td colspan="2" style="font-size:11px;color:#FCA5A5;padding:6px 0;">
                    🚩 Reporter has 2+ prior rejected reports — verify carefully before awarding points.</td>
                </tr>` : ''}
              </table>
            </div>

            <div style="padding:12px 16px;border-radius:10px;margin-bottom:16px;
              background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.08);">
              <p style="font-size:11px;font-weight:600;color:rgba(255,255,255,0.3);
                margin:0 0 8px;text-transform:uppercase;">Credibility signals</p>
              <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0;line-height:1.8;">
                ${evidenceScore}
              </p>
            </div>

            <div style="padding:14px 18px;border-radius:10px;
              background:rgba(201,153,58,0.06);
              border:0.5px solid rgba(201,153,58,0.2);">
              <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:0 0 8px;">
                <strong style="color:#C9993A;">Action required:</strong>
              </p>
              <p style="font-size:12px;color:rgba(255,255,255,0.4);
                margin:0;line-height:1.6;">
                1. Verify the correction with Shlok or the bare act<br/>
                2. In Supabase → fact_corrections → find ID:
                   <code style="color:#C9993A;">${correctionId.slice(0,8)}</code><br/>
                3. Set status = 'verified' to auto-inject into ${verticalSlug}<br/>
                4. Reporter receives 50 SP bonus automatically
              </p>
            </div>

            <p style="font-size:11px;color:rgba(255,255,255,0.2);
              margin:20px 0 0;text-align:center;">
              Correction ID: ${correctionId}
            </p>
          </div></body></html>
        `,
      })
    }

    return new Response(
      JSON.stringify({ ok: true, correctionId, isDuplicate: !!existing }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
