-- ═══════════════════════════════════════════════════════
-- Lecture Requests — Students request topics from faculty
-- Community-driven demand signals for live sessions
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lecture_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  upvote_count INTEGER DEFAULT 1,
  upvoter_ids UUID[] DEFAULT '{}',
  status TEXT DEFAULT 'pending',
    -- pending | acknowledged | accepted | scheduled | declined | completed
  faculty_response TEXT NULL,
  faculty_responded_at TIMESTAMPTZ NULL,
  resulting_session_id UUID NULL REFERENCES live_sessions(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lecture_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY lr_read ON lecture_requests FOR SELECT TO authenticated
USING (is_public = true OR student_id = auth.uid() OR faculty_id = auth.uid());

CREATE POLICY lr_create ON lecture_requests FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid());

CREATE POLICY lr_update ON lecture_requests FOR UPDATE TO authenticated
USING (student_id = auth.uid() OR faculty_id = auth.uid());

CREATE POLICY lr_service ON lecture_requests FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lr_faculty ON lecture_requests(faculty_id, status);
CREATE INDEX IF NOT EXISTS idx_lr_student ON lecture_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_lr_upvotes ON lecture_requests(upvote_count DESC);
