-- 149_exports_log.sql
-- DPDP audit trail for chat-conversation exports.
--
-- Phase 1.B of the chat-tools rollout adds three export paths from /chat:
-- PDF download, email (via Resend), WhatsApp share (wa.me URL + signed
-- Supabase storage link). All three log a row here so a student exercising
-- their DPDP "right to know what data left the system" gets a complete answer.
--
-- Indexed on user_id + created_at — typical access pattern is "show me my
-- own exports newest-first." No indexes on saathi_slug or recipient.

CREATE TABLE IF NOT EXISTS exports_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saathi_slug   text NOT NULL,
  export_type   text NOT NULL CHECK (export_type IN ('pdf', 'email', 'whatsapp')),
  recipient     text,                 -- email address when export_type='email'
  message_count integer NOT NULL DEFAULT 0,
  share_url     text,                 -- signed Supabase storage URL when applicable
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exports_log_user_created
  ON exports_log (user_id, created_at DESC);

ALTER TABLE exports_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exports_log_owner_select" ON exports_log;
CREATE POLICY "exports_log_owner_select" ON exports_log
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "exports_log_owner_insert" ON exports_log;
CREATE POLICY "exports_log_owner_insert" ON exports_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
