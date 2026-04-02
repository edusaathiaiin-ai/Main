-- ═══════════════════════════════════════════════════════
-- Emeritus Faculty Support
-- Retired professors are India's most underused asset.
-- Give them a classroom again.
-- ═══════════════════════════════════════════════════════

ALTER TABLE faculty_profiles
ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active',
  -- active | retired | independent
ADD COLUMN IF NOT EXISTS retirement_year INTEGER NULL,
ADD COLUMN IF NOT EXISTS former_institution TEXT NULL,
  -- "Former Professor, NLU Bangalore"
ADD COLUMN IF NOT EXISTS is_emeritus BOOLEAN DEFAULT false;
  -- admin sets this after verification
