-- ────────────────────────────────────────────────────────────────────────
-- 111_whatsapp_session_state.sql
--
-- Session-level wa_state for guest account linking flow.
--
-- Today: profiles.wa_state tracks 'selecting_saathi' / 'active' for
-- registered users. Guests (no profile row) have nowhere to record state,
-- so the new "would you like to link your existing edusaathiai account?"
-- conversational flow needs a session-scoped equivalent.
--
-- States used (extends the same enum vocabulary as profiles.wa_state):
--   active   — default; treat next message as a chat message
--   linking  — we just asked for an email; treat next message as either
--              an email (link account) or a chat message (skip linking)
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE whatsapp_sessions
  ADD COLUMN IF NOT EXISTS wa_state TEXT NULL DEFAULT 'active';

-- Existing rows are presumed active (they've been chatting fine until now).
UPDATE whatsapp_sessions SET wa_state = 'active' WHERE wa_state IS NULL;
