-- ═══════════════════════════════════════════════════════════════════════════════
-- 143 — Align education_institution_stats_cache with the daily writer.
--
-- The table on prod was created via Studio at some earlier date from a v1.2
-- spec (monthly granularity, attendance/flame/depth columns). Migration 136
-- declared a different shape — daily granularity, sessions_count + minutes_used
-- + faculty_active + artifacts_created — but its `CREATE TABLE IF NOT EXISTS`
-- silently skipped because the table already existed. Two specs ended up
-- coexisting in the codebase: the docs say one thing, the table says another.
--
-- Phase I-2 confirmed daily granularity (refresh-institution-stats edge fn,
-- 2026-04-27). This migration aligns the prod schema to that spec:
--
--   - Rename `month` → `date` (daily, not monthly)
--   - Add the 4 missing metric columns the writer upserts
--   - Drop the 4 orphan v1.2 columns no longer aggregated
--   - Rename the FK constraint that migration 139 missed
--
-- Safe because the table has 0 rows. Transactional + idempotent.
-- ═══════════════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1. Add the 4 metric columns the writer needs ────────────────────────────

ALTER TABLE public.education_institution_stats_cache
  ADD COLUMN IF NOT EXISTS sessions_count    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minutes_used      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faculty_active    INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS artifacts_created INTEGER NOT NULL DEFAULT 0;

-- ── 2. Rename month → date ──────────────────────────────────────────────────
-- PK constraint auto-updates (it's keyed by column OID, not name). The PK
-- index name stays `education_institution_stats_cache_pkey` — purely cosmetic
-- and already correct after migration 139.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public'
      AND table_name='education_institution_stats_cache'
      AND column_name='month'
  ) THEN
    ALTER TABLE public.education_institution_stats_cache
      RENAME COLUMN month TO date;
  END IF;
END $$;

-- ── 3. Drop v1.2 orphan columns ─────────────────────────────────────────────
-- These were on the prod table but are NOT computed by the daily writer:
--   sessions_taught     — replaced by sessions_count
--   attendance_rate     — would need attendance signals we don't yet capture
--   flame_distribution  — student soul stage histogram (Phase later)
--   research_depth_avg  — student soul depth average (Phase later)
--
-- Re-add later if/when their compute paths exist.

ALTER TABLE public.education_institution_stats_cache
  DROP COLUMN IF EXISTS sessions_taught,
  DROP COLUMN IF EXISTS attendance_rate,
  DROP COLUMN IF EXISTS flame_distribution,
  DROP COLUMN IF EXISTS research_depth_avg;

-- ── 4. Rename the FK constraint that migration 139 missed ──────────────────
-- Cosmetic — keeps error messages tidy under the new namespace.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'institution_stats_cache_institution_id_fkey'
      AND conrelid = 'public.education_institution_stats_cache'::regclass
  ) THEN
    ALTER TABLE public.education_institution_stats_cache
      RENAME CONSTRAINT institution_stats_cache_institution_id_fkey
                     TO education_institution_stats_cache_institution_id_fkey;
  END IF;
END $$;

-- ── 5. Add the date-only index migration 136 wanted but never created ──────
-- Useful for "give me yesterday's stats across all institutions" admin
-- queries. PK already covers per-institution lookups.

CREATE INDEX IF NOT EXISTS idx_education_institution_stats_cache_date
  ON public.education_institution_stats_cache (date DESC);

COMMIT;
