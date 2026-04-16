-- ──────────────────────────────────────────────────────────────
-- RLS policies for faculty_nominations
-- ──────────────────────────────────────────────────────────────

ALTER TABLE faculty_nominations ENABLE ROW LEVEL SECURITY;

-- Students/faculty can INSERT their own nominations
CREATE POLICY "Users can insert own nominations"
ON faculty_nominations FOR INSERT
TO authenticated
WITH CHECK (
  (nominator_type = 'student' AND nominated_by_user_id = auth.uid())
  OR
  (nominator_type = 'faculty' AND nominated_by_faculty_id IN (
    SELECT id FROM faculty_profiles WHERE user_id = auth.uid()
  ))
);

-- Users can SELECT their own nominations (for cap check query)
CREATE POLICY "Users can read own nominations"
ON faculty_nominations FOR SELECT
TO authenticated
USING (
  nominated_by_user_id = auth.uid()
  OR nominated_by_faculty_id IN (
    SELECT id FROM faculty_profiles WHERE user_id = auth.uid()
  )
);

-- Service role (admin) can do everything — implicit via BYPASSRLS
