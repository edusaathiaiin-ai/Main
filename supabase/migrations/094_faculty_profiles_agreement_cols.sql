-- Migration 094: Add agreement + additional Saathi columns to faculty_profiles
-- Required by FacultyOnboardFlow Step 5 (agreement) and Step 3 (multi-Saathi)

ALTER TABLE faculty_profiles
  ADD COLUMN IF NOT EXISTS additional_saathi_ids UUID[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agreed_terms          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_earnings       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_content        BOOLEAN DEFAULT false;

COMMENT ON COLUMN faculty_profiles.additional_saathi_ids IS
  'Up to 2 additional Saathi UUIDs the faculty teaches across (beyond primary).';
COMMENT ON COLUMN faculty_profiles.agreed_terms IS
  'Faculty agreed to Terms of Service during onboarding.';
COMMENT ON COLUMN faculty_profiles.agreed_earnings IS
  'Faculty agreed to 80/20 earnings model during onboarding.';
COMMENT ON COLUMN faculty_profiles.agreed_content IS
  'Faculty agreed to Content and Quality Policy during onboarding.';
