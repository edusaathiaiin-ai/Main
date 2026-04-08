-- Migration 103: digest_sent_log
-- Idempotency guard for send-session-digest cron.
-- Prevents the same user+vertical+date digest from being sent twice.

CREATE TABLE IF NOT EXISTS digest_sent_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  date_ist    DATE NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_manual   BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (user_id, vertical_id, date_ist)
);

CREATE INDEX IF NOT EXISTS idx_digest_sent_log_user
  ON digest_sent_log (user_id, date_ist DESC);

ALTER TABLE digest_sent_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "digest_log_service" ON digest_sent_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "digest_log_admin" ON digest_sent_log
  FOR ALL USING (is_admin());
