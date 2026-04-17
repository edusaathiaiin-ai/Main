-- ═══════════════════════════════════════════════════════════════════════════════
-- 126 — Classroom Phase 1: schema additions for /classroom/[id]
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Extend live_sessions with classroom delivery config ──────────────────

ALTER TABLE live_sessions
  ADD COLUMN IF NOT EXISTS delivery_type     text NOT NULL DEFAULT 'external'
    CHECK (delivery_type IN ('external', 'in_app')),
  ADD COLUMN IF NOT EXISTS external_url      text,
  ADD COLUMN IF NOT EXISTS classroom_mode    text
    CHECK (classroom_mode IS NULL OR classroom_mode IN ('standard', 'interactive')),
  ADD COLUMN IF NOT EXISTS canvas_snapshot   jsonb,
  ADD COLUMN IF NOT EXISTS session_artifacts jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_tools   jsonb,
  ADD COLUMN IF NOT EXISTS started_at        timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at          timestamptz;

-- ── 2. Classroom participant presence ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS classroom_presence (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id         uuid        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id            uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role               text        NOT NULL CHECK (role IN ('faculty', 'student')),
  joined_at          timestamptz NOT NULL DEFAULT now(),
  left_at            timestamptz,
  device_type        text,
  connection_quality text,
  UNIQUE (session_id, user_id)
);

ALTER TABLE classroom_presence ENABLE ROW LEVEL SECURITY;

-- Students and faculty in the session can read presence
CREATE POLICY "session_participants_read_presence"
  ON classroom_presence FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM classroom_presence cp
      WHERE cp.session_id = classroom_presence.session_id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM live_sessions ls
      WHERE ls.id = classroom_presence.session_id
        AND ls.faculty_id = auth.uid()
    )
  );

-- Authenticated users can insert their own presence
CREATE POLICY "user_insert_own_presence"
  ON classroom_presence FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence (left_at)
CREATE POLICY "user_update_own_presence"
  ON classroom_presence FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_classroom_presence_session
  ON classroom_presence(session_id);

CREATE INDEX IF NOT EXISTS idx_classroom_presence_user
  ON classroom_presence(user_id);

-- ── 3. AI command bar history ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS classroom_commands (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  command_text    text        NOT NULL,
  tool_triggered  text,
  tool_query      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE classroom_commands ENABLE ROW LEVEL SECURITY;

-- Session participants can read commands
CREATE POLICY "session_participants_read_commands"
  ON classroom_commands FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classroom_presence cp
      WHERE cp.session_id = classroom_commands.session_id
        AND cp.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM live_sessions ls
      WHERE ls.id = classroom_commands.session_id
        AND ls.faculty_id = auth.uid()
    )
  );

-- Authenticated users can insert their own commands
CREATE POLICY "user_insert_own_commands"
  ON classroom_commands FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_classroom_commands_session
  ON classroom_commands(session_id, created_at);

-- ── 4. Test fixture for development ─────────────────────────────────────────
-- Insert a test session only if it doesn't exist yet.
-- Uses the first faculty profile found, or skips if none.
-- Delete this row before merging to main.

DO $$
DECLARE
  _faculty uuid;
  _vertical uuid;
BEGIN
  -- Grab any faculty user
  SELECT id INTO _faculty FROM profiles WHERE role = 'faculty' LIMIT 1;
  -- Grab KanoonSaathi vertical
  SELECT id INTO _vertical FROM verticals WHERE slug = 'kanoonsaathi' LIMIT 1;

  IF _faculty IS NOT NULL AND _vertical IS NOT NULL THEN
    INSERT INTO live_sessions (
      id, faculty_id, vertical_id, title, description,
      session_format, price_per_seat_paise, total_seats, seats_booked,
      min_seats, status, delivery_type, external_url, classroom_mode
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      _faculty, _vertical,
      'Classroom Phase 1 — Test Session',
      'A test session to verify the /classroom/[id] route during development. Delete before merging to main.',
      'single', 0, 50, 0, 1, 'published',
      'external',
      'https://meet.google.com/test-classroom-dev',
      'standard'
    )
    ON CONFLICT (id) DO NOTHING;

    -- Add one lecture row for the countdown timer
    INSERT INTO live_lectures (
      id, session_id, lecture_number, title,
      scheduled_at, duration_minutes, status
    ) VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000001',
      1, 'Lecture 1 — Introduction',
      now() + interval '1 hour', 60, 'scheduled'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
