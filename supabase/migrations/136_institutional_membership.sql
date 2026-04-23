-- ═══════════════════════════════════════════════════════════════════════════════
-- 136 — Institutional Membership (Phase I-1)
--
-- First cut of the B2B institutional layer. Verified schools / colleges land
-- here after admin approval; their principal, faculty, and students link to
-- the row via profiles.institution_id + profiles.institution_role.
--
-- Coexists with institution_profiles (migration 055), which captures pending
-- B2B applications submitted via InstitutionOnboardFlow. A later phase will
-- add the promotion flow (application → verified → institutions row created).
--
-- Guardrails carried from CLAUDE.md v3.2:
--   - NEVER auto-verify an institution — admin flips `status` manually.
--   - NEVER show individual student data to principals — aggregate only.
--   - NEVER bill students within an institution — billing attaches to the
--     institution, not the student.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. institutions — verified-membership table ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.institutions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text        UNIQUE NOT NULL,
  name                  text        NOT NULL,
  city                  text        NOT NULL,
  state                 text        DEFAULT 'Gujarat',
  affiliation           text,
  principal_name        text,
  principal_email       text        NOT NULL,
  contact_phone         text,
  website               text,
  approximate_strength  text,
  active_saathi_slugs   text[],
  onboarding_answer     text,
  status                text        DEFAULT 'pending'
                                    CHECK (status IN (
                                      'pending',
                                      'demo',
                                      'trial',
                                      'active',
                                      'suspended',
                                      'churned'
                                    )),
  trial_started_at      timestamptz,
  trial_ends_at         timestamptz,
  activated_at          timestamptz,
  declared_capacity     int         DEFAULT 200,
  daily_minutes_budget  int         DEFAULT 180,
  daily_minutes_used    int         DEFAULT 0,
  daily_reset_date      date,
  admin_notes           text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions (status);
CREATE INDEX IF NOT EXISTS idx_institutions_slug   ON public.institutions (slug);

COMMENT ON TABLE public.institutions IS
  'Verified institutional memberships. Populated by admin after manual review. '
  'Linked from profiles.institution_id + institution_role.';

COMMENT ON COLUMN public.institutions.status IS
  'Lifecycle: pending (awaiting admin review) → demo (show-and-tell) → trial → '
  'active → (suspended | churned). Admin flips manually — never auto.';

COMMENT ON COLUMN public.institutions.active_saathi_slugs IS
  'Array of saathi slugs enabled for this institution. Free-text by design — '
  'slugs are the stable public identifier per CLAUDE.md rule 11.';

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;

-- Public read — only institutions that have actually onboarded (trial / active)
-- are discoverable by students via the "Find My Institution" search.
DROP POLICY IF EXISTS public_read_active_institutions ON public.institutions;
CREATE POLICY public_read_active_institutions
  ON public.institutions
  FOR SELECT
  TO anon, authenticated
  USING (status IN ('trial', 'active'));

-- Authenticated-self read — principals / faculty / students at a given
-- institution must always be able to read their own row, even when the
-- institution is in 'pending' / 'demo' / 'suspended' state (otherwise the
-- principal dashboard goes blank during onboarding demos).
DROP POLICY IF EXISTS authenticated_read_own_institution ON public.institutions;
CREATE POLICY authenticated_read_own_institution
  ON public.institutions
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT institution_id
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.institution_id IS NOT NULL
    )
  );

-- Service role owns all writes. No direct client insert / update / delete.
DROP POLICY IF EXISTS institutions_service_all ON public.institutions;
CREATE POLICY institutions_service_all
  ON public.institutions
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. updated_at auto-touch trigger ─────────────────────────────────────────
-- Without this, updated_at sits on the insert default forever. Matches the
-- pattern from migration 055 (institution_profiles) so both tables stay
-- consistent.

CREATE OR REPLACE FUNCTION public.touch_institutions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_institutions_updated_at'
  ) THEN
    CREATE TRIGGER trg_institutions_updated_at
      BEFORE UPDATE ON public.institutions
      FOR EACH ROW EXECUTE FUNCTION public.touch_institutions_updated_at();
  END IF;
END $$;

-- ── 3. profiles ← institution link ───────────────────────────────────────────
-- All four additions are IF NOT EXISTS so the migration is safe to re-run on
-- an environment where some columns may already have been manually created.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS institution_id
    uuid REFERENCES public.institutions(id),
  ADD COLUMN IF NOT EXISTS institution_role
    text CHECK (institution_role IN ('principal', 'faculty', 'student')),
  ADD COLUMN IF NOT EXISTS institution_joined_at
    timestamptz,
  ADD COLUMN IF NOT EXISTS institution_drop_requested_at
    timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_institution_id
  ON public.profiles (institution_id)
  WHERE institution_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.institution_id IS
  'FK to institutions.id. NULL for solo users (the vast majority today).';

COMMENT ON COLUMN public.profiles.institution_role IS
  'Role within the institution. principal/faculty/student. Distinct from the '
  'platform-level profiles.role which can be student/faculty/institution/public.';

-- ── 4. institution_stats_cache — daily rollup ────────────────────────────────
-- Aggregate-only mirror of classroom + chat activity, keyed (institution_id, date).
-- Principals read this via server-side queries (service role) — no per-user rows
-- ever leave the database to a principal client.

CREATE TABLE IF NOT EXISTS public.institution_stats_cache (
  institution_id    uuid        NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  date              date        NOT NULL,
  sessions_count    int         NOT NULL DEFAULT 0,
  students_active   int         NOT NULL DEFAULT 0,
  minutes_used      int         NOT NULL DEFAULT 0,
  faculty_active    int         NOT NULL DEFAULT 0,
  artifacts_created int         NOT NULL DEFAULT 0,
  top_saathis       jsonb,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institution_id, date)
);

CREATE INDEX IF NOT EXISTS idx_institution_stats_cache_date
  ON public.institution_stats_cache (date DESC);

COMMENT ON TABLE public.institution_stats_cache IS
  'Daily rollup of usage per institution. Service-role write only. Client-side '
  'read policy deferred to Phase I-2 when the principal dashboard actually '
  'needs it (current I-1 dashboards query through server actions).';

ALTER TABLE public.institution_stats_cache ENABLE ROW LEVEL SECURITY;

-- Service role only for now. Phase I-2 will add a narrow principal-read policy
-- once the dashboard rendering path is decided (SSR vs client-side).
DROP POLICY IF EXISTS institution_stats_cache_service_all ON public.institution_stats_cache;
CREATE POLICY institution_stats_cache_service_all
  ON public.institution_stats_cache
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 5. Grants ────────────────────────────────────────────────────────────────

GRANT SELECT                         ON public.institutions            TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institutions            TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_stats_cache TO service_role;
