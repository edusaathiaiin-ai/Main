-- Migration 055: Faculty + Institution system (idempotent — safe to re-run)
-- Existing schema:
--   intern_listings  → owner column: institution_user_id
--   intern_interests → owner column: student_user_id
--   intern_matches   → NEW table (to be created here)

-- ── Faculty profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.faculty_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  institution_name    TEXT NOT NULL,
  department          TEXT NOT NULL,
  designation         TEXT NULL,
  subject_expertise   TEXT[] DEFAULT '{}',
  years_experience    INTEGER DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','rejected')),
  verified_at         TIMESTAMPTZ NULL,
  verified_by         UUID NULL,
  rejection_reason    TEXT NULL,
  faculty_badge_shown BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.faculty_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faculty_own          ON public.faculty_profiles;
DROP POLICY IF EXISTS faculty_service_role ON public.faculty_profiles;

CREATE POLICY faculty_own
  ON public.faculty_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY faculty_service_role
  ON public.faculty_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_faculty_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_faculty_profiles_updated_at
      BEFORE UPDATE ON public.faculty_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Institution profiles ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.institution_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  org_name            TEXT NOT NULL,
  org_type            TEXT NOT NULL
                        CHECK (org_type IN ('university','company','ngo','government','other')),
  website             TEXT NULL,
  contact_person      TEXT NULL,
  contact_email       TEXT NOT NULL,
  city                TEXT NULL,
  state               TEXT NULL,
  description         TEXT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending'
                        CHECK (verification_status IN ('pending','verified','rejected')),
  verified_at         TIMESTAMPTZ NULL,
  verified_by         UUID NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.institution_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS institution_own          ON public.institution_profiles;
DROP POLICY IF EXISTS institution_service_role ON public.institution_profiles;

CREATE POLICY institution_own
  ON public.institution_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY institution_service_role
  ON public.institution_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_institution_profiles_updated_at'
  ) THEN
    CREATE TRIGGER trg_institution_profiles_updated_at
      BEFORE UPDATE ON public.institution_profiles
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ── Extend intern_listings (already exists, institution_user_id is owner col) ─

ALTER TABLE public.intern_listings
  ADD COLUMN IF NOT EXISTS institution_profile_id   UUID REFERENCES public.institution_profiles(id),
  ADD COLUMN IF NOT EXISTS required_saathi_slug     TEXT NULL,
  ADD COLUMN IF NOT EXISTS required_academic_level  TEXT NULL,
  ADD COLUMN IF NOT EXISTS required_flame_stage     TEXT NOT NULL DEFAULT 'spark',
  ADD COLUMN IF NOT EXISTS required_min_profile_pct INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS skills_needed            TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS stipend_amount           INTEGER NULL,
  ADD COLUMN IF NOT EXISTS stipend_currency         TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS is_remote                BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seats_available          INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS application_deadline     TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS status                   TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS total_applicants         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count              INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_months          SMALLINT NULL;

ALTER TABLE public.intern_listings ENABLE ROW LEVEL SECURITY;

-- ── Intern match scores (NEW table) ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.intern_matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id          UUID NOT NULL REFERENCES public.intern_listings(id) ON DELETE CASCADE,
  student_user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  match_score         SMALLINT NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),
  score_breakdown     JSONB NOT NULL DEFAULT '{}',
  notified_at         TIMESTAMPTZ NULL,
  notification_opened BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(listing_id, student_user_id)
);

ALTER TABLE public.intern_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intern_matches_student      ON public.intern_matches;
DROP POLICY IF EXISTS intern_matches_service_role ON public.intern_matches;

CREATE POLICY intern_matches_student
  ON public.intern_matches FOR SELECT TO authenticated
  USING (student_user_id = auth.uid());

CREATE POLICY intern_matches_service_role
  ON public.intern_matches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── Extend intern_interests (already exists, student_user_id is owner col) ───

ALTER TABLE public.intern_interests
  ADD COLUMN IF NOT EXISTS match_score INTEGER NULL;

ALTER TABLE public.intern_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intern_interests_student      ON public.intern_interests;
DROP POLICY IF EXISTS intern_interests_service_role ON public.intern_interests;

CREATE POLICY intern_interests_student
  ON public.intern_interests FOR ALL TO authenticated
  USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

CREATE POLICY intern_interests_service_role
  ON public.intern_interests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ── board_answers: faculty verification columns ───────────────────────────────

ALTER TABLE public.board_answers
  ADD COLUMN IF NOT EXISTS is_faculty_answer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS faculty_verified  BOOLEAN NOT NULL DEFAULT false;
