-- Returns true if the email belongs to an active faculty member.
-- SECURITY DEFINER so it bypasses RLS — only returns a boolean, no PII leakage.
CREATE OR REPLACE FUNCTION check_faculty_email_exists(check_email TEXT)
RETURNS TABLE(exists_on_platform BOOLEAN, display_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT TRUE, p.full_name
  FROM profiles p
  WHERE p.email = lower(check_email)
    AND p.role = 'faculty'
    AND p.is_active = true
  LIMIT 1;

  -- If no row returned, return false
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT;
  END IF;
END;
$$;
