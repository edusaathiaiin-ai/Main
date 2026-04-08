-- Extend lecture_requests with proposal workflow, slot confirmation, and vertical link
-- Original table from 066_lecture_requests.sql — this adds v2 columns

ALTER TABLE lecture_requests
  ADD COLUMN IF NOT EXISTS vertical_id UUID REFERENCES verticals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_duration INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS budget_paise INTEGER,
  ADD COLUMN IF NOT EXISTS proposed_slots JSONB,
  ADD COLUMN IF NOT EXISTS proposed_fee_paise INTEGER,
  ADD COLUMN IF NOT EXISTS proposed_duration INTEGER,
  ADD COLUMN IF NOT EXISTS proposal_message TEXT,
  ADD COLUMN IF NOT EXISTS proposal_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS student_confirmed_slot TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS linked_session_id UUID REFERENCES faculty_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS session_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Update status constraint to include new statuses
ALTER TABLE lecture_requests DROP CONSTRAINT IF EXISTS lecture_requests_status_check;
ALTER TABLE lecture_requests ADD CONSTRAINT lecture_requests_status_check
  CHECK (status IN ('pending', 'acknowledged', 'accepted', 'session_created', 'scheduled', 'declined', 'completed'));

-- Add vertical index
CREATE INDEX IF NOT EXISTS idx_lecture_requests_vertical
  ON lecture_requests (vertical_id, upvote_count DESC);

-- Add admin policy if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'lr_admin' AND tablename = 'lecture_requests') THEN
    CREATE POLICY "lr_admin" ON lecture_requests FOR ALL USING (is_admin());
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
