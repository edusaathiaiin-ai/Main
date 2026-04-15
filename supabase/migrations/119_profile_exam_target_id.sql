-- ────────────────────────────────────────────────────────────────────────
-- 119_profile_exam_target_id.sql
--
-- Structured exam targeting.
--
-- profiles.exam_target (text, free-text) stays for display.
-- profiles.exam_target_id (text) points into website/src/constants/exams.ts
-- EXAM_REGISTRY[].id. No FK — the registry lives in TypeScript (Git is the
-- audit trail, no admin CRUD).
--
-- profiles.exam_target_year (smallint) captures the sitting year when two
-- students both say "CAT" but one prepares for CAT 2026 and the other for
-- CAT 2027. Defaults to NULL — the LLM classifier / onboarding picker
-- writes both fields together.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS exam_target_id text,
  ADD COLUMN IF NOT EXISTS exam_target_year smallint,
  ADD COLUMN IF NOT EXISTS exam_target_date date;

COMMENT ON COLUMN public.profiles.exam_target_id IS
  'Canonical exam id — matches EXAM_REGISTRY[].id in website/src/constants/exams.ts. Null = no target set.';

COMMENT ON COLUMN public.profiles.exam_target_year IS
  'Year the student sits the exam. Null = unspecified. LLM classifier + onboarding picker set this alongside exam_target_id.';

COMMENT ON COLUMN public.profiles.exam_target_date IS
  'Student-known sitting date override. When set, takes precedence over EXAM_REGISTRY.next_date for countdown. Useful for year-round exams (GRE/GMAT) and multi-batch exams (SSC CGL). Null = fall back to registry default.';

-- Index for cron nudges ("find all students whose exam is T-180/90/30 today")
-- and admin segmentation. Partial — null rows carry no information.
CREATE INDEX IF NOT EXISTS idx_profiles_exam_target_id
  ON public.profiles (exam_target_id)
  WHERE exam_target_id IS NOT NULL;
