-- Migration 073: Unified Internship Postings + Applications
-- Covers both institution internships (posting_type='institution')
-- and faculty research positions (posting_type='research').
--
-- vertical_id stores Saathi slugs (TEXT) consistent with the rest of the schema.
-- stipend_monthly is in INR (whole rupees), not paise.

CREATE TABLE IF NOT EXISTS public.internship_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who posted
  posted_by           UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  posting_type        TEXT NOT NULL CHECK (posting_type IN ('institution', 'research')),

  -- Position details
  title               TEXT NOT NULL,
  description         TEXT NOT NULL CHECK (char_length(description) <= 500),
  responsibilities    TEXT NULL,  -- what intern actually does
  requirements        TEXT NULL,  -- what they need to have

  -- Targeting
  vertical_id         TEXT NULL,  -- Saathi slug e.g. 'biosaathi'
  min_depth           INTEGER NOT NULL DEFAULT 0 CHECK (min_depth BETWEEN 0 AND 100),
  min_academic_level  TEXT NOT NULL DEFAULT 'any'
                        CHECK (min_academic_level IN ('any','bachelor','masters','phd')),
  preferred_subjects  TEXT[] NOT NULL DEFAULT '{}',

  -- Logistics
  duration_months     INTEGER NULL,
  stipend_monthly     INTEGER NULL,   -- monthly INR, NULL = unpaid
  is_paid             BOOLEAN NOT NULL DEFAULT false,
  offers_coauthorship BOOLEAN NOT NULL DEFAULT false,
  offers_certificate  BOOLEAN NOT NULL DEFAULT true,
  location            TEXT NULL,
  is_remote           BOOLEAN NOT NULL DEFAULT false,
  work_mode           TEXT NOT NULL DEFAULT 'onsite'
                        CHECK (work_mode IN ('onsite','remote','hybrid')),

  -- Seats and deadline
  total_seats         INTEGER NOT NULL DEFAULT 1,
  seats_filled        INTEGER NOT NULL DEFAULT 0,
  application_deadline TIMESTAMPTZ NULL,

  -- Status
  status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open','paused','filled','expired','removed')),

  -- Institution-specific fields
  company_name        TEXT NULL,
  company_logo_url    TEXT NULL,
  industry            TEXT NULL,

  -- Research-specific fields (faculty)
  research_area       TEXT NULL,
  project_title       TEXT NULL,
  expected_outcome    TEXT NULL,

  -- Listing plan (institution only)
  listing_fee_paid    BOOLEAN NOT NULL DEFAULT false,
  listing_plan        TEXT NOT NULL DEFAULT 'basic'
                        CHECK (listing_plan IN ('basic','featured','corporate')),

  -- Analytics
  total_views         INTEGER NOT NULL DEFAULT 0,
  total_applications  INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at          TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 days')
);

CREATE TABLE IF NOT EXISTS public.intern_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  posting_id  UUID NOT NULL REFERENCES public.internship_postings(id) ON DELETE CASCADE,
  student_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Application content
  cover_note          TEXT NULL CHECK (cover_note IS NULL OR char_length(cover_note) <= 200),
  research_statement  TEXT NULL CHECK (research_statement IS NULL OR char_length(research_statement) <= 300),
  why_this_project    TEXT NULL CHECK (why_this_project IS NULL OR char_length(why_this_project) <= 200),
  prior_experience    TEXT NULL,

  -- Soul snapshot at time of application
  soul_snapshot       JSONB NULL,

  -- Match score (0-100, computed at apply time)
  match_score         INTEGER NOT NULL DEFAULT 0 CHECK (match_score BETWEEN 0 AND 100),

  -- Status
  status              TEXT NOT NULL DEFAULT 'applied'
                        CHECK (status IN ('applied','shortlisted','interviewing','selected','rejected','withdrawn')),

  -- Communication
  faculty_message         TEXT NULL,
  faculty_responded_at    TIMESTAMPTZ NULL,

  -- Outcome
  selected_at             TIMESTAMPTZ NULL,
  rejected_at             TIMESTAMPTZ NULL,
  rejection_reason        TEXT NULL,
  credential_added        BOOLEAN NOT NULL DEFAULT false,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (posting_id, student_id)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.internship_postings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_applications  ENABLE ROW LEVEL SECURITY;

-- Open postings visible to all authenticated users
-- Poster always sees their own (any status)
CREATE POLICY postings_read ON public.internship_postings
  FOR SELECT TO authenticated
  USING (status = 'open' OR posted_by = auth.uid());

-- Poster manages their own postings
CREATE POLICY postings_write ON public.internship_postings
  FOR ALL TO authenticated
  USING (posted_by = auth.uid())
  WITH CHECK (posted_by = auth.uid());

-- Service role bypass
CREATE POLICY postings_service ON public.internship_postings
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Students manage their own applications
CREATE POLICY apps_student ON public.intern_applications
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Poster reads applications for their postings
CREATE POLICY apps_poster ON public.intern_applications
  FOR SELECT TO authenticated
  USING (posting_id IN (SELECT id FROM public.internship_postings WHERE posted_by = auth.uid()));

-- Poster updates status on applications
CREATE POLICY apps_poster_update ON public.intern_applications
  FOR UPDATE TO authenticated
  USING (posting_id IN (SELECT id FROM public.internship_postings WHERE posted_by = auth.uid()));

-- Service role bypass
CREATE POLICY apps_service ON public.intern_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_postings_vertical
  ON public.internship_postings(vertical_id, status);

CREATE INDEX IF NOT EXISTS idx_postings_type
  ON public.internship_postings(posting_type, status);

CREATE INDEX IF NOT EXISTS idx_postings_posted_by
  ON public.internship_postings(posted_by, status);

CREATE INDEX IF NOT EXISTS idx_apps_posting
  ON public.intern_applications(posting_id, match_score DESC);

CREATE INDEX IF NOT EXISTS idx_apps_student
  ON public.intern_applications(student_id);

-- ── Auto-increment total_applications on insert/delete ────────────────────────

CREATE OR REPLACE FUNCTION public.update_internship_posting_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.internship_postings
      SET total_applications = total_applications + 1
      WHERE id = NEW.posting_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.internship_postings
      SET total_applications = GREATEST(0, total_applications - 1)
      WHERE id = OLD.posting_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_intern_app_count
  AFTER INSERT OR DELETE ON public.intern_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_internship_posting_count();
