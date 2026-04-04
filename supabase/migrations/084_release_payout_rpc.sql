-- 084_release_payout_rpc.sql
--
-- Atomic payout release RPC.
-- Called by admin-only API route when releasing a session payout to faculty.
--
-- Steps (all in one transaction):
--   1. Lock the faculty_session row (FOR UPDATE) to prevent double-release
--   2. Verify payout_status is 'pending' and session status is 'completed'
--   3. Calculate TDS (10 % if gross > 30,000 paise, else 0)
--   4. Update faculty_sessions → payout_status = 'released'
--   5. Insert into faculty_payouts
--   6. Increment faculty_profiles.total_earned_paise
--
-- Returns JSONB: { ok: bool, error?: text, payout_id?: uuid }

CREATE OR REPLACE FUNCTION public.release_faculty_payout(
  p_session_id UUID,
  p_upi_id     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session        faculty_sessions%ROWTYPE;
  v_gross          INTEGER;
  v_tds            INTEGER;
  v_net            INTEGER;
  v_upi            TEXT;
  v_payout_id      UUID;
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

  -- Calculate TDS: 10% if gross > ₹300 (30000 paise), else 0
  v_gross := v_session.faculty_payout_paise;
  v_tds   := CASE WHEN v_gross > 30000 THEN (v_gross * 10 / 100) ELSE 0 END;
  v_net   := v_gross - v_tds;

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

  -- Insert payout record
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
    'processing',
    now()
  )
  RETURNING id INTO v_payout_id;

  -- Increment faculty earnings (atomic — same transaction as the UPDATE above)
  UPDATE faculty_profiles
     SET total_earned_paise       = total_earned_paise + v_net,
         total_tds_deducted_paise = total_tds_deducted_paise + v_tds,
         updated_at               = now()
   WHERE user_id = v_session.faculty_id;

  RETURN jsonb_build_object('ok', true, 'payout_id', v_payout_id, 'net_paise', v_net, 'tds_paise', v_tds);
END;
$$;

-- Only service_role may call this (admin API route uses service role key)
REVOKE ALL ON FUNCTION public.release_faculty_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_faculty_payout(UUID, TEXT) TO service_role;
