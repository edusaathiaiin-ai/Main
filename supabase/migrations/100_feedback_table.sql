-- Feedback table for student bug reports, suggestions, and questions
CREATE TABLE IF NOT EXISTS feedback (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  saathi_id       UUID REFERENCES verticals(id),
  type            TEXT NOT NULL CHECK (type IN ('bug', 'question', 'suggestion', 'other')),
  message         TEXT NOT NULL CHECK (char_length(message) <= 2000),
  page_url        TEXT,
  browser_info    TEXT,
  screenshot_url  TEXT,
  status          TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'seen', 'resolved', 'dismissed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE TRIGGER trg_feedback_updated_at
  BEFORE UPDATE ON feedback
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Students can insert their own feedback
CREATE POLICY feedback_insert_own ON feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Students can read their own feedback
CREATE POLICY feedback_select_own ON feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Service role full access
CREATE POLICY feedback_service ON feedback
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_status ON feedback(status, created_at DESC);
