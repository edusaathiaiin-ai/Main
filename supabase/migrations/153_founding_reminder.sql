-- ═══════════════════════════════════════════════════════════════════════════════
-- 153 — Founding-week reminder ("be deliberate" comms, surface 4)
--
-- Every free account gets a 7-day founding week: all 5 Saathi modes, 10 chats
-- each. On day 8 it steps down to the free plan (Study Notes + Citizen Guide,
-- 5 chats each). The send-founding-reminder edge function emails a warm
-- heads-up on ~day 5 so the step-down is expected, never a surprise.
--
-- This migration adds the idempotency marker only — one founding reminder per
-- user, ever (parallels the existing profiles.welcome_email_sent flag).
--
-- THE CRON IS REGISTERED IN THE DB, NOT HERE. pg_cron jobs in this project
-- carry a hardcoded x-cron-secret literal in their command (see
-- cron-quota-reset, cron-rss-fetch) — that secret must not enter version
-- control, and the `current_setting('app.cron_secret')` GUC approach is not
-- reliably readable at apply time. The job `cron-send-founding-reminder`
-- (daily, 04:00 UTC / 09:30 IST → /functions/v1/send-founding-reminder) is
-- therefore created out-of-band via cron.schedule with the shared cron
-- secret, exactly like the other crons. If the DB is ever rebuilt, recreate
-- it the same way.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS founding_reminder_sent_at timestamptz;
