-- ────────────────────────────────────────────────────────────────────────
-- 115_faculty_applications.sql
--
-- Public faculty application table for /teach landing page submissions.
--
-- This is SEPARATE from `faculty_profiles` (which requires the user to
-- already have an auth account and be signed in). Applications come from
-- anonymous prospects on /teach — no account yet. Admin reviews within
-- 48h per the SLA stated on the landing page; upon approval, admin can
-- invite the applicant via email to create their full account and
-- complete FacultyOnboardFlow.
--
-- RLS:
--   - anon + authenticated may INSERT (public form)
--   - only service_role may SELECT / UPDATE / DELETE (admin reviews)
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faculty_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  full_name                TEXT    NOT NULL,
  email                    TEXT    NOT NULL,
  wa_phone                 TEXT    NOT NULL,   -- e.g. +919825593262

  -- Subject expertise
  primary_saathi_slug      TEXT    NOT NULL,
  additional_saathi_slugs  TEXT[]  DEFAULT '{}',

  -- Credentials
  highest_qualification    TEXT    NOT NULL,
  current_institution      TEXT    NULL,
  years_experience         INTEGER NOT NULL CHECK (years_experience >= 0 AND years_experience < 80),

  -- Session pricing (rupees, admin converts to paise when creating profile)
  session_fee_rupees       INTEGER NOT NULL CHECK (session_fee_rupees >= 100 AND session_fee_rupees <= 10000),

  -- Narrative
  short_bio                TEXT    NOT NULL CHECK (char_length(short_bio) <= 400),
  linkedin_url             TEXT    NULL,
  areas_of_expertise       TEXT    NULL CHECK (areas_of_expertise IS NULL OR char_length(areas_of_expertise) <= 300),

  -- Review lifecycle
  status                   TEXT    NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate', 'waitlist')),
  reviewed_at              TIMESTAMPTZ NULL,
  reviewed_by              UUID NULL REFERENCES profiles(id) ON DELETE SET NULL,
  admin_note               TEXT    NULL,

  -- IP + UA captured server-side for spam/abuse analysis (never shown back
  -- to the applicant; useful if we start seeing bulk fake submissions).
  source_ip                TEXT    NULL,
  user_agent               TEXT    NULL,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_faculty_applications_status_created
  ON faculty_applications (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_faculty_applications_email
  ON faculty_applications (email);

-- RLS on
ALTER TABLE faculty_applications ENABLE ROW LEVEL SECURITY;

-- Allow anyone (including anonymous visitors) to INSERT an application.
-- No SELECT policy for non-service roles — rows are private.
DROP POLICY IF EXISTS faculty_applications_public_insert ON faculty_applications;
CREATE POLICY faculty_applications_public_insert
  ON faculty_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Service role has full access for admin review.
DROP POLICY IF EXISTS faculty_applications_service_all ON faculty_applications;
CREATE POLICY faculty_applications_service_all
  ON faculty_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
