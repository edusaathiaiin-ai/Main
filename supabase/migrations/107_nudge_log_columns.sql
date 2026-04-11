-- Migration 107: Add missing columns to nudge_log
-- nudge_log was created with only id, template_id, segment, reach, sent_by, sent_at
-- NudgeBuilder needs: message, channels, status, scheduled_at

ALTER TABLE public.nudge_log
  ADD COLUMN IF NOT EXISTS message      TEXT,
  ADD COLUMN IF NOT EXISTS channels     TEXT,           -- JSON string e.g. '["email","inapp"]'
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Update sent_at default — keep existing rows untouched
-- status: pending | sending | sent | failed
