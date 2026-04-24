-- ═══════════════════════════════════════════════════════════════════════════════
-- 139 — Rename institutions → education_institutions
--
-- The Phase I-1 concept (schools / colleges / universities joining the platform
-- for classroom use) was landing on a table that shared a name with an earlier
-- concept (the "Institution" user role from migration 055, stored in
-- institution_profiles, used for B2B internship posting).
--
-- Two different things wearing one name cause confusion for users, admins, and
-- future code. This migration splits the namespace cleanly:
--
--   OLD (unchanged)       — institution_profiles              [B2B role]
--   NEW (this migration)  — education_institutions            [schools/colleges]
--
-- The 8 legacy columns that the old `institutions` table still carried
-- (logo_url, verified, active_saathis, faculty_mode, plan_tier, plan_expires_at,
-- student_limit, faculty_limit) are orphans — never referenced by any current
-- code — and are dropped here.
--
-- Runs inside a transaction so a partial apply is impossible: either the whole
-- rename lands, or nothing does. Re-runnable via IF EXISTS guards.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Rename tables ────────────────────────────────────────────────────────

ALTER TABLE IF EXISTS public.institutions
  RENAME TO education_institutions;

ALTER TABLE IF EXISTS public.institution_stats_cache
  RENAME TO education_institution_stats_cache;

-- ── 2. Drop legacy columns from the old institutions concept ────────────────

ALTER TABLE public.education_institutions
  DROP COLUMN IF EXISTS logo_url,
  DROP COLUMN IF EXISTS verified,
  DROP COLUMN IF EXISTS active_saathis,
  DROP COLUMN IF EXISTS faculty_mode,
  DROP COLUMN IF EXISTS plan_tier,
  DROP COLUMN IF EXISTS plan_expires_at,
  DROP COLUMN IF EXISTS student_limit,
  DROP COLUMN IF EXISTS faculty_limit;

-- ── 3. Rename profile columns ───────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles'
               AND column_name='institution_id') THEN
    ALTER TABLE public.profiles
      RENAME COLUMN institution_id TO education_institution_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles'
               AND column_name='institution_role') THEN
    ALTER TABLE public.profiles
      RENAME COLUMN institution_role TO education_institution_role;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles'
               AND column_name='institution_joined_at') THEN
    ALTER TABLE public.profiles
      RENAME COLUMN institution_joined_at TO education_institution_joined_at;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='profiles'
               AND column_name='institution_drop_requested_at') THEN
    ALTER TABLE public.profiles
      RENAME COLUMN institution_drop_requested_at TO education_institution_drop_requested_at;
  END IF;
END $$;

-- ── 4. Rename indexes ───────────────────────────────────────────────────────

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_institutions_status') THEN
    ALTER INDEX public.idx_institutions_status RENAME TO idx_education_institutions_status;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_institutions_slug') THEN
    ALTER INDEX public.idx_institutions_slug RENAME TO idx_education_institutions_slug;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_institutions_trial_active') THEN
    ALTER INDEX public.idx_institutions_trial_active RENAME TO idx_education_institutions_trial_active;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_profiles_institution_id') THEN
    ALTER INDEX public.idx_profiles_institution_id RENAME TO idx_profiles_education_institution_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_institution_stats_cache_date') THEN
    ALTER INDEX public.idx_institution_stats_cache_date RENAME TO idx_education_institution_stats_cache_date;
  END IF;
END $$;

-- ── 5. Rename CHECK / FK constraints (cosmetic, but keeps error messages tidy)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='institutions_status_check') THEN
    ALTER TABLE public.education_institutions
      RENAME CONSTRAINT institutions_status_check TO education_institutions_status_check;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='institutions_pkey') THEN
    ALTER TABLE public.education_institutions
      RENAME CONSTRAINT institutions_pkey TO education_institutions_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='institutions_slug_key') THEN
    ALTER TABLE public.education_institutions
      RENAME CONSTRAINT institutions_slug_key TO education_institutions_slug_key;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='profiles_institution_id_fkey') THEN
    ALTER TABLE public.profiles
      RENAME CONSTRAINT profiles_institution_id_fkey TO profiles_education_institution_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='institution_stats_cache_pkey') THEN
    ALTER TABLE public.education_institution_stats_cache
      RENAME CONSTRAINT institution_stats_cache_pkey TO education_institution_stats_cache_pkey;
  END IF;
END $$;

-- ── 6. Rename trigger function + trigger ────────────────────────────────────
-- ALTER FUNCTION has no IF EXISTS — wrap in a DO block with pg_proc check.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'touch_institutions_updated_at'
  ) THEN
    ALTER FUNCTION public.touch_institutions_updated_at()
      RENAME TO touch_education_institutions_updated_at;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_institutions_updated_at') THEN
    ALTER TRIGGER trg_institutions_updated_at ON public.education_institutions
      RENAME TO trg_education_institutions_updated_at;
  END IF;
END $$;

-- ── 7. Recreate RLS policies under the new naming ──────────────────────────
-- (Policies don't rename cleanly in older Postgres — safer to drop + create.)

DROP POLICY IF EXISTS public_read_active_institutions          ON public.education_institutions;
DROP POLICY IF EXISTS authenticated_read_own_institution       ON public.education_institutions;
DROP POLICY IF EXISTS institutions_service_all                 ON public.education_institutions;
DROP POLICY IF EXISTS institution_stats_cache_service_all      ON public.education_institution_stats_cache;

CREATE POLICY public_read_active_education_institutions
  ON public.education_institutions
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('trial', 'active'));

CREATE POLICY authenticated_read_own_education_institution
  ON public.education_institutions
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT education_institution_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.education_institution_id IS NOT NULL
    )
  );

CREATE POLICY education_institutions_service_all
  ON public.education_institutions
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY education_institution_stats_cache_service_all
  ON public.education_institution_stats_cache
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 8. Re-state grants under the new table names ────────────────────────────

GRANT SELECT                         ON public.education_institutions            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_institutions            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.education_institution_stats_cache TO service_role;

COMMIT;
