-- Migration 054: Soul profile columns for onboarding form
-- These columns are written by the SoulProfileForm (Step 3 onboarding)
-- and read by the chat Edge Function to personalise every session.
-- All use IF NOT EXISTS so safe to run even if partial columns exist.

ALTER TABLE public.profiles
  -- Education parser fields
  ADD COLUMN IF NOT EXISTS degree_programme          text          NULL,
  ADD COLUMN IF NOT EXISTS university_affiliation    text          NULL,
  ADD COLUMN IF NOT EXISTS current_semester          smallint      NULL,

  -- Subject and interest chips (arrays)
  ADD COLUMN IF NOT EXISTS current_subjects          text[]        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS interest_areas            text[]        NOT NULL DEFAULT '{}',

  -- Learning style (reading | practice | conversation | examples)
  ADD COLUMN IF NOT EXISTS learning_style            text          NULL,

  -- Profile completeness (0–100)
  ADD COLUMN IF NOT EXISTS profile_completeness_pct  smallint      NOT NULL DEFAULT 0,

  -- Nudge preference (let Saathi remind to update each semester)
  ADD COLUMN IF NOT EXISTS nudge_preference          boolean       NOT NULL DEFAULT true,

  -- Timestamp of last profile update from form
  ADD COLUMN IF NOT EXISTS last_profile_updated_at  timestamptz   NULL,

  -- Academic level (bachelor | masters | phd | etc.) — also set by calibration
  ADD COLUMN IF NOT EXISTS academic_level            text          NULL,

  -- Previous degree (for Masters/PhD calibration)
  ADD COLUMN IF NOT EXISTS previous_degree           text          NULL;

-- Comment documentation
COMMENT ON COLUMN public.profiles.degree_programme         IS 'Parsed degree name from education field (e.g. B.Tech, MBBS)';
COMMENT ON COLUMN public.profiles.university_affiliation   IS 'Affiliated university name from college lookup';
COMMENT ON COLUMN public.profiles.current_semester         IS 'Current year/semester number (1-based)';
COMMENT ON COLUMN public.profiles.current_subjects         IS 'Subjects the student is actively studying this semester';
COMMENT ON COLUMN public.profiles.interest_areas           IS 'Areas of voluntary interest beyond curriculum';
COMMENT ON COLUMN public.profiles.learning_style           IS 'How the student prefers to learn: reading|practice|conversation|examples';
COMMENT ON COLUMN public.profiles.profile_completeness_pct IS 'Soul profile completeness score 0-100';
COMMENT ON COLUMN public.profiles.nudge_preference         IS 'Whether Saathi should remind student to update profile each semester';
COMMENT ON COLUMN public.profiles.last_profile_updated_at  IS 'Timestamp when profile form was last submitted';
COMMENT ON COLUMN public.profiles.academic_level           IS 'Student academic level: bachelor|masters|phd|diploma|postdoc|professional|competitive';
COMMENT ON COLUMN public.profiles.previous_degree          IS 'Prior qualification (for Masters/PhD depth calibration)';
