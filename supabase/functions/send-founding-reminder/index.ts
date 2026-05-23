/**
 * supabase/functions/send-founding-reminder/index.ts
 *
 * Daily cron — ~09:30 AM IST.
 *
 * "Be deliberate" comms, surface 4. Every free account gets a 7-day founding
 * week: all 5 Saathi modes, 10 chats each. On day 8 it steps down to the free
 * plan — Study Notes + Citizen Guide, 5 chats each. A silent step-down reads
 * as "why did my chats shrink / what broke", so this sends a warm heads-up
 * on ~day 5 (2 days' notice) explaining exactly what changes.
 *
 * Finds free profiles created 5–7 days ago that haven't been emailed yet,
 * and sends a Resend email. The 5–7 day range (rather than exactly 5) makes
 * the cron resilient to a missed run; founding_reminder_sent_at guarantees
 * exactly one send per user.
 *
 * Auth: x-cron-secret header — matches the other crons in this project.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('CRON_SECRET') ?? '';
const RESEND_API_KEY       = Deno.env.get('RESEND_API_KEY') ?? '';
const RESEND_FROM          = Deno.env.get('RESEND_FROM_EMAIL') ?? 'noreply@edusaathiai.in';

const LOG    = 'send-founding-reminder';
const DAY_MS = 24 * 60 * 60 * 1000;

Deno.serve(async (req: Request) => {
  // ── Auth — cron secret (gateway verify_jwt is off; this is the real gate) ──
  if (CRON_SECRET) {
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    if (cronHeader !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let sent = 0, skipped = 0, errors = 0;

  const now          = Date.now();
  const fiveDaysAgo  = new Date(now - 5 * DAY_MS).toISOString();
  const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();

  // Founding week is 7 days. Email on day 5 → created 5–7 days ago, still
  // inside the window, not yet emailed.
  const { data: rows, error: queryErr } = await admin
    .from('profiles')
    .select(
      'id, full_name, email, plan_id, created_at, founding_reminder_sent_at, ' +
      'verticals!profiles_primary_saathi_id_fkey(name)',
    )
    .lte('created_at', fiveDaysAgo)
    .gt('created_at', sevenDaysAgo)
    .is('founding_reminder_sent_at', null)
    .not('email', 'is', null);

  if (queryErr) {
    console.error(`${LOG}: query failed`, queryErr.message);
    return new Response(JSON.stringify({ error: 'query_failed' }), { status: 500 });
  }

  for (const row of (rows ?? []) as Record<string, unknown>[]) {
    const userId = row.id as string;
    try {
      // Free accounts only — someone who already upgraded doesn't need this.
      const planId = (row.plan_id as string | null) ?? 'free';
      if (planId !== 'free') { skipped++; continue; }

      const email = row.email as string | null;
      if (!email) { skipped++; continue; }

      if (!RESEND_API_KEY) {
        console.error(`${LOG}: RESEND_API_KEY not set`);
        errors++;
        continue;
      }

      const name       = (row.full_name as string | null)?.split(' ')[0] ?? 'there';
      const saathiName = (row.verticals as { name?: string } | null)?.name ?? null;

      // Days left in the 7-day founding window (≥ 1).
      const createdMs = new Date(row.created_at as string).getTime();
      const daysLeft  = Math.max(1, Math.ceil((createdMs + 7 * DAY_MS - now) / DAY_MS));

      const subject =
        `${daysLeft} day${daysLeft === 1 ? '' : 's'} left of your founding week` +
        (saathiName ? ` with ${saathiName}` : '');

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: `EdUsaathiAI <${RESEND_FROM}>`,
          to: [email],
          subject,
          html: buildHtml(name, saathiName, daysLeft),
        }),
      });

      if (!res.ok) {
        console.error(`${LOG}: Resend error`, res.status, await res.text());
        errors++;
        continue;
      }

      // Mark sent — idempotency, one founding reminder per user ever.
      await admin
        .from('profiles')
        .update({ founding_reminder_sent_at: new Date().toISOString() })
        .eq('id', userId);
      sent++;
    } catch (err) {
      console.error(`${LOG}: failed for ${userId}`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  console.log(`${LOG}: done — sent=${sent}, skipped=${skipped}, errors=${errors}`);
  return new Response(
    JSON.stringify({ ok: true, sent, skipped, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});

// ── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(name: string, saathiName: string | null, daysLeft: number): string {
  const saathi   = saathiName ?? 'your Saathi';
  const dayLabel = `${daysLeft} day${daysLeft === 1 ? '' : 's'}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background:#060F1D; font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#060F1D; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#0B1F3A; border-radius:16px; overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 24px; text-align:center; border-bottom:1px solid rgba(201,153,58,0.2);">
              <h1 style="margin:0; font-size:28px; color:#C9993A; font-weight:700; letter-spacing:-0.5px;">
                EdUsaathiAI
              </h1>
              <p style="margin:8px 0 0; font-size:13px; color:rgba(255,255,255,0.4); letter-spacing:1px;">
                UNIFIED SOUL PARTNERSHIP
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <h2 style="margin:0 0 16px; font-size:22px; color:#FFFFFF; font-weight:600;">
                Hi ${name}, your founding week is almost up
              </h2>

              <p style="margin:0 0 20px; font-size:15px; color:rgba(255,255,255,0.75); line-height:1.7;">
                Your first week with <strong style="color:#C9993A;">${saathi}</strong> has been
                the full experience — all 5 Saathi modes, 10 chats each. In about
                <strong style="color:#C9993A;">${dayLabel}</strong>, your founding week wraps up
                and your free plan settles in. Here's the honest picture, so nothing
                takes you by surprise.
              </p>

              <!-- What stays free -->
              <p style="margin:0 0 8px; font-size:14px; color:#7FD99A; font-weight:600;">
                Always free — yours forever
              </p>
              <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:rgba(255,255,255,0.7); line-height:1.8;">
                <li><strong>Study Notes</strong> and <strong>Citizen Guide</strong> — 5 chats a day, each</li>
                <li>${saathi}'s memory of you — every session you've had, kept</li>
                <li>Daily subject news, the Community Board, a monthly Check-in</li>
              </ul>

              <!-- What becomes Plus -->
              <p style="margin:0 0 8px; font-size:14px; color:#C9993A; font-weight:600;">
                Becomes Plus
              </p>
              <ul style="margin:0 0 20px; padding-left:20px; font-size:14px; color:rgba(255,255,255,0.6); line-height:1.8;">
                <li>Exam Prep, Interest Explorer, and UPSC Saathi modes</li>
                <li>20 chats a day on every mode</li>
              </ul>

              <p style="margin:0 0 24px; font-size:15px; color:rgba(255,255,255,0.75); line-height:1.7;">
                Either way, ${saathi} doesn't forget you. Everything you've built together
                stays exactly where it is — pick up where you left off, any day, free.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:8px 0 12px;">
                <tr>
                  <td style="background:#C9993A; border-radius:10px; padding:14px 32px;">
                    <a href="https://edusaathiai.in/pricing" style="color:#0B1F3A; font-size:15px; font-weight:700; text-decoration:none; display:inline-block;">
                      Keep all 5 modes — Plus is ₹99/mo →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px; font-size:13px; color:rgba(255,255,255,0.4); line-height:1.6;">
                No pressure — the free plan is genuinely yours to keep. This is just
                so day 8 is never a surprise.
              </p>

              <p style="margin:0; font-size:13px; color:rgba(255,255,255,0.35); line-height:1.6; font-style:italic;">
                "You are not just answering questions. You are shaping a future."
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px; text-align:center; border-top:1px solid rgba(201,153,58,0.15);">
              <p style="margin:0; font-size:12px; color:rgba(255,255,255,0.25); line-height:1.6;">
                <a href="https://edusaathiai.in" style="color:#C9993A; text-decoration:none;">edusaathiai.in</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
}
