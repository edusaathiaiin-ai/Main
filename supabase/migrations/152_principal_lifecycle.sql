-- ═══════════════════════════════════════════════════════════════════════════════
-- 152 — Institution principal_lifecycle (Phase 1.6)
--
-- Reconciles migration drift + hardens the lifecycle columns, then backfills
-- the pre-migration-145 principal-members gap.
--
-- DRIFT NOTE: education_institutions.principal_lifecycle and lifecycle_set_by
-- already exist in the production DB — they were applied ad-hoc and never
-- landed in a migration file. This migration is the version-controlled record
-- of those columns. ADD COLUMN IF NOT EXISTS makes it a no-op against prod
-- while still creating them cleanly on a fresh DB.
--
-- principal_lifecycle — principal-controlled pause switch, distinct from the
--   admin-controlled `status` column:
--     status            pending|demo|trial|active|suspended|churned  (admin)
--     principal_lifecycle  active|paused                             (principal)
--   The branded faculty page treats an institution as usable only when
--   status ∈ (trial,active) AND principal_lifecycle = 'active'.
--
-- lifecycle_set_by — authority that last set principal_lifecycle. Same axis as
--   education_institution_members.set_by: a principal cannot lift an
--   admin-set pause. NULL = never explicitly set (column default era).
--
-- Both CHECK constraints are added NOT VALID then VALIDATED so the table is
-- not long-locked; the two existing rows already satisfy them.
--
-- BACKFILL: institutions created before migration 145 have no
-- education_institution_members row for their principal, so the Principals
-- roster renders empty. Insert the missing principal/active/system rows from
-- the profiles linkage. Idempotent — NOT EXISTS guards re-runs.
--
-- Idempotent throughout. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── Columns (drift reconcile — no-op on prod, real on a fresh DB) ────────────

ALTER TABLE public.education_institutions
  ADD COLUMN IF NOT EXISTS principal_lifecycle text NOT NULL DEFAULT 'active';

ALTER TABLE public.education_institutions
  ADD COLUMN IF NOT EXISTS lifecycle_set_by text;

-- ── CHECK constraints (enum guard for the two text columns) ──────────────────

ALTER TABLE public.education_institutions
  DROP CONSTRAINT IF EXISTS education_institutions_principal_lifecycle_check;
ALTER TABLE public.education_institutions
  ADD CONSTRAINT education_institutions_principal_lifecycle_check
  CHECK (principal_lifecycle IN ('active', 'paused')) NOT VALID;
ALTER TABLE public.education_institutions
  VALIDATE CONSTRAINT education_institutions_principal_lifecycle_check;

ALTER TABLE public.education_institutions
  DROP CONSTRAINT IF EXISTS education_institutions_lifecycle_set_by_check;
ALTER TABLE public.education_institutions
  ADD CONSTRAINT education_institutions_lifecycle_set_by_check
  CHECK (lifecycle_set_by IS NULL OR lifecycle_set_by IN ('principal', 'admin', 'system')) NOT VALID;
ALTER TABLE public.education_institutions
  VALIDATE CONSTRAINT education_institutions_lifecycle_set_by_check;

-- ── Backfill: missing principal members rows (pre-migration-145 gap) ─────────

INSERT INTO public.education_institution_members
  (education_institution_id, email, user_id, member_role, full_name, status, set_by)
SELECT ei.id, p.email, p.id, 'principal', p.full_name, 'active', 'system'
FROM public.education_institutions ei
JOIN public.profiles p
  ON p.education_institution_id = ei.id
 AND p.education_institution_role = 'principal'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.education_institution_members m
  WHERE m.education_institution_id = ei.id
    AND m.user_id = p.id
    AND m.member_role = 'principal'
);

COMMIT;
