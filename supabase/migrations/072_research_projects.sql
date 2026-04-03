-- Migration 072: Research Projects — Faculty posts, Students apply
-- Faculty who want research assistants post a project here.
-- Students (especially PhD aspirants, UPSC researchers, thesis writers)
-- browse and apply with a statement of purpose.
-- Completely separate from institution internships:
--   Institution intern = paid work experience
--   Research project   = mentorship + co-authorship + learning

CREATE TABLE IF NOT EXISTS public.research_projects (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id              UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vertical_id             TEXT NOT NULL,  -- saathi slug e.g. 'biosaathi'
  title                   TEXT NOT NULL,
  description             TEXT NOT NULL,  -- what the project is about (max shown: 300 chars)
  what_you_will_do        TEXT NOT NULL,  -- student's actual tasks
  what_you_will_get       TEXT NOT NULL,  -- certificate | co-authorship | recommendation | stipend
  required_subjects       TEXT[] NOT NULL DEFAULT '{}',
  preferred_academic_level TEXT NULL,     -- 'UG' | 'PG' | 'PhD' | 'Any'
  duration_months         INTEGER NULL,
  is_remote               BOOLEAN NOT NULL DEFAULT true,
  seats_available         INTEGER NOT NULL DEFAULT 1,
  includes_stipend        BOOLEAN NOT NULL DEFAULT false,
  stipend_amount          INTEGER NULL,   -- monthly INR, null = no stipend
  includes_authorship     BOOLEAN NOT NULL DEFAULT false,
  includes_certificate    BOOLEAN NOT NULL DEFAULT true,
  includes_letter         BOOLEAN NOT NULL DEFAULT true,
  status                  TEXT NOT NULL DEFAULT 'open'
                            CHECK (status IN ('open','filled','paused','closed')),
  total_applicants        INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.research_applications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES public.research_projects(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  statement    TEXT NOT NULL CHECK (char_length(statement) <= 600),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','shortlisted','accepted','rejected','withdrawn')),
  faculty_note TEXT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, student_id)
);

-- RLS
ALTER TABLE public.research_projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_applications ENABLE ROW LEVEL SECURITY;

-- Faculty manages their own projects
CREATE POLICY rp_faculty ON public.research_projects
  FOR ALL TO authenticated
  USING (faculty_id = auth.uid()) WITH CHECK (faculty_id = auth.uid());

-- Everyone can read open projects
CREATE POLICY rp_read ON public.research_projects
  FOR SELECT TO authenticated
  USING (status = 'open' OR faculty_id = auth.uid());

-- Students manage their own applications
CREATE POLICY ra_own ON public.research_applications
  FOR ALL TO authenticated
  USING (student_id = auth.uid()) WITH CHECK (student_id = auth.uid());

-- Faculty reads applications for their projects
CREATE POLICY ra_faculty ON public.research_applications
  FOR SELECT TO authenticated
  USING (project_id IN (SELECT id FROM public.research_projects WHERE faculty_id = auth.uid()));

-- Faculty updates status on applications to their projects
CREATE POLICY ra_faculty_update ON public.research_applications
  FOR UPDATE TO authenticated
  USING (project_id IN (SELECT id FROM public.research_projects WHERE faculty_id = auth.uid()));

-- Service role bypass
CREATE POLICY rp_service ON public.research_projects
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY ra_service ON public.research_applications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rp_vertical  ON public.research_projects(vertical_id, status);
CREATE INDEX IF NOT EXISTS idx_rp_faculty   ON public.research_projects(faculty_id, status);
CREATE INDEX IF NOT EXISTS idx_ra_project   ON public.research_applications(project_id, status);
CREATE INDEX IF NOT EXISTS idx_ra_student   ON public.research_applications(student_id);

-- Auto-update updated_at
CREATE OR REPLACE TRIGGER trg_rp_updated_at
  BEFORE UPDATE ON public.research_projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_ra_updated_at
  BEFORE UPDATE ON public.research_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Update total_applicants counter on insert/delete
CREATE OR REPLACE FUNCTION public.update_research_project_applicant_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.research_projects
      SET total_applicants = total_applicants + 1
      WHERE id = NEW.project_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.research_projects
      SET total_applicants = GREATEST(0, total_applicants - 1)
      WHERE id = OLD.project_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_ra_count
  AFTER INSERT OR DELETE ON public.research_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_research_project_applicant_count();
