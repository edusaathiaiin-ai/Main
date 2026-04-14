-- ────────────────────────────────────────────────────────────────────────
-- 113_fix_release_payout_tds_fy_threshold.sql
--
-- Fix the TDS calculation in release_faculty_payout().
--
-- Background — the April 2026 faculty audit discovered two bugs:
--   1. The existing RPC (migration 084) applied 10 % TDS whenever a single
--      session's gross exceeded ₹300 (30,000 paise). That is ~100x too
--      aggressive vs Section 194J, which uses a cumulative-FY threshold.
--   2. No caller existed for the RPC, so no faculty payout has ever been
--      created. This migration fixes #1; an edge-function cron (shipping
--      alongside) provides the batch caller.
--
-- The Correct Rule
--   - Financial Year is 1 April → 31 March (IST).
--   - Skip TDS while cumulative gross paid to a faculty in the FY is
--     below ₹30,000 (3,000,000 paise).
--   - Once the cumulative crosses ₹30,000 (including the current session
--     being released), apply 10 % TDS on this session. No retroactive
--     deduction on earlier sub-threshold payouts — that keeps the code
--     simple and is fine for the MVP; admin can true-up manually if ever
--     needed for a 26Q filing.
--
-- Everything else in the RPC (locking, status transitions, idempotency,
-- payout insert, earnings increment) is preserved bit-for-bit.
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.release_faculty_payout(
  p_session_id UUID,
  p_upi_id     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session     faculty_sessions%ROWTYPE;
  v_gross       INTEGER;
  v_tds         INTEGER;
  v_net         INTEGER;
  v_upi         TEXT;
  v_payout_id   UUID;
  v_fy_start    DATE;
  v_fy_cumulative INTEGER;
BEGIN
  -- Lock the session row
  SELECT * INTO v_session
    FROM faculty_sessions
   WHERE id = p_session_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  IF v_session.status <> 'completed' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_completed');
  END IF;

  IF v_session.payout_status = 'released' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_released');
  END IF;

  IF v_session.payout_status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payout_not_pending');
  END IF;

  v_gross := v_session.faculty_payout_paise;

  -- ── FY-aware TDS calculation ───────────────────────────────────────────
  -- Compute April 1 of the current Indian financial year (IST).
  --   months 1–3 (Jan, Feb, Mar) → FY started April of previous calendar year
  --   months 4–12                → FY started April of current calendar year
  v_fy_start := make_date(
    EXTRACT(YEAR  FROM NOW() AT TIME ZONE 'Asia/Kolkata')::int
      - CASE
          WHEN EXTRACT(MONTH FROM NOW() AT TIME ZONE 'Asia/Kolkata') < 4 THEN 1
          ELSE 0
        END,
    4, 1
  );

  -- Sum of gross amounts already paid (or queued) to this faculty in the FY.
  -- Count both 'pending' and 'completed' so a burst of releases in the same
  -- week still crosses the threshold correctly.
  SELECT COALESCE(SUM(gross_paise), 0)
    INTO v_fy_cumulative
    FROM faculty_payouts
   WHERE faculty_id = v_session.faculty_id
     AND status IN ('pending', 'processing', 'completed')
     AND initiated_at >= v_fy_start;

  -- Apply 10 % TDS only if cumulative (including this session) crosses ₹30,000.
  v_tds := CASE
    WHEN (v_fy_cumulative + v_gross) > 3000000
      THEN (v_gross * 10 / 100)
    ELSE 0
  END;

  v_net := v_gross - v_tds;

  -- Resolve UPI: param overrides, then fall back to faculty_profiles record
  IF p_upi_id IS NOT NULL AND p_upi_id <> '' THEN
    v_upi := p_upi_id;
  ELSE
    SELECT payout_upi_id INTO v_upi
      FROM faculty_profiles
     WHERE user_id = v_session.faculty_id;
  END IF;

  -- Mark session as released
  UPDATE faculty_sessions
     SET payout_status      = 'released',
         payout_released_at = now(),
         updated_at         = now()
   WHERE id = p_session_id;

  -- Insert payout record (status='pending' so admin does the actual UPI
  -- transfer later; T13 WhatsApp fires only on status flip to 'completed')
  INSERT INTO faculty_payouts (
    faculty_id,
    sessions_included,
    gross_paise,
    tds_paise,
    net_paise,
    upi_id,
    status,
    initiated_at
  ) VALUES (
    v_session.faculty_id,
    ARRAY[p_session_id],
    v_gross,
    v_tds,
    v_net,
    COALESCE(v_upi, ''),
    'pending',
    now()
  )
  RETURNING id INTO v_payout_id;

  -- Increment faculty earnings (atomic — same transaction as the UPDATE above)
  UPDATE faculty_profiles
     SET total_earned_paise       = total_earned_paise + v_net,
         total_tds_deducted_paise = total_tds_deducted_paise + v_tds,
         updated_at               = now()
   WHERE user_id = v_session.faculty_id;

  RETURN jsonb_build_object(
    'ok',        true,
    'payout_id', v_payout_id,
    'gross_paise', v_gross,
    'net_paise',   v_net,
    'tds_paise',   v_tds,
    'fy_cumulative_before', v_fy_cumulative
  );
END;
$$;

-- Grants unchanged (service_role only). Re-declare defensively.
REVOKE ALL ON FUNCTION public.release_faculty_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_faculty_payout(UUID, TEXT) TO service_role;
