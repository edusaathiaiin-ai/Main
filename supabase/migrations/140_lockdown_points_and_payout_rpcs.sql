-- 140_lockdown_points_and_payout_rpcs.sql
--
-- Security hardening of three RPCs flagged during the 2026-04-24
-- post-incident audit (the same audit that surfaced the ambiguous-
-- column bug in book_live_session_seat, migration 138).
--
-- All three had EXECUTE granted to anon + authenticated + service_role
-- with ZERO in-body caller verification:
--
--   award_saathi_points          — any anon could award any user any points
--   release_faculty_payout       — any authenticated user could trigger
--                                   a faculty-session payout release
--   release_live_session_payout  — same, for live-session payouts
--
-- This migration installs two layers of defence for each:
--
--   (1) IN-BODY GUARDS. A RAISE at the top of BEGIN that refuses the
--       call unless the caller is service_role (auth.uid() IS NULL) or
--       the correct user / admin. Defence in depth.
--
--   (2) GRANT TIGHTENING. REVOKE from anon always. REVOKE from
--       authenticated on the two payout functions (they are only
--       called by service_role from auto-release-payments and
--       /api/faculty/payouts/release). Keep authenticated on
--       award_saathi_points because MessageBubble.tsx:681 calls it
--       client-side (always with p_user_id = auth.uid(), handled by
--       the in-body guard).
--
-- Bodies below are the EXACT current production bodies (captured via
-- pg_get_functiondef 2026-04-24) with the auth guard inserted at the
-- top of BEGIN. No behavioural changes otherwise.

-- ═════════════════════════════════════════════════════════════════════
-- 1. award_saathi_points — prevent cross-user point manipulation
-- ═════════════════════════════════════════════════════════════════════
-- Legitimate callers:
--   - Edge functions (service_role): chat, soul-update, checkin-eval,
--     board-answer, report-factual-error, verify-correction
--   - MessageBubble.tsx:681 client-side, always with
--     p_user_id = auth.uid() (awards points to self only)
-- The guard allows:
--   - auth.uid() IS NULL  → service_role, bypass
--   - auth.uid() = p_user_id → user awarding self, allow
--   - is_admin() → admin awarding anyone, allow
--   - Otherwise → RAISE

CREATE OR REPLACE FUNCTION public.award_saathi_points(
  p_user_id      uuid,
  p_action_type  text,
  p_base_points  integer,
  p_plan_id      text DEFAULT 'free'::text,
  p_metadata     jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_multiplier      NUMERIC := 1.0;
  v_final_points    INTEGER;
  v_bonus_points    INTEGER := 0;
  v_new_total       INTEGER;
  v_new_lifetime    INTEGER;
  v_streak          INTEGER;
  v_today           DATE := CURRENT_DATE;
  v_last_date       DATE;
  v_new_streak      INTEGER;
  v_streak_bonus    INTEGER := 0;
  v_threshold_hit   INTEGER := NULL;
BEGIN
  -- AUTH GUARD (added 2026-04-24). Anonymous Postgres calls have
  -- auth.uid() = NULL which is how service_role invocations look —
  -- those bypass the guard. Logged-in users may only award points
  -- to themselves unless they hold the admin role.
  IF auth.uid() IS NOT NULL
     AND auth.uid() <> p_user_id
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'unauthorized: cannot award points to another user';
  END IF;

  -- Plus plan multiplier
  IF p_plan_id ILIKE 'plus%' OR p_plan_id ILIKE 'pro%'
     OR p_plan_id = 'unlimited' THEN
    v_multiplier := 1.5;
  END IF;

  v_final_points := ROUND(p_base_points * v_multiplier);
  v_bonus_points := v_final_points - p_base_points;

  -- Upsert student_points row
  INSERT INTO student_points (user_id, total_points, lifetime_points, last_earned_at)
  VALUES (p_user_id, 0, 0, now())
  ON CONFLICT (user_id) DO NOTHING;

  -- Get current state
  SELECT streak_days, last_session_date
  INTO v_streak, v_last_date
  FROM student_points WHERE user_id = p_user_id;

  -- Streak logic (only for chat_session action)
  IF p_action_type = 'chat_session' THEN
    IF v_last_date IS NULL OR v_last_date < v_today - INTERVAL '1 day' THEN
      v_new_streak := 1;
    ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
      v_new_streak := COALESCE(v_streak, 0) + 1;
    ELSE
      v_new_streak := COALESCE(v_streak, 1);
    END IF;

    IF v_new_streak > 0 AND v_new_streak % 7 = 0 THEN
      v_streak_bonus := ROUND(50 * v_multiplier);
      INSERT INTO point_transactions (user_id, points, action_type, metadata)
      VALUES (p_user_id, v_streak_bonus, 'streak_bonus',
              jsonb_build_object('streak_days', v_new_streak));
    END IF;
  ELSE
    v_new_streak := COALESCE(v_streak, 0);
  END IF;

  INSERT INTO point_transactions (user_id, points, action_type, metadata)
  VALUES (p_user_id, v_final_points, p_action_type,
          p_metadata || jsonb_build_object(
            'base_points', p_base_points,
            'multiplier', v_multiplier,
            'plan_id', p_plan_id
          ));

  IF v_bonus_points > 0 THEN
    INSERT INTO point_transactions (user_id, points, action_type, metadata)
    VALUES (p_user_id, v_bonus_points, 'plus_bonus',
            jsonb_build_object('source_action', p_action_type));
  END IF;

  UPDATE student_points
  SET
    total_points      = total_points + v_final_points + v_streak_bonus,
    lifetime_points   = lifetime_points + v_final_points + v_streak_bonus,
    last_earned_at    = now(),
    streak_days       = v_new_streak,
    last_session_date = CASE
      WHEN p_action_type = 'chat_session' THEN v_today
      ELSE last_session_date
    END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_points, lifetime_points INTO v_new_total, v_new_lifetime;

  SELECT CASE
    WHEN v_new_total >= 500  AND (v_new_total - v_final_points - v_streak_bonus) < 500  THEN 500
    WHEN v_new_total >= 1200 AND (v_new_total - v_final_points - v_streak_bonus) < 1200 THEN 1200
    WHEN v_new_total >= 2500 AND (v_new_total - v_final_points - v_streak_bonus) < 2500 THEN 2500
    WHEN v_new_total >= 4000 AND (v_new_total - v_final_points - v_streak_bonus) < 4000 THEN 4000
    WHEN v_new_total >= 5500 AND (v_new_total - v_final_points - v_streak_bonus) < 5500 THEN 5500
    ELSE NULL
  END INTO v_threshold_hit;

  RETURN jsonb_build_object(
    'points_awarded',  v_final_points + v_streak_bonus,
    'total_points',    v_new_total,
    'lifetime_points', v_new_lifetime,
    'streak_days',     v_new_streak,
    'streak_bonus',    v_streak_bonus,
    'threshold_hit',   v_threshold_hit
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.award_saathi_points(uuid, text, integer, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_saathi_points(uuid, text, integer, text, jsonb) TO authenticated, service_role;

-- ═════════════════════════════════════════════════════════════════════
-- 2. release_faculty_payout — admin-only
-- ═════════════════════════════════════════════════════════════════════
-- Sole legitimate caller: auto-release-payments edge function (service_role).
-- Admin dashboard release is routed through an edge function, not direct
-- client RPC. In-body guard is defence-in-depth; revoke is primary.

CREATE OR REPLACE FUNCTION public.release_faculty_payout(
  p_session_id uuid,
  p_upi_id     text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_session       faculty_sessions%ROWTYPE;
  v_gross         INTEGER;
  v_tds           INTEGER;
  v_net           INTEGER;
  v_upi           TEXT;
  v_payout_id     UUID;
  v_fy_start      DATE;
  v_fy_cumulative INTEGER;
BEGIN
  -- AUTH GUARD (added 2026-04-24). service_role (auth.uid() IS NULL)
  -- bypasses; everyone else must hold the admin role.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required: payout release is restricted to platform admins';
  END IF;

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

  v_fy_start := make_date(
    EXTRACT(YEAR  FROM NOW() AT TIME ZONE 'Asia/Kolkata')::int
      - CASE
          WHEN EXTRACT(MONTH FROM NOW() AT TIME ZONE 'Asia/Kolkata') < 4 THEN 1
          ELSE 0
        END,
    4, 1
  );

  SELECT COALESCE(SUM(gross_paise), 0)
    INTO v_fy_cumulative
    FROM faculty_payouts
   WHERE faculty_id = v_session.faculty_id
     AND status IN ('pending', 'processing', 'completed')
     AND initiated_at >= v_fy_start;

  v_tds := CASE
    WHEN (v_fy_cumulative + v_gross) > 3000000
      THEN (v_gross * 10 / 100)
    ELSE 0
  END;

  v_net := v_gross - v_tds;

  IF p_upi_id IS NOT NULL AND p_upi_id <> '' THEN
    v_upi := p_upi_id;
  ELSE
    SELECT payout_upi_id INTO v_upi
      FROM faculty_profiles
     WHERE user_id = v_session.faculty_id;
  END IF;

  UPDATE faculty_sessions
     SET payout_status      = 'released',
         payout_released_at = now(),
         updated_at         = now()
   WHERE id = p_session_id;

  INSERT INTO faculty_payouts (
    faculty_id, sessions_included, gross_paise, tds_paise, net_paise,
    upi_id, status, initiated_at
  ) VALUES (
    v_session.faculty_id, ARRAY[p_session_id], v_gross, v_tds, v_net,
    COALESCE(v_upi, ''), 'pending', now()
  )
  RETURNING id INTO v_payout_id;

  UPDATE faculty_profiles
     SET total_earned_paise       = total_earned_paise + v_net,
         total_tds_deducted_paise = total_tds_deducted_paise + v_tds,
         updated_at               = now()
   WHERE user_id = v_session.faculty_id;

  RETURN jsonb_build_object(
    'ok',                  true,
    'payout_id',           v_payout_id,
    'gross_paise',         v_gross,
    'net_paise',           v_net,
    'tds_paise',           v_tds,
    'fy_cumulative_before', v_fy_cumulative
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.release_faculty_payout(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_faculty_payout(uuid, text) TO service_role;

-- ═════════════════════════════════════════════════════════════════════
-- 3. release_live_session_payout — admin-only (parallel to above)
-- ═════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.release_live_session_payout(
  p_session_id uuid,
  p_upi_id     text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- AUTH GUARD (added 2026-04-24). Same pattern as release_faculty_payout.
  IF auth.uid() IS NOT NULL AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'admin_required: payout release is restricted to platform admins';
  END IF;

  SELECT * INTO v_session FROM live_sessions WHERE id = p_session_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'session_not_found');
  END IF;
  IF v_session.payout_status = 'released' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_released');
  END IF;
  IF v_session.payout_status <> 'pending' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'payout_not_pending');
  END IF;

  SELECT COUNT(*) INTO v_incomplete_count
    FROM live_lectures
   WHERE session_id = p_session_id
     AND status NOT IN ('completed', 'cancelled');
  IF v_incomplete_count > 0 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'lectures_not_completed');
  END IF;

  SELECT COALESCE(SUM(amount_paid_paise), 0) INTO v_gross
    FROM live_bookings
   WHERE session_id = p_session_id AND payment_status = 'paid';

  IF v_gross = 0 THEN
    UPDATE live_sessions
       SET payout_status        = 'released',
           payout_released_at   = now(),
           gross_revenue_paise  = 0,
           faculty_payout_paise = 0,
           updated_at           = now()
     WHERE id = p_session_id;
    RETURN jsonb_build_object('ok', true, 'payout_id', NULL, 'net_paise', 0, 'tds_paise', 0, 'zero_payout', true);
  END IF;

  v_platform_fee  := (v_gross * 20) / 100;
  v_faculty_gross := v_gross - v_platform_fee;
  v_tds := CASE WHEN v_faculty_gross > 30000 THEN (v_faculty_gross * 10 / 100) ELSE 0 END;
  v_net := v_faculty_gross - v_tds;

  IF p_upi_id IS NOT NULL AND p_upi_id <> '' THEN
    v_upi := p_upi_id;
  ELSE
    SELECT payout_upi_id INTO v_upi FROM faculty_profiles WHERE user_id = v_session.faculty_id;
  END IF;

  UPDATE live_sessions
     SET payout_status        = 'released',
         payout_released_at   = now(),
         gross_revenue_paise  = v_gross,
         faculty_payout_paise = v_faculty_gross,
         updated_at           = now()
   WHERE id = p_session_id;

  INSERT INTO faculty_payouts (
    faculty_id, sessions_included, gross_paise, tds_paise, net_paise,
    upi_id, status, initiated_at
  ) VALUES (
    v_session.faculty_id, ARRAY[p_session_id], v_faculty_gross, v_tds, v_net,
    COALESCE(v_upi, ''), 'processing', now()
  ) RETURNING id INTO v_payout_id;

  UPDATE faculty_profiles
     SET total_earned_paise       = total_earned_paise + v_net,
         total_tds_deducted_paise = total_tds_deducted_paise + v_tds,
         updated_at               = now()
   WHERE user_id = v_session.faculty_id;

  RETURN jsonb_build_object(
    'ok',                  true,
    'payout_id',           v_payout_id,
    'gross_paise',         v_gross,
    'platform_fee_paise',  v_platform_fee,
    'faculty_gross_paise', v_faculty_gross,
    'tds_paise',           v_tds,
    'net_paise',           v_net
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.release_live_session_payout(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_live_session_payout(uuid, text) TO service_role;

COMMENT ON FUNCTION public.award_saathi_points IS
  'Awards Saathi Points. Auth guard (2026-04-24): only service_role, self-award, or admin may call.';
COMMENT ON FUNCTION public.release_faculty_payout IS
  'Releases a faculty_sessions payout. Auth guard (2026-04-24): only service_role or admin may call.';
COMMENT ON FUNCTION public.release_live_session_payout IS
  'Releases a live_sessions payout. Auth guard (2026-04-24): only service_role or admin may call.';
