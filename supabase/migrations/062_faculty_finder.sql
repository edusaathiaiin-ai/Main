-- ═══════════════════════════════════════════════════════
-- Faculty Finder — Knowledge Marketplace
-- 1:1 paid sessions between students and verified faculty
-- 20% platform fee · 80% to faculty
-- ═══════════════════════════════════════════════════════

-- Faculty session settings (extends faculty_profiles)
ALTER TABLE faculty_profiles
ADD COLUMN IF NOT EXISTS session_bio TEXT NULL,
ADD COLUMN IF NOT EXISTS session_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS expertise_tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS research_areas TEXT NULL,
ADD COLUMN IF NOT EXISTS open_to_research BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS availability_note TEXT NULL,
ADD COLUMN IF NOT EXISTS session_fee_doubt INTEGER DEFAULT 100000,
ADD COLUMN IF NOT EXISTS session_fee_research INTEGER DEFAULT 200000,
ADD COLUMN IF NOT EXISTS session_fee_deepdive INTEGER DEFAULT 150000,
ADD COLUMN IF NOT EXISTS offers_doubt_session BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS offers_research_session BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS offers_deepdive_session BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS total_sessions_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned_paise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS faculty_slug TEXT UNIQUE NULL,
ADD COLUMN IF NOT EXISTS profile_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS response_rate INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS avg_response_hours INTEGER DEFAULT 24;

-- Session requests + bookings
CREATE TABLE IF NOT EXISTS faculty_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL, -- doubt | research | deepdive
  topic TEXT NOT NULL,
  student_message TEXT NULL,
  proposed_slots JSONB NOT NULL,
  confirmed_slot TIMESTAMPTZ NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'requested',
    -- requested → accepted → paid → confirmed → completed → reviewed
    -- OR: declined | cancelled | disputed
  fee_paise INTEGER NOT NULL,
  platform_fee_paise INTEGER NOT NULL,
  faculty_payout_paise INTEGER NOT NULL,
  razorpay_order_id TEXT NULL,
  razorpay_payment_id TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  faculty_confirmed_at TIMESTAMPTZ NULL,
  student_confirmed_at TIMESTAMPTZ NULL,
  auto_confirmed_at TIMESTAMPTZ NULL,
  payout_status TEXT DEFAULT 'pending',
  payout_reference TEXT NULL,
  payout_released_at TIMESTAMPTZ NULL,
  cancelled_by TEXT NULL,
  cancellation_reason TEXT NULL,
  cancelled_at TIMESTAMPTZ NULL,
  refund_status TEXT NULL,
  disputed_by TEXT NULL,
  dispute_reason TEXT NULL,
  dispute_resolved_by TEXT NULL,
  faculty_declined_reason TEXT NULL,
  meeting_platform TEXT NULL,
  meeting_link TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE faculty_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_student        ON faculty_sessions;
DROP POLICY IF EXISTS sessions_faculty_read   ON faculty_sessions;
DROP POLICY IF EXISTS sessions_faculty_update ON faculty_sessions;
DROP POLICY IF EXISTS sessions_service        ON faculty_sessions;

CREATE POLICY sessions_student ON faculty_sessions
FOR ALL TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

CREATE POLICY sessions_faculty_read ON faculty_sessions
FOR SELECT TO authenticated
USING (faculty_id = auth.uid());

CREATE POLICY sessions_faculty_update ON faculty_sessions
FOR UPDATE TO authenticated
USING (faculty_id = auth.uid());

CREATE POLICY sessions_service ON faculty_sessions
FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_sessions_student ON faculty_sessions(student_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_faculty ON faculty_sessions(faculty_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON faculty_sessions(status, created_at DESC);

-- Session reviews
CREATE TABLE IF NOT EXISTS session_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE REFERENCES faculty_sessions(id),
  student_rating INTEGER CHECK (student_rating BETWEEN 1 AND 5),
  student_review TEXT NULL,
  student_reviewed_at TIMESTAMPTZ NULL,
  faculty_rating INTEGER CHECK (faculty_rating BETWEEN 1 AND 5),
  faculty_review TEXT NULL,
  faculty_reviewed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reviews_own     ON session_reviews;
DROP POLICY IF EXISTS reviews_service ON session_reviews;

CREATE POLICY reviews_own ON session_reviews
FOR ALL TO authenticated
USING (session_id IN (SELECT id FROM faculty_sessions WHERE student_id = auth.uid() OR faculty_id = auth.uid()));

CREATE POLICY reviews_service ON session_reviews
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Session messages
CREATE TABLE IF NOT EXISTS session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES faculty_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS messages_participants ON session_messages;

CREATE POLICY messages_participants ON session_messages
FOR ALL TO authenticated
USING (session_id IN (SELECT id FROM faculty_sessions WHERE student_id = auth.uid() OR faculty_id = auth.uid()))
WITH CHECK (sender_id = auth.uid());

-- Faculty payouts
CREATE TABLE IF NOT EXISTS faculty_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES profiles(id),
  sessions_included UUID[] NOT NULL,
  gross_paise INTEGER NOT NULL,
  tds_paise INTEGER DEFAULT 0,
  net_paise INTEGER NOT NULL,
  upi_id TEXT NOT NULL,
  upi_reference TEXT NULL,
  bank_reference TEXT NULL,
  status TEXT DEFAULT 'processing',
  initiated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  statement_url TEXT NULL
);

ALTER TABLE faculty_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payouts_faculty ON faculty_payouts;
DROP POLICY IF EXISTS payouts_service ON faculty_payouts;

CREATE POLICY payouts_faculty ON faculty_payouts
FOR SELECT TO authenticated USING (faculty_id = auth.uid());

CREATE POLICY payouts_service ON faculty_payouts
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Generate faculty slug function
CREATE OR REPLACE FUNCTION generate_faculty_slug(p_name TEXT, p_institution TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 0;
BEGIN
  base_slug := lower(regexp_replace(regexp_replace(
    p_name || '-' || split_part(p_institution, ' ', 1),
    '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM faculty_profiles WHERE faculty_slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;
