-- Migration 070: research_archives — permanent scientific notebook
-- Every classroom session produces one archive row per student.

CREATE TABLE research_archives (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        uuid        REFERENCES live_sessions(id) ON DELETE SET NULL,
  student_id        uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  faculty_id        uuid        REFERENCES profiles(id),
  saathi_slug       text        NOT NULL,
  session_date      date        NOT NULL,
  session_duration  interval,

  -- Claude Haiku summary: 2-3 sentences, academic focus
  summary           text,

  -- Ordered array of ResearchArtifact objects
  artifacts         jsonb       NOT NULL DEFAULT '[]',

  -- true = every artifact can be reconstructed live
  reconstructable   boolean     DEFAULT true,

  -- Storage path for PDFs uploaded during session
  storage_prefix    text,

  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_archives_student_date
  ON research_archives(student_id, session_date DESC);

CREATE INDEX idx_archives_student_saathi
  ON research_archives(student_id, saathi_slug);

CREATE INDEX idx_archives_session
  ON research_archives(session_id);

-- RLS
ALTER TABLE research_archives ENABLE ROW LEVEL SECURITY;

-- Student sees only their own archives
CREATE POLICY "student_own_archives"
  ON research_archives FOR SELECT
  USING (auth.uid() = student_id);

-- Faculty sees archives from their own sessions
CREATE POLICY "faculty_session_archives"
  ON research_archives FOR SELECT
  USING (auth.uid() = faculty_id);
