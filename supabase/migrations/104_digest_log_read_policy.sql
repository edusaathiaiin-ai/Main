-- Migration 104: Add student read policy to digest_sent_log
CREATE POLICY IF NOT EXISTS "digest_log_read" ON digest_sent_log
  FOR SELECT USING (auth.uid() = user_id);
