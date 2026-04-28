-- ═══════════════════════════════════════════════════════════════════════════════
-- 144 — Principal RLS for Phase I-2 Step 2 (Principal Dashboard)
--
-- Adds two SELECT policies that let an authenticated principal read their own
-- institution row and the daily stats cache for that institution. Other roles
-- (faculty / student / public) are unaffected — they fall through to the
-- existing policies declared in migrations 136 and 139:
--
--   public_read_active_education_institutions   — anon/auth, status IN trial/active
--   authenticated_read_own_education_institution — any member can read their inst
--
-- The new principal policy is additive: a principal whose institution is in
-- 'pending' status (between setup and admin verification) can still read it
-- via this policy even though the public/active policies exclude pending. That
-- matches the pending-verification banner the dashboard renders.
--
-- Column note: profiles columns were renamed in migration 139:
--   institution_role → education_institution_role
--   institution_id   → education_institution_id
-- This migration uses the post-rename names.
--
-- Idempotent — DROP POLICY IF EXISTS guards re-runs.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Principal reads their own institution row ───────────────────────────────

DROP POLICY IF EXISTS principal_read_own_education_institution
  ON public.education_institutions;

CREATE POLICY principal_read_own_education_institution
  ON public.education_institutions
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT education_institution_id
      FROM public.profiles
      WHERE id = auth.uid()
        AND education_institution_role = 'principal'
    )
  );

-- ── Principal reads their own daily stats cache rows ────────────────────────

DROP POLICY IF EXISTS principal_read_own_stats_cache
  ON public.education_institution_stats_cache;

CREATE POLICY principal_read_own_stats_cache
  ON public.education_institution_stats_cache
  FOR SELECT
  TO authenticated
  USING (
    institution_id IN (
      SELECT education_institution_id
      FROM public.profiles
      WHERE id = auth.uid()
        AND education_institution_role = 'principal'
    )
  );

GRANT SELECT ON public.education_institution_stats_cache TO authenticated;

COMMIT;
