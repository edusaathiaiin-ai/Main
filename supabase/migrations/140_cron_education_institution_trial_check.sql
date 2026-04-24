-- ────────────────────────────────────────────────────────────────────────
-- 140_cron_education_institution_trial_check.sql
--
-- Follows the rename in migration 139 (institutions → education_institutions).
-- The old cron job `cron-institution-trial-check` (migration 138) called an
-- edge function that's been renamed. Unschedule the old, schedule the new.
--
-- Runs daily at 03:30 UTC = 09:00 IST — principals read trial emails over
-- morning chai, not at 2 AM.
-- ────────────────────────────────────────────────────────────────────────

-- Unschedule the prior job + any earlier run of this one so the migration is
-- re-runnable without "cron job already exists" errors.
DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('cron-institution-trial-check');           EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('cron-education-institution-trial-check'); EXCEPTION WHEN OTHERS THEN NULL; END;
END
$$;

SELECT cron.schedule(
  'cron-education-institution-trial-check',
  '30 3 * * *',                   -- 03:30 UTC = 09:00 IST, daily
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/education-institution-trial-check',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
