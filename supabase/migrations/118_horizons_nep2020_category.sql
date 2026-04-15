-- ────────────────────────────────────────────────────────────────────────
-- 118_horizons_nep2020_category.sql
--
-- Adds 'nep2020' as a valid category in saathi_horizons and reclassifies
-- the three NEP 2020 awareness entries (kanoonsaathi, medicosaathi,
-- maathsaathi) from the 'crossover' workaround to the proper 'nep2020'
-- category.
--
-- Background: the original CHECK constraint only permitted six categories
-- (international, certification, crossover, entrepreneurship, research,
-- today). NEP 2020 Horizons were seeded under 'crossover' on 2026-04-15
-- because 'nep2020' was not yet allowed. This migration:
--   1. Allows 'nep2020' going forward
--   2. Updates the 3 seeded rows to carry the correct category label
--   3. Leaves row content (title, description, inspiration, prompts)
--      untouched
-- ────────────────────────────────────────────────────────────────────────

-- ── Step 1: allow 'nep2020' in the category CHECK ────────────────────────
ALTER TABLE saathi_horizons
  DROP CONSTRAINT IF EXISTS saathi_horizons_category_check;

ALTER TABLE saathi_horizons
  ADD CONSTRAINT saathi_horizons_category_check
  CHECK (category IN (
    'international',
    'certification',
    'crossover',
    'entrepreneurship',
    'research',
    'today',
    'nep2020'
  ));

COMMENT ON CONSTRAINT saathi_horizons_category_check ON saathi_horizons IS
  'Valid horizon categories. nep2020 added 2026-04-15 — curated NEP 2020 awareness pathway entries per Saathi.';

-- ── Step 2: dedupe NEP 2020 rows ─────────────────────────────────────────
-- The initial INSERT ran twice on 2026-04-15 (07:53 and 08:36), creating
-- two identical rows per Saathi. Keep the most recent row per
-- (saathi_slug, title) and drop the older twin.
DELETE FROM saathi_horizons
 WHERE id IN (
   SELECT id FROM (
     SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY saathi_slug, title
              ORDER BY created_at DESC
            ) AS rn
       FROM saathi_horizons
      WHERE title LIKE 'What NEP 2020 means for %'
        AND saathi_slug IN ('kanoonsaathi', 'medicosaathi', 'maathsaathi')
   ) t
   WHERE rn > 1
 );

-- ── Step 3: reclassify surviving NEP 2020 rows ───────────────────────────
-- Tight WHERE clause — only touches the 3 NEP rows, not genuine crossover
-- content. Title pattern matches "What NEP 2020 means for …".
UPDATE saathi_horizons
   SET category = 'nep2020',
       updated_at = NOW()
 WHERE title LIKE 'What NEP 2020 means for %'
   AND saathi_slug IN ('kanoonsaathi', 'medicosaathi', 'maathsaathi');

-- ── Sanity check (inspect after running) ─────────────────────────────────
-- Expected: 3 rows, one per saathi, category='nep2020'.
--
-- SELECT saathi_slug, title, category, difficulty, is_active
--   FROM saathi_horizons
--  WHERE category = 'nep2020'
--  ORDER BY saathi_slug;
