/*
  Migration: 051_weekly_letter_tracking
  Purpose: Track when each user last received their weekly Saathi letter
           to prevent duplicate sends and enable cron-safe idempotency.
*/

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_letter_sent_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.profiles.last_letter_sent_at IS
  'Timestamp of last weekly Saathi letter sent. Used to prevent duplicate sends within 6 days.';
