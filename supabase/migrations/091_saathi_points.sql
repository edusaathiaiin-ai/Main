-- ════════════════════════════════════════════════════════════════
-- Migration 091 — Saathi Points System
-- ════════════════════════════════════════════════════════════════

-- ── 1. student_points ──────────────────────────────────────────
-- One row per student. Total + lifetime (lifetime never decreases).
-- target_saathi_id is what the student is "saving toward".

CREATE TABLE IF NOT EXISTS student_points (
  user_id          UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  total_points     INTEGER NOT NULL DEFAULT 0,
  lifetime_points  INTEGER NOT NULL DEFAULT 0,
  target_saathi_id UUID REFERENCES verticals(id) ON DELETE SET NULL,
  last_earned_at   TIMESTAMPTZ,
  streak_days      INTEGER NOT NULL DEFAULT 0,
  last_session_date DATE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. point_transactions ──────────────────────────────────────
-- Every earning event logged here for audit + analytics.

CREATE TABLE IF NOT EXISTS point_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  -- action_type values:
  --   chat_session      daily first chat with a Saathi
  --   streak_bonus      7-day streak
  --   checkin           learning check-in completed
  --   flashcard_saved   flashcard saved from chat
  --   board_question    question posted to community board
  --   sketch_upload     sketch uploaded and analysed
  --   faculty_session   faculty 1:1 session booked
  --   shell_broken      depth milestone reached
  --   plus_bonus        1.5x multiplier applied (logged separately)
  --   admin_grant       manually granted by admin
  metadata    JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3. saathi_enrollments ─────────────────────────────────────
-- Which Saathis each student has access to.
-- primary = assigned at onboarding (no points cost)
-- points  = unlocked via Saathi Points
-- admin_grant = manually unlocked by admin

CREATE TABLE IF NOT EXISTS saathi_enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id   UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  unlock_method TEXT NOT NULL CHECK (unlock_method IN ('primary', 'points', 'admin_grant', 'plus_grant')),
  points_spent  INTEGER NOT NULL DEFAULT 0,
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vertical_id)
);

-- ── 4. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_point_transactions_user
  ON point_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saathi_enrollments_user
  ON saathi_enrollments (user_id);

CREATE INDEX IF NOT EXISTS idx_saathi_enrollments_vertical
  ON saathi_enrollments (vertical_id);

-- ── 5. Seed primary Saathi enrollments for all existing users ─
-- Every existing user gets their primary_saathi_id as an enrollment.

INSERT INTO saathi_enrollments (user_id, vertical_id, unlock_method, points_spent)
SELECT
  p.id,
  p.primary_saathi_id,
  'primary',
  0
FROM profiles p
WHERE p.primary_saathi_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM saathi_enrollments e
    WHERE e.user_id = p.id AND e.vertical_id = p.primary_saathi_id
  );

-- ── 6. Seed student_points rows for all existing users ────────

INSERT INTO student_points (user_id, total_points, lifetime_points)
SELECT id, 0, 0
FROM profiles
WHERE role = 'student'
  AND NOT EXISTS (
    SELECT 1 FROM student_points sp WHERE sp.user_id = profiles.id
  );

-- ── 7. RLS ────────────────────────────────────────────────────

ALTER TABLE student_points       ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE saathi_enrollments   ENABLE ROW LEVEL SECURITY;

-- student_points: student reads/writes own row
DROP POLICY IF EXISTS "student_points_own"     ON student_points;
DROP POLICY IF EXISTS "student_points_admin"   ON student_points;
DROP POLICY IF EXISTS "student_points_service" ON student_points;

CREATE POLICY "student_points_own" ON student_points
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "student_points_admin" ON student_points
  FOR ALL USING (is_admin());

CREATE POLICY "student_points_service" ON student_points
  FOR ALL USING (auth.role() = 'service_role');

-- point_transactions: student reads own, service writes
DROP POLICY IF EXISTS "point_tx_own_read" ON point_transactions;
DROP POLICY IF EXISTS "point_tx_admin"    ON point_transactions;
DROP POLICY IF EXISTS "point_tx_service"  ON point_transactions;

CREATE POLICY "point_tx_own_read" ON point_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "point_tx_admin" ON point_transactions
  FOR ALL USING (is_admin());

CREATE POLICY "point_tx_service" ON point_transactions
  FOR ALL USING (auth.role() = 'service_role');

-- saathi_enrollments: student reads own
DROP POLICY IF EXISTS "enrollments_own_read" ON saathi_enrollments;
DROP POLICY IF EXISTS "enrollments_admin"    ON saathi_enrollments;
DROP POLICY IF EXISTS "enrollments_service"  ON saathi_enrollments;

CREATE POLICY "enrollments_own_read" ON saathi_enrollments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "enrollments_admin" ON saathi_enrollments
  FOR ALL USING (is_admin());

CREATE POLICY "enrollments_service" ON saathi_enrollments
  FOR ALL USING (auth.role() = 'service_role');

-- ── 8. award_saathi_points RPC ────────────────────────────────
-- Called by Edge Functions with service_role.
-- Handles: earning, streak, 1.5x multiplier, threshold detection.

CREATE OR REPLACE FUNCTION award_saathi_points(
  p_user_id     UUID,
  p_action_type TEXT,
  p_base_points INTEGER,
  p_plan_id     TEXT DEFAULT 'free',
  p_metadata    JSONB DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
      -- Missed a day — reset streak
      v_new_streak := 1;
    ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
      -- Consecutive day
      v_new_streak := COALESCE(v_streak, 0) + 1;
    ELSE
      -- Already chatted today
      v_new_streak := COALESCE(v_streak, 1);
    END IF;

    -- 7-day streak bonus
    IF v_new_streak > 0 AND v_new_streak % 7 = 0 THEN
      v_streak_bonus := ROUND(50 * v_multiplier);
      INSERT INTO point_transactions (user_id, points, action_type, metadata)
      VALUES (p_user_id, v_streak_bonus, 'streak_bonus',
              jsonb_build_object('streak_days', v_new_streak));
    END IF;
  ELSE
    v_new_streak := COALESCE(v_streak, 0);
  END IF;

  -- Insert main transaction
  INSERT INTO point_transactions (user_id, points, action_type, metadata)
  VALUES (p_user_id, v_final_points, p_action_type,
          p_metadata || jsonb_build_object(
            'base_points', p_base_points,
            'multiplier', v_multiplier,
            'plan_id', p_plan_id
          ));

  -- Log bonus row if Plus
  IF v_bonus_points > 0 THEN
    INSERT INTO point_transactions (user_id, points, action_type, metadata)
    VALUES (p_user_id, v_bonus_points, 'plus_bonus',
            jsonb_build_object('source_action', p_action_type));
  END IF;

  -- Update totals
  UPDATE student_points
  SET
    total_points     = total_points + v_final_points + v_streak_bonus,
    lifetime_points  = lifetime_points + v_final_points + v_streak_bonus,
    last_earned_at   = now(),
    streak_days      = v_new_streak,
    last_session_date = CASE
      WHEN p_action_type = 'chat_session' THEN v_today
      ELSE last_session_date
    END,
    updated_at = now()
  WHERE user_id = p_user_id
  RETURNING total_points, lifetime_points INTO v_new_total, v_new_lifetime;

  -- Check unlock thresholds (500, 1200, 2500, 4000, 5500, ...)
  -- Return whether a threshold was just crossed
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
$$;

-- ── 9. unlock_saathi RPC ──────────────────────────────────────
-- Called client-side when student confirms unlock.
-- Validates points, deducts, creates enrollment.

CREATE OR REPLACE FUNCTION unlock_saathi(
  p_user_id     UUID,
  p_vertical_id UUID,
  p_points_cost INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_points INTEGER;
BEGIN
  -- Check current balance
  SELECT total_points INTO v_current_points
  FROM student_points WHERE user_id = p_user_id;

  IF v_current_points IS NULL OR v_current_points < p_points_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient Saathi Points');
  END IF;

  -- Check not already enrolled
  IF EXISTS (
    SELECT 1 FROM saathi_enrollments
    WHERE user_id = p_user_id AND vertical_id = p_vertical_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already enrolled');
  END IF;

  -- Deduct points
  UPDATE student_points
  SET total_points = total_points - p_points_cost,
      updated_at   = now()
  WHERE user_id = p_user_id;

  -- Log deduction
  INSERT INTO point_transactions (user_id, points, action_type, metadata)
  VALUES (p_user_id, -p_points_cost, 'saathi_unlock',
          jsonb_build_object('vertical_id', p_vertical_id));

  -- Create enrollment
  INSERT INTO saathi_enrollments (user_id, vertical_id, unlock_method, points_spent)
  VALUES (p_user_id, p_vertical_id, 'points', p_points_cost);

  RETURN jsonb_build_object('success', true, 'enrolled_at', now());
END;
$$;
