-- 141_fix_three_latent_rpc_bugs_caught_by_smoke_test.sql
--
-- Three latent RPC bugs found by the new rpc-smoke test (jest layer 3
-- of the defensive-test ladder, added 2026-04-25). They are the same
-- class of bug as the book_live_session_seat 42702 incident from
-- 2026-04-24 — would have aborted real calls the moment they were
-- exercised, but had been hiding behind low usage / silent fallbacks.
--
-- (1) get_saathi_suggestions — 42702 ambiguous column
--     RETURNS TABLE(vertical_id uuid, ...) declares an implicit
--     function variable named `vertical_id`. The body's lookup against
--     student_soul has WHERE vertical_id = v_current_vertical without
--     a table alias — Postgres can't tell column from variable.
--     Fix: alias student_soul as `s`, qualify s.vertical_id.
--
-- (2) search_colleges — 42883 function similarity(text, text) does not exist
-- (3) search_courses  — 42883 same
--     pg_trgm is installed in the public schema, but migration 051
--     hardened these functions with `SET search_path = ''`. Empty
--     search_path means similarity() can't be resolved without a
--     fully-qualified call. The function bodies already qualify
--     `public.colleges c` / `public.courses c` correctly, but
--     similarity() is unqualified and fails.
--     Fix: qualify every similarity() reference as public.similarity()
--     so the strict empty search_path stays intact.
--
-- Impact analysis before fix
-- ──────────────────────────
--   get_saathi_suggestions: zero callers in code. Function existed
--     but was never wired up — comment in body says "AI suggestion
--     happens client-side using the soul data". Could have bitten if
--     a future PR called it.
--   search_colleges:  called by auto-add-college (zero fallback) and
--     parse-education (has a console.warn fallback to inline ILIKE).
--     Effect: fuzzy trigram search has been silently degraded since
--     migration 051. Onboarding college matches were ILIKE-only —
--     less forgiving than the trigram path the team built.
--   search_courses:   called by parse-education (same fallback).
--     Same silent degradation.
--
-- Both search RPCs being broken explains a class of "course/college
-- not matched" complaints students may have hit during onboarding
-- without anyone realising the trigram search wasn't actually firing.

-- ═════════════════════════════════════════════════════════════════════
-- 1. get_saathi_suggestions — disambiguate vertical_id
-- ═════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_saathi_suggestions(p_user_id uuid)
RETURNS TABLE(vertical_id uuid, score integer, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_institution      TEXT;
  v_academic_level   TEXT;
  v_future_subjects  TEXT[];
  v_current_vertical UUID;
BEGIN
  SELECT p.institution_name, p.primary_saathi_id
    INTO v_institution, v_current_vertical
    FROM public.profiles p
   WHERE p.id = p_user_id;

  -- HOTFIX: alias student_soul as `s` so s.vertical_id is unambiguous
  -- against the RETURNS TABLE variable of the same name. Same fix
  -- shape as migration 138 (book_live_session_seat).
  SELECT s.academic_level, s.future_subjects
    INTO v_academic_level, v_future_subjects
    FROM public.student_soul s
   WHERE s.user_id = p_user_id
     AND s.vertical_id = v_current_vertical
   LIMIT 1;

  RETURN QUERY
  SELECT
    v.id            AS vertical_id,
    50              AS score,
    'Based on your learning profile' AS reason
  FROM public.verticals v
  WHERE NOT EXISTS (
    SELECT 1 FROM public.saathi_enrollments e
     WHERE e.user_id = p_user_id AND e.vertical_id = v.id
  )
    AND NOT EXISTS (
    SELECT 1 FROM public.saathi_addons a
     WHERE a.user_id = p_user_id
       AND a.vertical_id = v.id
       AND a.status = 'active'
  )
    AND v.id != v_current_vertical
  LIMIT 10;
END;
$function$;

-- ═════════════════════════════════════════════════════════════════════
-- 2. search_colleges — qualify similarity() against pg_trgm
-- ═════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.search_colleges(
  query_text   text,
  result_limit integer DEFAULT 5
)
RETURNS TABLE(
  id            uuid,
  name          text,
  city          text,
  state         text,
  university    text,
  naac_grade    text,
  college_type  text,
  score         double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    c.id,
    c.name,
    c.city,
    c.state,
    c.university,
    c.naac_grade,
    c.college_type,
    GREATEST(
      public.similarity(c.name, query_text),
      COALESCE(
        (
          SELECT MAX(public.similarity(alias_val, query_text))
            FROM unnest(c.aliases) AS alias_val
        ), 0
      ),
      CASE WHEN c.name ILIKE '%' || query_text || '%' THEN 0.35 ELSE 0 END
    ) AS score
    FROM public.colleges c
   WHERE
    public.similarity(c.name, query_text) > 0.2
    OR c.name ILIKE '%' || query_text || '%'
    OR EXISTS (
      SELECT 1
        FROM unnest(c.aliases) AS alias_val
       WHERE
        public.similarity(alias_val, query_text) > 0.25
        OR alias_val ILIKE '%' || query_text || '%'
    )
   ORDER BY score DESC
   LIMIT result_limit;
$function$;

-- ═════════════════════════════════════════════════════════════════════
-- 3. search_courses — qualify similarity() against pg_trgm
-- ═════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.search_courses(
  query_text   text,
  result_limit integer DEFAULT 3
)
RETURNS TABLE(
  id                  uuid,
  name                text,
  saathi_slug         text,
  year_wise_subjects  jsonb,
  score               double precision
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT
    c.id,
    c.name,
    c.saathi_slug,
    c.year_wise_subjects,
    GREATEST(
      public.similarity(c.name, query_text),
      COALESCE(
        (
          SELECT MAX(public.similarity(abbr, query_text))
            FROM unnest(c.abbreviations) AS abbr
        ), 0
      ),
      COALESCE(
        (
          SELECT MAX(public.similarity(alias_val, query_text))
            FROM unnest(c.common_aliases) AS alias_val
        ), 0
      ),
      CASE
        WHEN query_text = ANY(c.abbreviations) THEN 0.95
        WHEN lower(query_text) = ANY(c.common_aliases) THEN 0.90
        ELSE 0
      END
    ) AS score
    FROM public.courses c
   WHERE
    public.similarity(c.name, query_text) > 0.2
    OR c.name ILIKE '%' || query_text || '%'
    OR query_text = ANY(c.abbreviations)
    OR lower(query_text) = ANY(c.common_aliases)
    OR EXISTS (
      SELECT 1
        FROM unnest(c.abbreviations) AS abbr
       WHERE public.similarity(abbr, query_text) > 0.3
    )
    OR EXISTS (
      SELECT 1
        FROM unnest(c.common_aliases) AS alias_val
       WHERE public.similarity(alias_val, query_text) > 0.25
    )
   ORDER BY score DESC
   LIMIT result_limit;
$function$;

COMMENT ON FUNCTION public.get_saathi_suggestions IS
  'Suggests non-enrolled Saathis. Fixed 2026-04-25 — disambiguated student_soul.vertical_id against the RETURNS TABLE variable of the same name (42702).';
COMMENT ON FUNCTION public.search_colleges IS
  'Trigram fuzzy college search. Fixed 2026-04-25 — qualified similarity() as public.similarity() so the strict empty search_path can resolve it (42883).';
COMMENT ON FUNCTION public.search_courses IS
  'Trigram fuzzy course search. Fixed 2026-04-25 — same fix shape as search_colleges.';
