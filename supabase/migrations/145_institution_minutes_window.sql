-- ═══════════════════════════════════════════════════════════════════════════════
-- 145 — Daily classroom-minutes window for education institutions (Phase I-2 Step 5)
--
-- Two pieces wire together to enforce the institution daily-minutes budget:
--
--   1. increment_institution_minutes RPC — atomic UPDATE that does both
--      the self-healing reset (when daily_reset_date != p_today_ist) and
--      the increment in a single statement. Eliminates the read-then-write
--      race that would otherwise let two faculty sessions ending in the
--      same instant double-count or stomp each other's writes.
--
--   2. cron-institution-window-reset — backup midnight reset for
--      institutions with no activity that day. The self-healing logic
--      in this RPC and in /api/classroom/check-institution-window means
--      the cron is only needed to keep daily_reset_date tidy on quiet
--      days; otherwise the next-morning read or write corrects itself.
--
-- Idempotent. Re-runnable: CREATE OR REPLACE on the function, unschedule-then-
-- schedule on the cron. Wrapped in a transaction so a partial apply is
-- impossible.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Atomic increment / self-healing reset RPC ────────────────────────────
--
-- Called from /api/classroom/archive-session after a session ends. The
-- archive-session handler verifies the caller is faculty of the session
-- before invoking, so authorisation is already enforced upstream — this
-- function trusts its inputs and runs as SECURITY DEFINER to bypass RLS
-- for the single-row UPDATE.
--
-- p_today_ist is computed by the caller in JS rather than NOW() inside
-- the function so the report and the writer share an identical IST date
-- view (avoids edge cases where the function and the API disagree about
-- "today" near midnight).

CREATE OR REPLACE FUNCTION public.increment_institution_minutes(
  p_institution_id uuid,
  p_add_minutes    int,
  p_today_ist      date
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.education_institutions
  SET
    daily_minutes_used = CASE
      WHEN daily_reset_date = p_today_ist
      THEN COALESCE(daily_minutes_used, 0) + p_add_minutes
      ELSE p_add_minutes
    END,
    daily_reset_date = p_today_ist,
    updated_at = now()
  WHERE id = p_institution_id;
END;
$$;

COMMENT ON FUNCTION public.increment_institution_minutes(uuid, int, date) IS
  'Atomic minutes-used increment with self-healing reset. Phase I-2 Step 5. '
  'Caller must verify authorisation before invoking — function trusts inputs.';

-- Service-role only — the archive-session handler creates a service-role
-- client specifically for this call. We deliberately do NOT grant to
-- authenticated/anon: a logged-in user must not be able to bump arbitrary
-- institutions' minute counters by guessing their UUID.
GRANT EXECUTE ON FUNCTION public.increment_institution_minutes(uuid, int, date)
  TO service_role;

-- ── 2. Midnight-IST reset cron ──────────────────────────────────────────────
--
-- Backup only. The check-institution-window route and the increment RPC
-- both self-heal when daily_reset_date != today_ist. This cron exists so
-- that institutions with NO activity on a given day still see a clean
-- daily_reset_date the next morning — purely cosmetic (admin dashboards,
-- ad-hoc SQL inspection) but it keeps the column meaningful.

DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('cron-institution-window-reset'); EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'cron-institution-window-reset',
  '30 18 * * *',  -- 18:30 UTC = 00:00 IST midnight
  $$
    UPDATE public.education_institutions
    SET daily_minutes_used = 0,
        daily_reset_date   = (now() AT TIME ZONE 'Asia/Kolkata')::date,
        updated_at         = now()
    WHERE status IN ('trial', 'active');
  $$
);

COMMIT;
