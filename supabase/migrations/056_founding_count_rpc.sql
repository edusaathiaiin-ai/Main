-- RPC function: returns total profile count for the founding spots banner.
-- SECURITY DEFINER bypasses RLS so anonymous/logged-in users get the real count.
CREATE OR REPLACE FUNCTION public.get_founding_count()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer FROM public.profiles;
$$;
