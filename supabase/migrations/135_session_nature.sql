-- ═══════════════════════════════════════════════════════════════════════════════
-- 135 — session_nature across Live, Classroom, and 1:1 surfaces
--
-- Three natures the platform will distinguish, cutting across every session
-- surface (public live_sessions, in-app classroom_* tooling that also sits on
-- live_sessions, and 1:1 faculty_sessions):
--   curriculum       — syllabus-aligned teaching, the default
--   broader_context  — connects the topic to society, industry, history, policy
--   story            — quiet-TA mode, amber chrome, faculty shares a personal /
--                      subject narrative (see CLAUDE.md parked notes)
--
-- Column is named `session_nature` (not `session_type`) because
-- faculty_sessions already has a `session_type` column with a different
-- meaning (booking-flow status: 'requested' / 'proposed' / …). Naming the
-- new concept differently prevents silent semantic drift and keeps both
-- readable.
--
-- Classroom note: no separate classroom_sessions table exists — classroom
-- mode is a delivery config on live_sessions (see migration 126). Adding
-- session_nature to live_sessions therefore covers both Live and Classroom
-- surfaces with one column.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Surface 1 + 2: live_sessions (public live lectures + in-app classroom)
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS session_nature TEXT
    DEFAULT 'curriculum'
    CHECK (session_nature IN ('curriculum', 'broader_context', 'story'));

-- Surface 3: faculty_sessions (1:1 private Faculty-Finder bookings)
ALTER TABLE public.faculty_sessions
  ADD COLUMN IF NOT EXISTS session_nature TEXT
    DEFAULT 'curriculum'
    CHECK (session_nature IN ('curriculum', 'broader_context', 'story'));

-- Index for filtering live_sessions by nature (admin dashboards, analytics,
-- Story-mode UI branching). faculty_sessions stays small enough that a
-- seq-scan on nature is fine; skip the index there.
CREATE INDEX IF NOT EXISTS idx_live_sessions_nature
  ON public.live_sessions(session_nature);
