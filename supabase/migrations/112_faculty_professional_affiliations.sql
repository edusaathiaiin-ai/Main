-- Add affiliations JSONB column to faculty_profiles
-- Stores array of { org, role, year } objects from onboarding
ALTER TABLE faculty_profiles
  ADD COLUMN IF NOT EXISTS affiliations jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN faculty_profiles.affiliations IS
  'Array of {org, role, year} — memberships, fellowships, alumni status, council positions';

-- GIN index for full-text search on affiliation org/role names
CREATE INDEX IF NOT EXISTS idx_faculty_affiliations
  ON faculty_profiles USING gin(affiliations);
