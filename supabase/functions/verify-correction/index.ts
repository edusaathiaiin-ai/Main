// ════════════════════════════════════════════════════════════════
// supabase/functions/verify-correction/index.ts
//
// Called by admin when marking a correction as verified.
// 1. Updates fact_corrections status to 'verified'
// 2. Awards 50 SP bonus to reporter
// 3. Emails reporter: "Your correction was verified"
// 4. The correction is now live — chat/index.ts injects it
//    automatically into the Saathi's next session
// ════════════════════════════════════════════════════════════════

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@2'

const admin  = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

serve(async (req: Request) => {
  // Accept either cron secret (scheduled jobs) or service role key (admin UI)
  const cronSecret    = req.headers.get('x-cron-secret')
  const authHeader    = req.headers.get('Authorization') ?? ''
  const serviceKey    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const validCron     = cronSecret === Deno.env.get('CRON_SECRET')
  const validService  = authHeader === `Bearer ${serviceKey}`
  if (!validCron && !validService) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403, headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const { correctionId, adminName } = await req.json()

    if (!correctionId) {
      return new Response(JSON.stringify({ error: 'correctionId is required' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      })
    }

    const { data: correction } = await admin
      .from('fact_corrections')
      .select('*, reporter:profiles!fact_corrections_reporter_id_fkey(full_name, email, plan_id)')
      .eq('id', correctionId)
      .single()

    if (!correction) {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      })
    }

    // Mark verified
    await admin.from('fact_corrections').update({
      status:         'verified',
      verified_by:    adminName ?? 'Admin',
      verified_at:    new Date().toISOString(),
      injected_at:    new Date().toISOString(),
      points_awarded: 60,  // 10 (initial) + 50 (verified bonus)
    }).eq('id', correctionId)

    // Award 50 SP bonus
    if (correction.reporter_id) {
      await admin.rpc('award_saathi_points', {
        p_user_id:     correction.reporter_id,
        p_action_type: 'correction_verified',
        p_base_points: 50,
        p_plan_id:     correction.reporter?.plan_id ?? 'free',
        p_metadata:    { correction_id: correctionId },
      })
    }

    // Email reporter
    const reporterEmail = correction.reporter_email ?? correction.reporter?.email
    if (reporterEmail) {
      await resend.emails.send({
        from:    'EdUsaathiAI <admin@edusaathiai.in>',
        to:      reporterEmail,
        subject: `✓ Your correction was verified — 50 Saathi Points awarded`,
        html: `
          <!DOCTYPE html><html><body style="font-family:Arial,sans-serif;
            background:#060F1D;color:#fff;margin:0;padding:0;">
          <div style="max-width:520px;margin:0 auto;padding:32px 24px;">

            <h1 style="font-family:Georgia,serif;font-size:22px;
              color:#C9993A;margin:0 0 6px;">
              Your correction made ${correction.vertical_slug} smarter.
            </h1>
            <p style="font-size:13px;color:rgba(255,255,255,0.4);margin:0 0 24px;">
              Hi ${correction.reporter?.full_name ?? 'there'},
            </p>

            <p style="font-size:14px;color:rgba(255,255,255,0.8);
              margin:0 0 20px;line-height:1.7;">
              Our team reviewed and verified your factual correction for
              <strong style="color:#fff;">${correction.vertical_slug}</strong>.
              It is now live.
            </p>

            <div style="padding:16px 20px;border-radius:12px;margin-bottom:12px;
              background:rgba(239,68,68,0.07);
              border:0.5px solid rgba(239,68,68,0.2);">
              <p style="font-size:11px;font-weight:600;color:#FCA5A5;
                margin:0 0 6px;text-transform:uppercase;letter-spacing:0.06em;">
                What was wrong</p>
              <p style="font-size:13px;color:#fff;margin:0;line-height:1.6;">
                "${correction.wrong_claim}"</p>
            </div>

            <div style="padding:16px 20px;border-radius:12px;margin-bottom:20px;
              background:rgba(74,222,128,0.07);
              border:0.5px solid rgba(74,222,128,0.2);">
              <p style="font-size:11px;font-weight:600;color:#4ADE80;
                margin:0 0 6px;text-transform:uppercase;letter-spacing:0.06em;">
                Now live — correct answer</p>
              <p style="font-size:13px;color:#fff;margin:0;line-height:1.6;">
                "${correction.correct_claim}"</p>
            </div>

            <div style="padding:16px 20px;border-radius:12px;
              background:rgba(201,153,58,0.06);
              border:0.5px solid rgba(201,153,58,0.2);margin-bottom:24px;">
              <p style="font-size:13px;color:rgba(255,255,255,0.6);
                margin:0;line-height:1.7;">
                Every student who asks this question in ${correction.vertical_slug}
                from now on will receive the correct answer — because of you.<br/><br/>
                <strong style="color:#C9993A;">+50 Saathi Points awarded.</strong>
                Total earned for this correction: 60 SP.
              </p>
            </div>

            <p style="font-size:12px;color:rgba(255,255,255,0.25);
              margin:0;text-align:center;">
              EdUsaathiAI · Indo American Education Society, Ahmedabad
            </p>
          </div></body></html>
        `,
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
