-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 137: institution trial notification tracking
--
-- Adds two idempotency columns so the daily cron (institution-trial-check)
-- can safely run once per day without re-sending Day 5 / Day 7 emails.
-- Both start NULL; are set to NOW() the moment the matching email is sent.
-- Never reset — the trial expires only once, and re-trials are rare.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS trial_day5_notified_at TIMESTAMPTZ;

ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS trial_day7_notified_at TIMESTAMPTZ;

-- Partial index so the cron's "find trials ending in ~2 days" scan is cheap.
CREATE INDEX IF NOT EXISTS idx_institutions_trial_active
  ON public.institutions (trial_ends_at)
  WHERE status = 'trial';
