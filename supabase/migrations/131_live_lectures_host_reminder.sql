-- ═══════════════════════════════════════════════════════════════════════════════
-- 131 — T-10min host reminder column + cron schedule for send-session-reminders
--
-- Adds a third idempotency flag so the cron can send a "your session starts
-- in 10 minutes — please open your Meet link now" email to the faculty
-- without duplicate fires.
--
-- Also: schedules the existing send-session-reminders function to run every
-- 30 minutes (it wasn't scheduled at all — the 1h reminder window needs
-- frequent polling, daily was never going to work).
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.live_lectures
  ADD COLUMN IF NOT EXISTS host_reminder_sent BOOLEAN NOT NULL DEFAULT false;

-- ── Require meeting_link on published live_sessions ─────────────────────────
-- CHECK constraint: a published session MUST have a meeting_link set.
-- Drafts can still be saved without one. This catches any faculty who
-- somehow bypasses the client-side guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'live_sessions_published_meeting_link'
  ) THEN
    ALTER TABLE public.live_sessions
      ADD CONSTRAINT live_sessions_published_meeting_link
      CHECK (status <> 'published' OR (meeting_link IS NOT NULL AND length(trim(meeting_link)) > 10));
  END IF;
END $$;

-- ── Cron: every 30 min, call send-session-reminders Edge Function ───────────
-- pg_cron + pg_net pattern, matches other crons in this codebase.

DO $$
DECLARE
  v_project_ref text := 'vpmpuxosyrijknbxautx';
  v_secret      text := current_setting('app.cron_secret', true);
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  -- Unschedule if already exists so re-runs of this migration are idempotent
  PERFORM cron.unschedule('cron-send-session-reminders')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cron-send-session-reminders');

  PERFORM cron.schedule(
    'cron-send-session-reminders',
    '*/30 * * * *',   -- every 30 minutes
    format(
      $cmd$
      SELECT net.http_post(
        url := 'https://%s.supabase.co/functions/v1/send-session-reminders',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L,
          'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 30000
      );
      $cmd$,
      v_project_ref,
      COALESCE(v_secret, '')
    )
  );
END $$;
