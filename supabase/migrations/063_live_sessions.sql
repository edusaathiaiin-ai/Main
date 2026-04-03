-- ═══════════════════════════════════════════════════════
-- EdUsaathiAI Live — Group lecture booking system
-- Faculty announces. Students book seats.
-- 20% platform fee. 80% to faculty.
-- ═══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id TEXT NOT NULL REFERENCES verticals(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  preparation_notes TEXT NULL,
  tags TEXT[] DEFAULT '{}',
  session_format TEXT NOT NULL, -- single | series | workshop | recurring | qa
  price_per_seat_paise INTEGER NOT NULL,
  bundle_price_paise INTEGER NULL,
  early_bird_price_paise INTEGER NULL,
  early_bird_seats INTEGER NULL,
  total_seats INTEGER NOT NULL,
  min_seats INTEGER DEFAULT 1,
  seats_booked INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft', -- draft | pending_review | published | cancelled | completed
  cancelled_at TIMESTAMPTZ NULL,
  cancelled_by TEXT NULL,
  cancellation_reason TEXT NULL,
  refunds_processed BOOLEAN DEFAULT false,
  meeting_platform TEXT NULL,
  meeting_link TEXT NULL,
  meeting_link_shared_at TIMESTAMPTZ NULL,
  recurring_day TEXT NULL,
  recurring_time TIME NULL,
  recurring_frequency TEXT NULL,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMPTZ NULL,
  admin_note TEXT NULL,
  total_views INTEGER DEFAULT 0,
  wishlist_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  lecture_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  status TEXT DEFAULT 'scheduled', -- scheduled | live | completed | cancelled
  completed_at TIMESTAMPTZ NULL,
  faculty_marked_complete BOOLEAN DEFAULT false,
  attendee_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_type TEXT DEFAULT 'full', -- full | single
  lecture_ids UUID[] NULL,
  amount_paid_paise INTEGER NOT NULL,
  price_type TEXT DEFAULT 'standard', -- standard | early_bird | bundle
  razorpay_order_id TEXT NULL,
  razorpay_payment_id TEXT NULL,
  paid_at TIMESTAMPTZ NULL,
  payment_status TEXT DEFAULT 'pending', -- pending | paid | refunded | failed
  refund_reason TEXT NULL,
  refunded_at TIMESTAMPTZ NULL,
  refund_amount_paise INTEGER NULL,
  cancelled_by_student_at TIMESTAMPTZ NULL,
  attended_lecture_ids UUID[] DEFAULT '{}',
  rating INTEGER NULL,
  review_text TEXT NULL,
  reviewed_at TIMESTAMPTZ NULL,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_1h_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, student_id)
);

CREATE TABLE IF NOT EXISTS live_wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES live_sessions(id),
  student_id UUID NOT NULL REFERENCES profiles(id),
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, student_id)
);

-- RLS
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_sessions_read ON live_sessions FOR SELECT TO authenticated
USING (status = 'published' OR faculty_id = auth.uid());
CREATE POLICY live_sessions_faculty ON live_sessions FOR ALL TO authenticated
USING (faculty_id = auth.uid()) WITH CHECK (faculty_id = auth.uid());
CREATE POLICY live_sessions_service ON live_sessions FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY live_lectures_read ON live_lectures FOR SELECT TO authenticated
USING (session_id IN (SELECT id FROM live_sessions WHERE status = 'published' OR faculty_id = auth.uid()));
CREATE POLICY live_lectures_faculty ON live_lectures FOR ALL TO authenticated
USING (session_id IN (SELECT id FROM live_sessions WHERE faculty_id = auth.uid()));
CREATE POLICY live_lectures_service ON live_lectures FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY live_bookings_own ON live_bookings FOR ALL TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY live_bookings_faculty_view ON live_bookings FOR SELECT TO authenticated
USING (session_id IN (SELECT id FROM live_sessions WHERE faculty_id = auth.uid()));
CREATE POLICY live_bookings_service ON live_bookings FOR ALL TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY live_wishlist_own ON live_wishlist FOR ALL TO authenticated
USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());
CREATE POLICY live_wishlist_service ON live_wishlist FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_live_sessions_vertical ON live_sessions(vertical_id, status);
CREATE INDEX IF NOT EXISTS idx_live_sessions_faculty ON live_sessions(faculty_id, status);
CREATE INDEX IF NOT EXISTS idx_live_bookings_student ON live_bookings(student_id);
CREATE INDEX IF NOT EXISTS idx_live_bookings_session ON live_bookings(session_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_live_lectures_session ON live_lectures(session_id, scheduled_at);

-- Enable realtime for seat counter
ALTER PUBLICATION supabase_realtime ADD TABLE live_sessions;
