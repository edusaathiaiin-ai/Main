-- ────────────────────────────────────────────────────────────────────────
-- 114_cron_auto_release_payments.sql
--
-- Schedule the weekly faculty payout release cron.
--
-- Runs every Sunday at 9:00 AM IST (03:30 UTC) and calls the
-- auto-release-payments Edge Function, which then iterates eligible
-- sessions and invokes release_faculty_payout() (migration 084 + 113).
--
-- Same auth pattern as migration 106: Authorization: Bearer <service_role>.
-- No x-cron-secret header needed — the function accepts both.
-- ────────────────────────────────────────────────────────────────────────

-- Unschedule any prior registration so this migration is re-runnable
-- without "cron job already exists" errors.
DO $$
BEGIN
  PERFORM cron.unschedule('cron-auto-release-payments');
EXCEPTION WHEN OTHERS THEN
  -- Job didn't exist; ignore.
  NULL;
END
$$;

SELECT cron.schedule(
  'cron-auto-release-payments',
  '30 3 * * 0',                   -- Sunday 03:30 UTC = 09:00 IST
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/auto-release-payments',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
