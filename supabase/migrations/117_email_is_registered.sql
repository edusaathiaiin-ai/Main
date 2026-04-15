-- ────────────────────────────────────────────────────────────────────────
-- 117_email_is_registered.sql
--
-- Lightweight existence check for the email field on the login page and
-- /teach faculty application form. Returns a single boolean — never any
-- profile data — so the registered/not-registered signal is exactly the
-- same information already leaked by Supabase Auth's "send magic link to
-- existing user" behaviour.
--
-- Why an RPC and not a direct SELECT?
--   The profiles table's RLS policy is `id = auth.uid()`. From the login
--   page the user is anon, so a direct `.select('id').eq('email', x)`
--   returns empty rows whether x exists or not. SECURITY DEFINER bypasses
--   RLS for this single bounded lookup.
--
-- Surface usage:
--   • supabase.rpc('email_is_registered', { check_email })
--   • returns boolean
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.email_is_registered(check_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM profiles
     WHERE LOWER(email) = LOWER(TRIM(check_email))
     LIMIT 1
  );
$$;

COMMENT ON FUNCTION public.email_is_registered(TEXT) IS
  'Returns true if a profile with this email exists. Used by the login form
   and /teach application form for inline availability hints. SECURITY
   DEFINER because anon clients cannot SELECT from profiles directly.';

-- Both anon (login page, /teach) and authenticated (rare, but possible if
-- a logged-in user opens the apply form) need to call this.
GRANT EXECUTE ON FUNCTION public.email_is_registered(TEXT) TO anon, authenticated;

-- Ensure the lookup is fast on a 50K+ row profiles table.
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles (LOWER(email));
