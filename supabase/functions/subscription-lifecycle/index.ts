/**
 * supabase/functions/subscription-lifecycle/index.ts
 *
 * Daily cron (7:00 AM IST / 01:30 UTC) that handles:
 *   1. Renewal reminder — 3 days before subscription_expires_at
 *   2. Auto-expiry      — downgrade expired subscriptions to free
 *   3. Expiry notification email
 *
 * Triggered by pg_cron via Supabase Dashboard schedule.
 * Uses service role — no user JWT required.
 *
 * Idempotent: uses renewal_reminders_sent table to avoid duplicate emails.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, fmtDate } from '../_shared/whatsapp.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM          = Deno.env.get('RESEND_FROM_EMAIL') ?? 'EdUsaathiAI <noreply@edusaathiai.in>';

const PLAN_LABELS: Record<string, string> = {
  'plus-monthly':     'Saathi Plus (Monthly)',
  'plus-annual':      'Saathi Plus (Annual)',
  'pro-monthly':      'Saathi Pro (Monthly)',
  'pro-annual':       'Saathi Pro (Annual)',
  'unlimited-monthly': 'Saathi Unlimited',
  'institution':      'Institution',
};

// ── Email senders ─────────────────────────────────────────────────────────────

async function sendRenewalReminder(
  email: string,
  name: string,
  planLabel: string,
  expiresAt: string,
): Promise<boolean> {
  if (!RESEND_API_KEY || !email) return false;

  const expiryDate = new Date(expiresAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Your ${planLabel} is active until ${expiryDate} — renew to continue`,
        html: `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
  <h1 style="color:#C9993A;font-size:22px;margin-bottom:8px">Your plan expires soon</h1>
  <p style="color:rgba(255,255,255,0.7);line-height:1.7">
    Hi ${name}, your <strong>${planLabel}</strong> is active until
    <strong>${expiryDate}</strong>. To continue without interruption, renew before that date.
  </p>
  <a href="https://www.edusaathiai.in/pricing"
     style="display:inline-block;margin-top:16px;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
    Renew for ₹99 →
  </a>
  <p style="color:rgba(255,255,255,0.35);font-size:12px;margin-top:20px;line-height:1.7">
    Your Saathi memory and learning history are always preserved, regardless of plan changes.<br>
    Questions? Reply to this email or write to support@edusaathiai.in
  </p>
</div>
        `,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('subscription-lifecycle: renewal reminder email failed', err instanceof Error ? err.message : err);
    return false;
  }
}

async function sendExpiredEmail(
  email: string,
  name: string,
  planLabel: string,
  expiresAt: string,
): Promise<boolean> {
  if (!RESEND_API_KEY || !email) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [email],
        reply_to: 'support@edusaathiai.in',
        subject: `Your ${planLabel} has expired — your Saathi is waiting`,
        html: `
<div style="font-family:'DM Sans',Arial,sans-serif;max-width:500px;margin:0 auto;background:#0B1F3A;color:#fff;padding:40px;border-radius:16px">
  <h1 style="color:#C9993A;font-size:22px;margin-bottom:8px">Your plan has expired</h1>
  <p style="color:rgba(255,255,255,0.7);line-height:1.7">
    Hi ${name}, your <strong>${planLabel}</strong> expired on <strong>${new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
    Your learning journey and soul memory are safe — tap below to continue.
  </p>
  <a href="https://www.edusaathiai.in/pricing"
     style="display:inline-block;margin-top:16px;background:#C9993A;color:#0B1F3A;padding:13px 32px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">
    Resubscribe for ₹99 →
  </a>
  <p style="color:rgba(255,255,255,0.35);font-size:12px;margin-top:20px;line-height:1.7">
    Questions? Reply to this email or write to support@edusaathiai.in
  </p>
</div>
        `,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error('subscription-lifecycle: expired email failed', err instanceof Error ? err.message : err);
    return false;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (_req: Request) => {
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const now   = new Date();
  const stats = { reminders_sent: 0, expired: 0, errors: 0 };

  try {
    // ── 1. Renewal reminders (3 days before expiry) ─────────────────────────
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: soonExpiring } = await admin
      .from('profiles')
      .select('id, email, full_name, display_name, plan_id, subscription_expires_at, wa_phone')
      .eq('subscription_status', 'active')
      .neq('plan_id', 'free')
      .not('subscription_expires_at', 'is', null)
      .lte('subscription_expires_at', threeDaysFromNow)
      .gt('subscription_expires_at', now.toISOString());

    for (const row of (soonExpiring ?? [])) {
      const profile = row as {
        id: string; email: string; full_name: string | null;
        display_name: string | null; plan_id: string;
        subscription_expires_at: string; wa_phone: string | null;
      };

      // Check if reminder already sent for this expiry period
      const { data: alreadySent } = await admin
        .from('renewal_reminders_sent')
        .select('id')
        .eq('user_id', profile.id)
        .eq('reminder_type', '3_day')
        .eq('expires_at', profile.subscription_expires_at)
        .maybeSingle();

      if (alreadySent) continue;

      const planLabel = PLAN_LABELS[profile.plan_id] ?? profile.plan_id;
      const name      = (profile.full_name ?? profile.display_name ?? 'Student').split(' ')[0];

      const sent = await sendRenewalReminder(
        profile.email,
        name,
        planLabel,
        profile.subscription_expires_at,
      );

      // T16 — edusaathiai_renewal_reminder
      // {{1}} firstName, {{2}} plan label, {{3}} expiry date as "14 April 2026"
      if (profile.wa_phone) {
        void sendWhatsAppTemplate({
          templateName: 'edusaathiai_renewal_reminder',
          to: stripPhone(profile.wa_phone),
          params: [name, planLabel, fmtDate(profile.subscription_expires_at)],
          logPrefix: 'subscription-lifecycle',
        });
      }

      if (sent) {
        await admin.from('renewal_reminders_sent').insert({
          user_id:       profile.id,
          reminder_type: '3_day',
          expires_at:    profile.subscription_expires_at,
        });
        stats.reminders_sent++;
      } else {
        stats.errors++;
      }
    }

    // ── 2. Expire overdue subscriptions ─────────────────────────────────────
    const { data: expired } = await admin
      .from('profiles')
      .select('id, email, full_name, display_name, plan_id, subscription_expires_at, wa_phone')
      .eq('subscription_status', 'active')
      .neq('plan_id', 'free')
      .not('subscription_expires_at', 'is', null)
      .lt('subscription_expires_at', now.toISOString());

    for (const row of (expired ?? [])) {
      const profile = row as {
        id: string; email: string; full_name: string | null;
        display_name: string | null; plan_id: string;
        subscription_expires_at: string; wa_phone: string | null;
      };

      // Downgrade to free — soul data preserved
      await admin.from('profiles').update({
        plan_id:                 'free',
        subscription_status:     'expired',
        subscription_expires_at: null,
      }).eq('id', profile.id);

      // Check if expiry notifications already sent
      const { data: alreadySent } = await admin
        .from('renewal_reminders_sent')
        .select('id')
        .eq('user_id', profile.id)
        .eq('reminder_type', 'expired')
        .eq('expires_at', profile.subscription_expires_at)
        .maybeSingle();

      if (!alreadySent) {
        const planLabel = PLAN_LABELS[profile.plan_id] ?? profile.plan_id;
        const name      = (profile.full_name ?? profile.display_name ?? 'Student').split(' ')[0];

        const sent = await sendExpiredEmail(profile.email, name, planLabel, profile.subscription_expires_at);

        // T17 — edusaathiai_plan_expired
        // {{1}} firstName, {{2}} expiry date as "14 April 2026"
        if (profile.wa_phone) {
          void sendWhatsAppTemplate({
            templateName: 'edusaathiai_plan_expired',
            to: stripPhone(profile.wa_phone),
            params: [name, fmtDate(profile.subscription_expires_at)],
            logPrefix: 'subscription-lifecycle',
          });
        }

        if (sent) {
          await admin.from('renewal_reminders_sent').insert({
            user_id:       profile.id,
            reminder_type: 'expired',
            expires_at:    profile.subscription_expires_at,
          });
        }
      }

      stats.expired++;
    }

    // ── 3. Update cron_job_log ──────────────────────────────────────────────
    await admin.from('cron_job_log').update({
      last_run_at:      now.toISOString(),
      status:           'ok',
      records_affected: stats.reminders_sent + stats.expired,
      updated_at:       now.toISOString(),
    }).eq('job_id', 'subscription-lifecycle');

    console.log(`subscription-lifecycle: done — ${stats.reminders_sent} reminders, ${stats.expired} expired, ${stats.errors} errors`);

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    console.error('subscription-lifecycle: fatal error:', message);

    await admin.from('cron_job_log').update({
      last_run_at: now.toISOString(),
      status:      'error',
      updated_at:  now.toISOString(),
    }).eq('job_id', 'subscription-lifecycle');

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
