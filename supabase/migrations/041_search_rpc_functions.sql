-- ============================================================
-- Migration 041: Search RPC functions for parse-education
-- Companion to 040_college_intelligence.sql
-- Created: 2026-03-23
--
-- Provides pg_trgm fuzzy search RPC functions called by
-- the parse-education Edge Function.
-- ============================================================

-- ── search_colleges ───────────────────────────────────────────────────────────
-- Returns colleges ordered by trigram similarity to the query.
-- Also matches on aliased names and city.

CREATE OR REPLACE FUNCTION public.search_colleges(
  query_text  TEXT,
  result_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id           UUID,
  name         TEXT,
  city         TEXT,
  state        TEXT,
  university   TEXT,
  naac_grade   TEXT,
  college_type TEXT,
  score        FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.name,
    c.city,
    c.state,
    c.university,
    c.naac_grade,
    c.college_type,
    GREATEST(
      similarity(c.name, query_text),
      -- Check alias array: pick best similarity across all aliases
      COALESCE(
        (
          SELECT MAX(similarity(alias_val, query_text))
          FROM unnest(c.aliases) AS alias_val
        ), 0
      ),
      -- Partial ILIKE gets a fixed score of 0.35
      CASE WHEN c.name ILIKE '%' || query_text || '%' THEN 0.35 ELSE 0 END
    ) AS score
  FROM public.colleges c
  WHERE
    similarity(c.name, query_text) > 0.2
    OR c.name ILIKE '%' || query_text || '%'
    OR EXISTS (
      SELECT 1
      FROM unnest(c.aliases) AS alias_val
      WHERE
        similarity(alias_val, query_text) > 0.25
        OR alias_val ILIKE '%' || query_text || '%'
    )
  ORDER BY score DESC
  LIMIT result_limit;
$$;

-- ── search_courses ────────────────────────────────────────────────────────────
-- Returns courses ordered by trigram similarity.
-- Also matches from abbreviations[] and common_aliases[].

CREATE OR REPLACE FUNCTION public.search_courses(
  query_text   TEXT,
  result_limit INTEGER DEFAULT 3
)
RETURNS TABLE (
  id                  UUID,
  name                TEXT,
  saathi_slug         TEXT,
  year_wise_subjects  JSONB,
  score               FLOAT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    c.id,
    c.name,
    c.saathi_slug,
    c.year_wise_subjects,
    GREATEST(
      similarity(c.name, query_text),
      COALESCE(
        (
          SELECT MAX(similarity(abbr, query_text))
          FROM unnest(c.abbreviations) AS abbr
        ), 0
      ),
      COALESCE(
        (
          SELECT MAX(similarity(alias_val, query_text))
          FROM unnest(c.common_aliases) AS alias_val
        ), 0
      ),
      -- Exact abbreviation hit → high score
      CASE
        WHEN query_text = ANY(c.abbreviations) THEN 0.95
        WHEN lower(query_text) = ANY(c.common_aliases) THEN 0.90
        ELSE 0
      END
    ) AS score
  FROM public.courses c
  WHERE
    similarity(c.name, query_text) > 0.2
    OR c.name ILIKE '%' || query_text || '%'
    OR query_text = ANY(c.abbreviations)
    OR lower(query_text) = ANY(c.common_aliases)
    OR EXISTS (
      SELECT 1
      FROM unnest(c.abbreviations) AS abbr
      WHERE similarity(abbr, query_text) > 0.3
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(c.common_aliases) AS alias_val
      WHERE similarity(alias_val, query_text) > 0.25
    )
  ORDER BY score DESC
  LIMIT result_limit;
$$;

-- ── Grant execute to authenticated users ──────────────────────────────────────
-- (Edge Functions call these via service role, but grant anyway for safety)

GRANT EXECUTE ON FUNCTION public.search_colleges(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_courses(TEXT, INTEGER)  TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_colleges(TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_courses(TEXT, INTEGER)  TO service_role;
