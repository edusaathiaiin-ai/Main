-- ═══════════════════════════════════════════════════════
-- Faculty Sessions — Reminder Idempotency Columns
-- Closes the gap called out in CLAUDE.md Section 26.
-- send-session-reminders edge function will fan out 24h
-- and 1h reminders for faculty_sessions (1:1 bookings via
-- Faculty Finder) using these flags to avoid duplicates.
-- ═══════════════════════════════════════════════════════

ALTER TABLE faculty_sessions
ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS reminder_sent_1h  BOOLEAN DEFAULT false NOT NULL;

-- Partial index for the cron query: rows that still need reminders
-- and have a confirmed slot. Keeps the index tiny.
CREATE INDEX IF NOT EXISTS idx_faculty_sessions_reminder_due
  ON faculty_sessions (confirmed_slot)
  WHERE confirmed_slot IS NOT NULL
    AND status IN ('paid', 'confirmed')
    AND (reminder_sent_24h = false OR reminder_sent_1h = false);
