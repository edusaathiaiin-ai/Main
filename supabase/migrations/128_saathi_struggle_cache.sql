-- ═══════════════════════════════════════════════════════════════════════════════
-- 127 — Saathi struggle cache
--
-- Nightly-refreshed aggregate of topics students struggle with, per Saathi.
-- Powers the faculty "Student Insight" chat mode (bot_slot = 4).
--
-- DPDP compliance: k-anonymity threshold of 5 enforced at the refresh step.
-- No row is ever returned for a topic with fewer than 5 students, so the
-- faculty-facing mode can never infer an individual.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Cache table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saathi_struggle_cache (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id    uuid        NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  saathi_slug    text        NOT NULL,
  topic          text        NOT NULL,
  student_count  integer     NOT NULL CHECK (student_count >= 5),
  refreshed_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_struggle_cache_vertical
  ON public.saathi_struggle_cache (vertical_id, student_count DESC);

ALTER TABLE public.saathi_struggle_cache ENABLE ROW LEVEL SECURITY;

-- Faculty users can read aggregate struggle data (no individual linkage here)
DROP POLICY IF EXISTS struggle_cache_faculty_read ON public.saathi_struggle_cache;
CREATE POLICY struggle_cache_faculty_read
  ON public.saathi_struggle_cache
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'faculty'
    )
  );

-- Service role owns writes (refresh function runs as service role)
DROP POLICY IF EXISTS struggle_cache_service_all ON public.saathi_struggle_cache;
CREATE POLICY struggle_cache_service_all
  ON public.saathi_struggle_cache
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. Refresh function ────────────────────────────────────────────────────
-- Walks student_soul.struggle_topics[] for every student per vertical,
-- counts distinct students per topic, drops topics with fewer than 5
-- students, and replaces the cache for that vertical.

CREATE OR REPLACE FUNCTION public.refresh_saathi_struggle_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rows_inserted integer := 0;
BEGIN
  -- Atomic replace: clear then repopulate
  DELETE FROM public.saathi_struggle_cache;

  WITH exploded AS (
    SELECT
      ss.vertical_id,
      v.slug                               AS saathi_slug,
      lower(trim(topic))                   AS topic,
      ss.user_id
    FROM public.student_soul ss
    JOIN public.verticals v ON v.id = ss.vertical_id
    CROSS JOIN LATERAL unnest(ss.struggle_topics) AS topic
    WHERE ss.struggle_topics IS NOT NULL
      AND array_length(ss.struggle_topics, 1) > 0
      AND length(trim(topic)) > 1
  ),
  counted AS (
    SELECT
      vertical_id,
      saathi_slug,
      topic,
      COUNT(DISTINCT user_id) AS student_count
    FROM exploded
    GROUP BY vertical_id, saathi_slug, topic
    HAVING COUNT(DISTINCT user_id) >= 5   -- k-anonymity threshold (non-negotiable)
  )
  INSERT INTO public.saathi_struggle_cache
    (vertical_id, saathi_slug, topic, student_count, refreshed_at)
  SELECT vertical_id, saathi_slug, topic, student_count, now()
  FROM counted;

  GET DIAGNOSTICS rows_inserted = ROW_COUNT;
  RETURN rows_inserted;
END;
$$;

-- Allow service role to invoke directly; cron jobs also run as service role.
GRANT EXECUTE ON FUNCTION public.refresh_saathi_struggle_cache() TO service_role;

-- ── 3. Nightly cron schedule ───────────────────────────────────────────────
-- 02:15 IST (~20:45 UTC) — between admin-digest runs to avoid contention.
-- pg_cron + pg_net pattern (matches other cron jobs in this codebase).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('cron-refresh-struggle-cache')
      WHERE EXISTS (
        SELECT 1 FROM cron.job WHERE jobname = 'cron-refresh-struggle-cache'
      );
    PERFORM cron.schedule(
      'cron-refresh-struggle-cache',
      '45 20 * * *',  -- 02:15 IST daily
      $cmd$ SELECT public.refresh_saathi_struggle_cache(); $cmd$
    );
  END IF;
END $$;

-- ── 4. Seed the cache once on migration so faculty mode isn't empty on day 1
SELECT public.refresh_saathi_struggle_cache();
