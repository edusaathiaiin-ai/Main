-- ═══════════════════════════════════════════════════════════════════════════════
-- 132 — Live session payouts + post-session notes
--
-- Phase 3 of live sessions: what happens after the session ends.
--
--   (1) payout columns on live_sessions — parallel to faculty_sessions (1:1).
--       20% platform fee model is already decided (migration 063 header).
--       Payout is released per live_session after all its live_lectures are
--       status='completed'.
--
--   (2) notes_url columns on live_lectures — faculty uploads a PDF/link after
--       the lecture; students receive it by email.
--
--   (3) release_live_session_payout(session_id) RPC — atomic payout release,
--       parallel to release_faculty_payout() from migration 084 but reads
--       live_sessions gross from paid bookings.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── live_sessions: payout tracking ─────────────────────────────────────────
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS payout_status        TEXT        NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_released_at   TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS gross_revenue_paise  INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS faculty_payout_paise INTEGER     NULL,
  ADD COLUMN IF NOT EXISTS completed_at         TIMESTAMPTZ NULL;

-- payout_status enum check: pending | released | on_hold
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_sessions_payout_status_check'
  ) THEN
    ALTER TABLE public.live_sessions
      ADD CONSTRAINT live_sessions_payout_status_check
      CHECK (payout_status IN ('pending', 'released', 'on_hold'));
  END IF;
END $$;

-- ── live_lectures: post-session notes ──────────────────────────────────────
ALTER TABLE public.live_lectures
  ADD COLUMN IF NOT EXISTS notes_url              TEXT        NULL,
  ADD COLUMN IF NOT EXISTS notes_uploaded_at      TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS notes_sent_to_students BOOLEAN     NOT NULL DEFAULT false;

-- ── Atomic payout release for a live_session ───────────────────────────────
-- Called by admin or by the faculty self-service endpoint (via service role).
-- Returns JSONB: { ok: bool, error?: text, payout_id?: uuid, net_paise?: int }

CREATE OR REPLACE FUNCTION public.release_live_session_payout(
  p_session_id UUID,
  p_upi_id     TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session          live_sessions%ROWTYPE;
  v_incomplete_count INTEGER;
  v_gross            INTEGER;
  v_platform_fee     INTEGER;
  v_faculty_gross    INTEGER;
  v_tds              INTEGER;
  v_net              INTEGER;
  v_upi              TEXT;
  v_payout_id        UUID;
BEGIN
  -- Lock the session row
  SELECT * INTO v_session
    FROM live_sessions
   WHERE id = p_session_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;

  IF v_session.payout_status = 'released' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_released');
  END IF;

  IF v_session.payout_status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payout_not_pending');
  END IF;

  -- All lectures must be completed before payout can release.
  SELECT COUNT(*) INTO v_incomplete_count
    FROM live_lectures
   WHERE session_id = p_session_id
     AND status NOT IN ('completed', 'cancelled');

  IF v_incomplete_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lectures_not_completed');
  END IF;

  -- Compute gross from paid bookings (source of truth — never trust precomputed).
  SELECT COALESCE(SUM(amount_paid_paise), 0) INTO v_gross
    FROM live_bookings
   WHERE session_id = p_session_id
     AND payment_status = 'paid';

  IF v_gross = 0 THEN
    -- Free session or nothing was paid — mark released with zero to close it cleanly.
    UPDATE live_sessions
       SET payout_status       = 'released',
           payout_released_at  = now(),
           gross_revenue_paise = 0,
           faculty_payout_paise = 0,
           updated_at          = now()
     WHERE id = p_session_id;
    RETURN jsonb_build_object('ok', true, 'payout_id', NULL, 'net_paise', 0, 'tds_paise', 0, 'zero_payout', true);
  END IF;

  -- 20% platform fee → 80% faculty gross
  v_platform_fee  := (v_gross * 20) / 100;
  v_faculty_gross := v_gross - v_platform_fee;

  -- TDS: 10% if faculty gross > ₹300 (30000 paise)
  v_tds := CASE WHEN v_faculty_gross > 30000 THEN (v_faculty_gross * 10 / 100) ELSE 0 END;
  v_net := v_faculty_gross - v_tds;

  -- Resolve UPI: param overrides, then fall back to faculty_profiles.
  IF p_upi_id IS NOT NULL AND p_upi_id <> '' THEN
    v_upi := p_upi_id;
  ELSE
    SELECT payout_upi_id INTO v_upi
      FROM faculty_profiles
     WHERE user_id = v_session.faculty_id;
  END IF;

  -- Mark session as released + record revenue snapshot
  UPDATE live_sessions
     SET payout_status        = 'released',
         payout_released_at   = now(),
         gross_revenue_paise  = v_gross,
         faculty_payout_paise = v_faculty_gross,
         updated_at           = now()
   WHERE id = p_session_id;

  -- Insert payout record (reuses faculty_payouts — same table as 1:1 payouts).
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
    v_faculty_gross,
    v_tds,
    v_net,
    COALESCE(v_upi, ''),
    'processing',
    now()
  )
  RETURNING id INTO v_payout_id;

  -- Increment faculty earnings (same transaction).
  UPDATE faculty_profiles
     SET total_earned_paise       = total_earned_paise + v_net,
         total_tds_deducted_paise = total_tds_deducted_paise + v_tds,
         updated_at               = now()
   WHERE user_id = v_session.faculty_id;

  RETURN jsonb_build_object(
    'ok', true,
    'payout_id', v_payout_id,
    'gross_paise', v_gross,
    'platform_fee_paise', v_platform_fee,
    'faculty_gross_paise', v_faculty_gross,
    'tds_paise', v_tds,
    'net_paise', v_net
  );
END;
$$;

REVOKE ALL ON FUNCTION public.release_live_session_payout(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_live_session_payout(UUID, TEXT) TO service_role;

-- ── Indexes for payout queries ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_live_sessions_payout_status
  ON live_sessions(payout_status, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_lectures_notes_pending
  ON live_lectures(session_id, notes_sent_to_students)
  WHERE notes_url IS NOT NULL AND notes_sent_to_students = false;
