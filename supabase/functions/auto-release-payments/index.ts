/**
 * supabase/functions/auto-release-payments/index.ts
 *
 * Cron — runs weekly on Sunday at 9:00 AM IST (03:30 UTC).
 *
 * What it does:
 *   1. Finds faculty_sessions that are:
 *        - status = 'completed'
 *        - payout_status = 'pending'
 *        - updated_at older than 48 hours (grace window for disputes/refunds
 *          — matches the cooling-period philosophy)
 *   2. For each eligible session, calls the `release_faculty_payout(p_session_id,
 *      p_upi_id)` RPC (migration 084 + TDS fix in migration 113). The RPC is
 *      atomic and idempotent via the `payout_status` transition, so concurrent
 *      / repeat runs are safe.
 *   3. The RPC inserts a `faculty_payouts` row with `status='pending'`.
 *
 * Product decision (April 2026):
 *   - This cron does NOT send WhatsApp. T13 fires only when the admin flips
 *     the payout status to 'completed' after the actual UPI transfer. That
 *     is handled by the separate `mark-payout-completed` edge function.
 *   - This cron does NOT call any payout gateway. MVP is manual UPI —
 *     admin settles the transfer and records the bank_reference in the
 *     admin dashboard.
 *
 * Triggered by pg_cron — no JWT required.
 * Uses SUPABASE_CRON_SECRET (sent via `x-cron-secret` header) for basic
 * auth, matching the convention used by send-session-reminders, admin-digest,
 * health-monitor, etc.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET          = Deno.env.get('SUPABASE_CRON_SECRET')      ?? '';

const LOG = 'auto-release-payments';
const GRACE_HOURS = 48;

// Accept either auth style:
//   - Authorization: Bearer <service_role_key>  (pg_cron — migration 106 pattern)
//   - x-cron-secret: <SUPABASE_CRON_SECRET>     (manual ops / legacy pattern)
function authorised(req: Request): boolean {
  const bearer = req.headers.get('Authorization') ?? '';
  if (SUPABASE_SERVICE_KEY && bearer === `Bearer ${SUPABASE_SERVICE_KEY}`) return true;
  if (CRON_SECRET && req.headers.get('x-cron-secret') === CRON_SECRET)     return true;
  // If neither secret is set, fall open so local / first-run environments
  // aren't bricked. Production always has service-role key set.
  return !SUPABASE_SERVICE_KEY && !CRON_SECRET;
}

type EligibleSession = {
  id: string;
  faculty_id: string;
  faculty_payout_paise: number;
};

type RpcResult = {
  ok: boolean;
  error?: string;
  payout_id?: string;
  gross_paise?: number;
  net_paise?: number;
  tds_paise?: number;
  fy_cumulative_before?: number;
};

Deno.serve(async (req: Request) => {
  if (!authorised(req)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // ── Find eligible sessions ──────────────────────────────────────────────
  // We use updated_at as a proxy for completed_at — faculty_sessions doesn't
  // have an explicit completed_at column, and updated_at is refreshed on
  // the transition to status='completed'. If that proves loose (e.g. other
  // updates refresh it without being completions), we'll add an explicit
  // completed_at column in a future migration.
  const graceCutoff = new Date(Date.now() - GRACE_HOURS * 3_600_000).toISOString();

  const { data: eligible, error: queryError } = await admin
    .from('faculty_sessions')
    .select('id, faculty_id, faculty_payout_paise')
    .eq('status', 'completed')
    .eq('payout_status', 'pending')
    .lt('updated_at', graceCutoff);

  if (queryError) {
    console.error(`${LOG}: eligibility query failed —`, queryError.message);
    return new Response(
      JSON.stringify({ ok: false, error: queryError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const sessions = (eligible ?? []) as EligibleSession[];

  if (sessions.length === 0) {
    console.log(`${LOG}: no eligible sessions`);
    return new Response(
      JSON.stringify({ ok: true, eligible: 0, released: 0, errors: 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Release each session via the atomic RPC ─────────────────────────────
  let released = 0;
  let errors   = 0;
  const failures: Array<{ session_id: string; reason: string }> = [];

  for (const s of sessions) {
    try {
      const { data, error } = await admin.rpc('release_faculty_payout', {
        p_session_id: s.id,
        p_upi_id:     null,   // RPC falls back to faculty_profiles.payout_upi_id
      });

      if (error) {
        errors++;
        failures.push({ session_id: s.id, reason: error.message });
        console.error(`${LOG}: RPC error for session ${s.id} —`, error.message);
        continue;
      }

      const result = (data ?? {}) as RpcResult;
      if (!result.ok) {
        // Expected non-error outcomes (e.g. already_released if two cron runs
        // overlap). Count as "handled", not an error.
        console.log(`${LOG}: session ${s.id} skipped — ${result.error}`);
        continue;
      }

      released++;
      console.log(
        `${LOG}: released session ${s.id} — gross=${result.gross_paise} tds=${result.tds_paise} net=${result.net_paise}`,
      );
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      failures.push({ session_id: s.id, reason: msg });
      console.error(`${LOG}: exception for session ${s.id} —`, msg);
    }
  }

  console.log(
    `${LOG}: done — eligible=${sessions.length} released=${released} errors=${errors}`,
  );

  return new Response(
    JSON.stringify({
      ok:       true,
      eligible: sessions.length,
      released,
      errors,
      failures,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
