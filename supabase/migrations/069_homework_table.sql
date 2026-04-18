-- Migration 069: Homework table for classroom sessions
-- Faculty assigns homework during live sessions; sent via WhatsApp after session ends.

CREATE TABLE IF NOT EXISTS homework (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid        NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  faculty_id      uuid        NOT NULL REFERENCES profiles(id),
  student_name    text        NOT NULL,
  question_text   text        NOT NULL,
  status          text        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft', 'pending', 'sent', 'failed')),
  send_at         timestamptz,
  sent_at         timestamptz,
  due_date        date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_homework_session ON homework(session_id);
CREATE INDEX idx_homework_faculty ON homework(faculty_id);
CREATE INDEX idx_homework_status_send ON homework(status, send_at)
  WHERE status = 'pending';

-- RLS
ALTER TABLE homework ENABLE ROW LEVEL SECURITY;

-- Faculty sees homework they created
CREATE POLICY "faculty_own_homework"
  ON homework FOR ALL
  USING (auth.uid() = faculty_id);

-- Students can see homework from sessions they booked
CREATE POLICY "student_session_homework"
  ON homework FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM live_bookings
      WHERE live_bookings.session_id = homework.session_id
        AND live_bookings.student_id = auth.uid()
    )
  );
