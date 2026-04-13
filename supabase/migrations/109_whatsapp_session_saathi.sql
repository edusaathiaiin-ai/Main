-- ────────────────────────────────────────────────────────────────────────
-- 109_whatsapp_session_saathi.sql
--
-- Guest support on WhatsApp Saathi: store the chosen Saathi on the session
-- row itself so unregistered phones (no profiles row) can still pick and
-- chat with a specific Saathi.
--
-- Why: today the webhook only persists wa_saathi_id to profiles. If a phone
-- messages WA without first linking on edusaathiai.in, there is no profile
-- to write to, so the picker loops on every message. This column gives us
-- a session-level fallback the webhook can read from.
--
-- Precedence (enforced in code):
--   effective_saathi = profile.wa_saathi_id IF user is registered & linked
--                    ELSE whatsapp_sessions.wa_saathi_id
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS wa_saathi_id UUID NULL REFERENCES verticals(id);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_saathi
  ON whatsapp_sessions(wa_saathi_id)
  WHERE wa_saathi_id IS NOT NULL;
