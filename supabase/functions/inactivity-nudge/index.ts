/**
 * supabase/functions/inactivity-nudge/index.ts
 *
 * Daily cron — 10:00 AM IST (04:30 UTC).
 *
 * Finds paid students inactive for 7+ days who have a wa_phone
 * and haven't been nudged in the last 30 days, then sends:
 *   T18 — edusaathiai_come_back (MARKETING)
 *   {{1}} firstName
 *   {{2}} last topic (top_topics[0])
 *
 * Idempotency: inserts into inactivity_nudges_sent after each send.
 * Auth: x-cron-secret header (matches all other crons in this project).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendWhatsAppTemplate, stripPhone, firstName } from '../_shared/whatsapp.ts';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('CRON_SECRET') ?? '';

const LOG = 'inactivity-nudge';

Deno.serve(async (req: Request) => {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  if (CRON_SECRET) {
    const cronHeader = req.headers.get('x-cron-secret') ?? '';
    if (cronHeader !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  let sent   = 0;
  let errors = 0;

  // ── Query inactive paid students with wa_phone ────────────────────────────────
  const { data: rows, error: queryErr } = await admin.rpc('get_inactive_wa_students');

  // Fallback: inline query if RPC doesn't exist
  const students = rows ?? await (async () => {
    const { data, error } = await admin
      .from('profiles')
      .select(`
        id, full_name, wa_phone, plan_id,
        student_soul!inner(top_topics, last_session_date)
      `)
      .not('wa_phone', 'is', null)
      .neq('plan_id', 'free')
      .lt('student_soul.last_session_date', new Date(Date.now() - 7 * 24 * 3_600_000).toISOString());

    if (error) {
      console.error(`${LOG}: query failed`, error.message);
      return [];
    }

    // Filter out users nudged in the last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
    const { data: recentNudges } = await admin
      .from('inactivity_nudges_sent')
      .select('user_id')
      .gt('sent_at', thirtyDaysAgo);

    const recentSet = new Set((recentNudges ?? []).map((r: { user_id: string }) => r.user_id));
    return (data ?? []).filter((r: { id: string }) => !recentSet.has(r.id));
  })();

  if (queryErr) {
    console.error(`${LOG}: query error`, queryErr);
  }

  // ── Send T18 to each student ───────────────────────────────────────────────
  for (const row of (students ?? []) as Record<string, unknown>[]) {
    try {
      const waPhone   = row.wa_phone as string | null;
      const fullName  = (row.full_name as string | null) ?? 'Student';
      const soul      = row.student_soul as Record<string, unknown> | null;
      const topTopics = (soul?.top_topics as string[] | null) ?? [];
      const lastTopic = topTopics[0] ?? 'your last topic';
      const userId    = row.id as string;

      if (!waPhone) continue;

      const ok = await sendWhatsAppTemplate({
        templateName: 'edusaathiai_come_back',
        to: stripPhone(waPhone),
        params: [firstName(fullName), lastTopic],
        logPrefix: LOG,
      });

      if (ok) {
        // Record nudge — prevents re-send within 30 days
        await admin.from('inactivity_nudges_sent').insert({
          user_id: userId,
          sent_at: new Date().toISOString(),
        });
        sent++;
      } else {
        errors++;
      }
    } catch (err) {
      console.error(`${LOG}: failed for user ${row.id}`, err instanceof Error ? err.message : err);
      errors++;
    }
  }

  console.log(`${LOG}: done — sent=${sent}, errors=${errors}`);

  return new Response(
    JSON.stringify({ ok: true, sent, errors }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
