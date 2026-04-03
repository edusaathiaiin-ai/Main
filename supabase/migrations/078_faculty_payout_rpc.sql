-- 078: Faculty payout infrastructure
-- Adds missing RPC, UPI storage, TDS tracking, and fixes faculty_payouts.upi_id nullability.

-- 1. Add payout_upi_id + TDS tracking to faculty_profiles
ALTER TABLE faculty_profiles
  ADD COLUMN IF NOT EXISTS payout_upi_id          TEXT NULL,
  ADD COLUMN IF NOT EXISTS total_tds_deducted_paise INTEGER NOT NULL DEFAULT 0;

-- 2. Make faculty_payouts.upi_id nullable
--    (admin may initiate payout before UPI is on file; recorded as empty)
ALTER TABLE faculty_payouts
  ALTER COLUMN upi_id DROP NOT NULL;

-- 3. Create the increment_faculty_earnings RPC
--    Called by session-request confirm action when student confirms session.
--    Atomically increments total_earned_paise on faculty_profiles.
CREATE OR REPLACE FUNCTION increment_faculty_earnings(
  fac_id     UUID,
  amount_paise INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE faculty_profiles
  SET
    total_earned_paise      = total_earned_paise + amount_paise,
    total_sessions_completed = total_sessions_completed + 1,
    updated_at              = now()
  WHERE user_id = fac_id;
END;
$$;

-- Grant execute to service_role only (called server-side)
REVOKE ALL ON FUNCTION increment_faculty_earnings(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_faculty_earnings(UUID, INTEGER) TO service_role;
