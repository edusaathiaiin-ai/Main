-- ────────────────────────────────────────────────────────────────────────
-- 138_cron_institution_trial_check.sql
--
-- Schedule the daily institution trial-reminder cron.
--
-- Runs every day at 3:30 AM UTC (9:00 AM IST) and calls the
-- institution-trial-check Edge Function, which sends Day 5 / Day 7
-- conversational emails to principals whose trial is ending or has ended.
--
-- 9 AM IST landing time is deliberate — principals open email over morning
-- chai, the message arrives fresh rather than at 2 AM overnight.
--
-- Same auth pattern as migration 114: Authorization: Bearer <service_role>.
-- ────────────────────────────────────────────────────────────────────────

-- Unschedule any prior registration so this migration is re-runnable.
DO $$
BEGIN
  PERFORM cron.unschedule('cron-institution-trial-check');
EXCEPTION WHEN OTHERS THEN
  NULL;  -- job didn't exist; ignore
END
$$;

SELECT cron.schedule(
  'cron-institution-trial-check',
  '30 3 * * *',                   -- 03:30 UTC = 09:00 IST, daily
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/institution-trial-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
