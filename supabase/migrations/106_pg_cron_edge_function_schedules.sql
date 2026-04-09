-- ============================================================================
-- Migration 106: pg_cron schedules for all Edge Functions
-- ============================================================================
--
-- All cron jobs authenticate via Authorization: Bearer <service_role_key>.
-- Each Edge Function accepts this as an alternative to x-cron-secret.
-- No manual prerequisite needed — service_role_key is already available
-- via current_setting('app.service_role_key') on Supabase.
-- ============================================================================

-- Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pg_net   WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron  WITH SCHEMA cron;


-- ── 1. rss-fetch — daily 6:00 AM IST (00:30 UTC) ───────────────────────────

SELECT cron.schedule(
  'cron-rss-fetch',
  '30 0 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/rss-fetch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 2. admin-digest (daily) — 8:00 AM IST (02:30 UTC) ──────────────────────

SELECT cron.schedule(
  'cron-admin-digest-daily',
  '30 2 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/admin-digest',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{"mode":"daily"}'::jsonb
    );
  $$
);


-- ── 3. admin-digest (weekly) — Monday 9:00 AM IST (03:30 UTC) ──────────────

SELECT cron.schedule(
  'cron-admin-digest-weekly',
  '30 3 * * 1',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/admin-digest',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{"mode":"weekly"}'::jsonb
    );
  $$
);


-- ── 4. send-session-digest — 10:00 PM IST (16:30 UTC) ──────────────────────

SELECT cron.schedule(
  'cron-send-session-digest',
  '30 16 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/send-session-digest',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 5. quota-reset — midnight IST (18:30 UTC previous day) ─────────────────

SELECT cron.schedule(
  'cron-quota-reset',
  '30 18 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/quota-reset',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 6. subscription-lifecycle — 7:30 AM IST (02:00 UTC) ────────────────────

SELECT cron.schedule(
  'cron-subscription-lifecycle',
  '0 2 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/subscription-lifecycle',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 7. resume-subscription — 8:30 AM IST (03:00 UTC) ───────────────────────

SELECT cron.schedule(
  'cron-resume-subscription',
  '0 3 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/resume-subscription',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 8. weekly-letter — Sunday 8:00 AM IST (02:30 UTC) ──────────────────────

SELECT cron.schedule(
  'cron-weekly-letter',
  '30 2 * * 0',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/weekly-letter',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 9. health-monitor — every hour ──────────────────────────────────────────

SELECT cron.schedule(
  'cron-health-monitor',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/health-monitor',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 10. eval-flagged — every 6 hours ────────────────────────────────────────

SELECT cron.schedule(
  'cron-eval-flagged',
  '0 */6 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/eval-flagged',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);


-- ── 11. process-dpdp-request — 2:00 AM IST (20:30 UTC previous day) ────────

SELECT cron.schedule(
  'cron-process-dpdp-request',
  '30 20 * * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/process-dpdp-request',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
