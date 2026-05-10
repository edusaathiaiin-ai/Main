-- ═══════════════════════════════════════════════════════
-- Placement Prep — Schema Groundwork
--
-- Enables: Sidebar CTA → 4-question intent form → Bot 2 system
-- prompt seeding → mentor matching → 1:1 mock interview booking.
--
-- This migration is purely additive. It does not touch existing
-- rows. Application code rolls out in subsequent commits.
-- ═══════════════════════════════════════════════════════


-- ─── 1. placement_intent ───────────────────────────────────────────────
-- Short-lived (≤ 30 days) record of a student's upcoming placement
-- interview context. Seeds Bot 2 system prompt and powers the matching
-- engine. NOT soul-level — placement intents are transient and expire.

CREATE TABLE IF NOT EXISTS placement_intent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,

  role_type TEXT NOT NULL
    CHECK (role_type IN ('tech', 'non_tech', 'hybrid')),

  role_seniority TEXT NOT NULL
    CHECK (role_seniority IN ('fresher_campus', 'fresher_offcampus', 'lateral')),

  companies TEXT[] DEFAULT '{}' NOT NULL,
  expected_interview_date DATE NULL,

  -- Auto-generated 1-line summary used to seed Bot 2 prompt.
  -- Built server-side from the structured fields — never free-typed
  -- by student (avoids leaking PII into AI prompts).
  context_summary TEXT NULL,

  -- DPDP opt-in. Default OFF. Mentor matching engine only reads
  -- rows where this is TRUE.
  share_with_faculty BOOLEAN DEFAULT false NOT NULL,

  -- Set by app code on insert. expected_interview_date + 7 days,
  -- or now() + 30 days if no date given. Matching engine + Bot 2
  -- seed both filter on expires_at > now().
  expires_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE placement_intent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pi_student_own ON placement_intent;
DROP POLICY IF EXISTS pi_service     ON placement_intent;

-- Student owns their rows (read/write/delete).
CREATE POLICY pi_student_own ON placement_intent
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role full access (matching engine, edge functions).
-- Faculty have NO direct table access — matched intents are
-- surfaced via the matching engine running as service_role.
CREATE POLICY pi_service ON placement_intent
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_placement_intent_user_active
  ON placement_intent (user_id, expires_at);

-- Matching engine query: shareable intents in a vertical that
-- haven't expired. Partial index keeps it small.
CREATE INDEX IF NOT EXISTS idx_placement_intent_match_pool
  ON placement_intent (vertical_id, expires_at)
  WHERE share_with_faculty = true;


-- ─── 2. faculty_profiles — mentor capability columns ───────────────────
-- Extends faculty profile with mock-interview / mentorship offerings.
-- Existing fee fields (session_fee_doubt etc.) cover the established
-- session types; mentor_hourly_rate_paise is the override for mock
-- interview pricing only.

ALTER TABLE faculty_profiles
ADD COLUMN IF NOT EXISTS mentor_capabilities TEXT[] DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS mentor_role_focus   TEXT[] DEFAULT '{}' NOT NULL,
ADD COLUMN IF NOT EXISTS available_for_mentoring BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS mentor_hourly_rate_paise INTEGER NULL;

-- Defense-in-depth: DB rejects unknown capability tags. The set
-- below matches the enum used by the form + matching engine.
-- To add a new capability tag in the future: drop this constraint,
-- recreate with the expanded array. Don't bypass with raw inserts.
ALTER TABLE faculty_profiles
DROP CONSTRAINT IF EXISTS faculty_mentor_capabilities_allowed;

ALTER TABLE faculty_profiles
ADD CONSTRAINT faculty_mentor_capabilities_allowed
CHECK (
  mentor_capabilities <@ ARRAY[
    'mock_technical',
    'mock_hr',
    'mock_case',
    'cv_review',
    'aptitude_prep',
    'gd_prep'
  ]::TEXT[]
);

ALTER TABLE faculty_profiles
DROP CONSTRAINT IF EXISTS faculty_mentor_role_focus_allowed;

ALTER TABLE faculty_profiles
ADD CONSTRAINT faculty_mentor_role_focus_allowed
CHECK (
  mentor_role_focus <@ ARRAY[
    'swe',
    'data',
    'pm',
    'qa',
    'banking',
    'consulting',
    'sales',
    'design'
  ]::TEXT[]
);

-- Matching engine query: faculty in a vertical who are mentor-ready.
-- Partial index — only surfaces opted-in faculty.
CREATE INDEX IF NOT EXISTS idx_faculty_profiles_mentor_ready
  ON faculty_profiles (user_id)
  WHERE available_for_mentoring = true;


-- ─── 3. verticals — placement season toggle ────────────────────────────
-- Admin-controlled per Saathi. Different verticals have different
-- season calendars (medical placements ≠ engineering campus drives).
-- Auto-derivation from intent density is Phase 2 after a year of data.

ALTER TABLE verticals
ADD COLUMN IF NOT EXISTS placement_season_active BOOLEAN DEFAULT false NOT NULL;


-- ─── 4. faculty_sessions — placement linkage + surge multiplier ────────
-- New session_type 'mock_interview' — no CHECK constraint exists on
-- session_type today (verified in 062), so application-layer enum is
-- the gate. Adding a CHECK now is out of scope (would require auditing
-- and migrating existing rows).
--
-- placement_intent_id: ties a session to the intent that produced it,
-- used by the matching engine to know which intent has been "served".
--
-- surge_multiplier: 1.0 baseline; 1.5 when booked within 7 days of
-- placement_intent.expected_interview_date. Stored on the row for
-- audit (so post-hoc we can see what surge applied to which session).

ALTER TABLE faculty_sessions
ADD COLUMN IF NOT EXISTS placement_intent_id UUID NULL
  REFERENCES placement_intent(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS surge_multiplier NUMERIC(3,2) DEFAULT 1.0 NOT NULL
  CHECK (surge_multiplier >= 1.0 AND surge_multiplier <= 3.0);


-- ─── 5. updated_at trigger for placement_intent ────────────────────────
-- Mirrors the pattern used elsewhere in the schema. Keeps updated_at
-- accurate without app-layer ceremony.

CREATE OR REPLACE FUNCTION placement_intent_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_placement_intent_updated_at ON placement_intent;
CREATE TRIGGER trg_placement_intent_updated_at
  BEFORE UPDATE ON placement_intent
  FOR EACH ROW
  EXECUTE FUNCTION placement_intent_set_updated_at();
