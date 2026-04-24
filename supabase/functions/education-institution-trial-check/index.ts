/**
 * supabase/functions/education-institution-trial-check/index.ts
 *
 * Daily cron — sends conversational trial-reminder emails to principals of
 * education institutions (schools / colleges / universities).
 *
 *   Day 5 (≈2 days before trial_ends_at): "trial ends in 2 days — reply if you
 *                                           want more time"
 *   Day 7 (expiry day or later):          "your trial has ended — reply to
 *                                           continue, we'll get you set up"
 *
 * Idempotent via trial_day5_notified_at / trial_day7_notified_at. Never
 * auto-changes education_institutions.status — admin decides next move from
 * the admin dashboard (Extend Trial / Activate Billing / Mark Churned).
 *
 * Auth: service role token OR x-cron-secret matching CRON_SECRET.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET               = Deno.env.get('CRON_SECRET') ?? '';
const RESEND_API_KEY            = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM               = Deno.env.get('RESEND_FROM_EMAIL') ?? 'EdUsaathiAI <admin@edusaathiai.in>';

const DAY_MS = 24 * 60 * 60 * 1000;

type EducationInstitutionRow = {
  id: string;
  name: string;
  city: string;
  principal_name: string | null;
  principal_email: string;
  trial_ends_at: string | null;
  trial_day5_notified_at: string | null;
  trial_day7_notified_at: string | null;
};

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);
}

/* ── Email templates ────────────────────────────────────────────────────── */

function day5Html(principalName: string | null, institutionName: string): string {
  const greet = principalName ? `Dear ${esc(principalName)},` : 'Hello,';
  return `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#B8860B;margin:0 0 6px;">Your EdUsaathiAI trial ends in 2 days</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 18px;">EdUsaathiAI · Unified Soul Partnership</p>
    <p style="font-size:15px;line-height:1.65;">${greet}</p>
    <p style="font-size:15px;line-height:1.65;">
      Your trial for <strong>${esc(institutionName)}</strong> wraps up in about 48 hours. We hope the last few days
      have given your faculty and students a real feel for what EdUsaathiAI can do for your classrooms.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      <strong>Want more time?</strong> Just reply to this email. No forms, no escalation — a short reply and I&apos;ll
      extend your access by another week so your team can finish what they started.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      If you&apos;d prefer to move straight to a rolling membership, reply to this too — I&apos;ll walk you through
      the options we&apos;ve set up for partner institutions.
    </p>
    <div style="margin-top:26px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:13px;color:#4A4740;">
      Warmly,<br/>
      <strong>Jaydeep Buch</strong><br/>
      Founder, EdUsaathiAI<br/>
      <a href="mailto:admin@edusaathiai.in" style="color:#B8860B;text-decoration:none;">admin@edusaathiai.in</a>
    </div>
  </div>
</body></html>`.trim();
}

function day7Html(principalName: string | null, institutionName: string): string {
  const greet = principalName ? `Dear ${esc(principalName)},` : 'Hello,';
  return `
<!doctype html>
<html><body style="margin:0;padding:0;background:#FAF7F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1A1814;">
  <div style="max-width:620px;margin:0 auto;padding:28px 24px;">
    <div style="height:4px;background:linear-gradient(90deg,#B8860B 0%,#C9993A 100%);border-radius:2px;margin-bottom:18px;"></div>
    <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#B8860B;margin:0 0 6px;">Your trial has ended</h1>
    <p style="color:#7A7570;font-size:13px;font-style:italic;margin:0 0 18px;">EdUsaathiAI · Unified Soul Partnership</p>
    <p style="font-size:15px;line-height:1.65;">${greet}</p>
    <p style="font-size:15px;line-height:1.65;">
      Your trial for <strong>${esc(institutionName)}</strong> has wrapped up. We hope you loved the week — and we
      hope at least one of your faculty had the kind of session with a Saathi that made them pause and think.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      <strong>Want to continue?</strong> Just reply to this email — we&apos;ll get you set up. No automated billing,
      no contract surprises. One short conversation and we&apos;ll roll your institution onto a membership that
      fits how your faculty and students actually use the platform.
    </p>
    <p style="font-size:15px;line-height:1.65;">
      If EdUsaathiAI isn&apos;t for you right now, that&apos;s okay too. Reply with anything you&apos;d like us to know —
      we read every word, and it genuinely helps us build better.
    </p>
    <div style="margin-top:26px;padding-top:14px;border-top:0.5px solid #E8E4DD;font-size:13px;color:#4A4740;">
      Warmly,<br/>
      <strong>Jaydeep Buch</strong><br/>
      Founder, EdUsaathiAI<br/>
      <a href="mailto:admin@edusaathiai.in" style="color:#B8860B;text-decoration:none;">admin@edusaathiai.in</a>
    </div>
  </div>
</body></html>`.trim();
}

/* ── Resend helper ──────────────────────────────────────────────────────── */

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.error('[education-institution-trial-check] RESEND_API_KEY missing — email skipped');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [to],
        subject,
        html,
        reply_to: 'admin@edusaathiai.in',
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error(`[education-institution-trial-check] Resend ${res.status} body=${detail.slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[education-institution-trial-check] Resend threw', err instanceof Error ? err.message : err);
    return false;
  }
}

/* ── Handler ────────────────────────────────────────────────────────────── */

serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  // Auth — service role OR CRON_SECRET (matches existing edge-function pattern)
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '').trim();
  const cronSecret = req.headers.get('x-cron-secret') ?? '';
  const isServiceRole = token === SUPABASE_SERVICE_ROLE_KEY;
  const isCron = Boolean(CRON_SECRET) && cronSecret === CRON_SECRET;
  if (!isServiceRole && !isCron) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Pull every trial whose end is within a conservative watch window. We
  // deliberately scan a few days on either side so a skipped run still catches
  // up — the sent-at columns prevent duplicate sends.
  const nowIso   = new Date().toISOString();
  const floorIso = new Date(Date.now() - 30 * DAY_MS).toISOString(); // 30 days expired still eligible for "trial ended" email once
  const ceilIso  = new Date(Date.now() +  5 * DAY_MS).toISOString(); // 5 days ahead covers day 5 window

  const { data: rows, error } = await admin
    .from('education_institutions')
    .select(
      'id, name, city, principal_name, principal_email, trial_ends_at, trial_day5_notified_at, trial_day7_notified_at',
    )
    .eq('status', 'trial')
    .not('trial_ends_at', 'is', null)
    .gte('trial_ends_at', floorIso)
    .lte('trial_ends_at', ceilIso);

  if (error) {
    console.error('[education-institution-trial-check] query failed:', error.message);
    return new Response(JSON.stringify({ error: 'query_failed' }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  const institutions = (rows ?? []) as EducationInstitutionRow[];

  let day5Sent = 0;
  let day7Sent = 0;
  let skipped = 0;

  for (const inst of institutions) {
    if (!inst.trial_ends_at) { skipped++; continue; }
    const days = daysUntil(inst.trial_ends_at);

    // Day 7 (expiry) — trial has ended (≤ 0 days) and we haven't sent it yet.
    if (days <= 0 && !inst.trial_day7_notified_at) {
      const ok = await sendEmail(
        inst.principal_email,
        'Your EdUsaathiAI trial has ended',
        day7Html(inst.principal_name, inst.name),
      );
      if (ok) {
        await admin
          .from('education_institutions')
          .update({ trial_day7_notified_at: nowIso })
          .eq('id', inst.id);
        day7Sent++;
      } else {
        skipped++;
      }
      continue; // If day 7 fired we don't also resend day 5
    }

    // Day 5 (reminder) — trial ends in 1–3 days and we haven't reminded yet.
    if (days >= 1 && days <= 3 && !inst.trial_day5_notified_at) {
      const ok = await sendEmail(
        inst.principal_email,
        'Your EdUsaathiAI trial ends in 2 days',
        day5Html(inst.principal_name, inst.name),
      );
      if (ok) {
        await admin
          .from('education_institutions')
          .update({ trial_day5_notified_at: nowIso })
          .eq('id', inst.id);
        day5Sent++;
      } else {
        skipped++;
      }
      continue;
    }

    skipped++;
  }

  const summary = {
    examined: institutions.length,
    day5_sent: day5Sent,
    day7_sent: day7Sent,
    skipped,
  };
  console.log('[education-institution-trial-check]', summary);

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
});
