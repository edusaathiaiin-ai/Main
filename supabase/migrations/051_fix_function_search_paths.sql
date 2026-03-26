-- Migration 051: Fix mutable search_path on all public functions
-- Prevents SQL injection via search_path hijacking.
-- Uses a DO block to generate ALTER FUNCTION statements dynamically
-- so we don't need to hardcode argument signatures.

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT proname, pg_get_function_identity_arguments(oid) AS args
    FROM pg_proc
    WHERE proname IN (
      'set_updated_at',
      'search_courses',
      'get_my_role',
      'search_colleges',
      'enforce_board_question_rate_limit',
      'handle_new_user',
      'cleanup_old_traces'
    )
    AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = ''''',
      r.proname, r.args
    );
  END LOOP;
END $$;
