-- Migration 095: Add independent_firm and resume_url to faculty_profiles
-- Required by FacultyOnboardFlow bug fixes (Step 2 profile form)

ALTER TABLE faculty_profiles
  ADD COLUMN IF NOT EXISTS independent_firm VARCHAR(255) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS resume_url        TEXT         DEFAULT NULL;

COMMENT ON COLUMN faculty_profiles.independent_firm IS
  'Firm or practice name for independent professional faculty (e.g. "Practising CA at Buch & Associates").';
COMMENT ON COLUMN faculty_profiles.resume_url IS
  'Public URL of uploaded resume PDF from faculty-docs Storage bucket. Admin-only visibility.';
