-- ════════════════════════════════════════════════════════════════
-- Migration 092 — Add-on Saathi Subscriptions + Companionship
-- ════════════════════════════════════════════════════════════════

-- ── 1. saathi_addons ──────────────────────────────────────────
-- Tracks paid ₹99/month add-on Saathis per student.

CREATE TABLE IF NOT EXISTS saathi_addons (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id       UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  razorpay_sub_id   TEXT,                          -- Razorpay subscription ID
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'cancelled', 'expired')),
  price_inr         INTEGER NOT NULL DEFAULT 99,
  billing_cycle     TEXT NOT NULL DEFAULT 'monthly',
  starts_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_billing_at   TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, vertical_id)
);

-- ── 2. companionship_milestones ───────────────────────────────
-- Tracks when full companionship is reached per Saathi.
-- Prevents the card from showing multiple times.

CREATE TABLE IF NOT EXISTS companionship_milestones (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id   UUID NOT NULL REFERENCES verticals(id) ON DELETE CASCADE,
  reached_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  card_shown_sidebar  BOOLEAN NOT NULL DEFAULT false,
  card_shown_chat     BOOLEAN NOT NULL DEFAULT false,
  action_taken        TEXT,  -- 'points', 'paid', 'dismissed'
  UNIQUE (user_id, vertical_id)
);

-- ── 3. Indexes ────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_saathi_addons_user
  ON saathi_addons (user_id, status);

CREATE INDEX IF NOT EXISTS idx_companionship_user
  ON companionship_milestones (user_id);

-- ── 4. RLS ────────────────────────────────────────────────────

ALTER TABLE saathi_addons              ENABLE ROW LEVEL SECURITY;
ALTER TABLE companionship_milestones   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "addons_own"   ON saathi_addons
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "addons_admin" ON saathi_addons
  FOR ALL USING (is_admin());
CREATE POLICY "addons_service" ON saathi_addons
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "milestones_own"   ON companionship_milestones
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "milestones_admin" ON companionship_milestones
  FOR ALL USING (is_admin());
CREATE POLICY "milestones_service" ON companionship_milestones
  FOR ALL USING (auth.role() = 'service_role');

-- ── 5. check_companionship RPC ────────────────────────────────
-- Called client-side after each session.
-- Returns whether full companionship was JUST reached.

CREATE OR REPLACE FUNCTION check_companionship(
  p_user_id    UUID,
  p_vertical_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sessions     INTEGER;
  v_depth        INTEGER;
  v_first_session TIMESTAMPTZ;
  v_flame_stage  TEXT;
  v_already_reached BOOLEAN;
  v_days_since   INTEGER;
BEGIN
  -- Already reached? Return early
  SELECT true INTO v_already_reached
  FROM companionship_milestones
  WHERE user_id = p_user_id AND vertical_id = p_vertical_id;

  IF v_already_reached THEN
    RETURN jsonb_build_object('just_reached', false, 'already_reached', true);
  END IF;

  -- Get soul data
  SELECT
    session_count,
    COALESCE(depth_score, 0),
    created_at,
    COALESCE(flame_stage, 'spark')
  INTO v_sessions, v_depth, v_first_session, v_flame_stage
  FROM student_soul
  WHERE user_id = p_user_id AND vertical_id = p_vertical_id;

  IF v_sessions IS NULL THEN
    RETURN jsonb_build_object('just_reached', false, 'reason', 'no_soul_data');
  END IF;

  v_days_since := EXTRACT(DAY FROM now() - v_first_session)::INTEGER;

  -- Companionship conditions:
  -- 10+ sessions, depth > 60, 14+ days, flame stage not 'spark'
  IF v_sessions >= 10
     AND v_depth >= 60
     AND v_days_since >= 14
     AND v_flame_stage != 'spark'
  THEN
    -- Mark milestone
    INSERT INTO companionship_milestones (user_id, vertical_id)
    VALUES (p_user_id, p_vertical_id)
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
      'just_reached',  true,
      'sessions',      v_sessions,
      'depth_score',   v_depth,
      'days_together', v_days_since,
      'flame_stage',   v_flame_stage
    );
  END IF;

  -- Return progress toward companionship
  RETURN jsonb_build_object(
    'just_reached',       false,
    'sessions',           v_sessions,
    'sessions_needed',    GREATEST(0, 10 - v_sessions),
    'depth_score',        v_depth,
    'depth_needed',       GREATEST(0, 60 - v_depth),
    'days_together',      v_days_since,
    'days_needed',        GREATEST(0, 14 - v_days_since),
    'flame_ok',           v_flame_stage != 'spark'
  );
END;
$$;

-- ── 6. mark_companionship_card_shown ─────────────────────────

CREATE OR REPLACE FUNCTION mark_companionship_card_shown(
  p_user_id     UUID,
  p_vertical_id UUID,
  p_location    TEXT  -- 'sidebar' or 'chat'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_location = 'sidebar' THEN
    UPDATE companionship_milestones
    SET card_shown_sidebar = true
    WHERE user_id = p_user_id AND vertical_id = p_vertical_id;
  ELSE
    UPDATE companionship_milestones
    SET card_shown_chat = true
    WHERE user_id = p_user_id AND vertical_id = p_vertical_id;
  END IF;
END;
$$;

-- ── 7. get_saathi_suggestions ─────────────────────────────────
-- Returns top 3 Saathi suggestions based on soul profile.
-- Excludes already enrolled Saathis.

CREATE OR REPLACE FUNCTION get_saathi_suggestions(
  p_user_id UUID
)
RETURNS TABLE (
  vertical_id   UUID,
  score         INTEGER,
  reason        TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_institution    TEXT;
  v_academic_level TEXT;
  v_future_subjects TEXT[];
  v_current_vertical UUID;
BEGIN
  -- Get student profile data
  SELECT
    institution_name,
    primary_saathi_id
  INTO v_institution, v_current_vertical
  FROM profiles WHERE id = p_user_id;

  -- Get soul data for future subjects
  SELECT
    academic_level,
    future_subjects
  INTO v_academic_level, v_future_subjects
  FROM student_soul
  WHERE user_id = p_user_id AND vertical_id = v_current_vertical
  LIMIT 1;

  -- Return verticals NOT already enrolled, scored by relevance
  -- Score logic: future_subjects match = +50, institution hint = +20
  -- For now return all non-enrolled ordered by id (AI suggestion
  -- happens client-side using the soul data)
  RETURN QUERY
  SELECT
    v.id AS vertical_id,
    50 AS score,
    'Based on your learning profile' AS reason
  FROM verticals v
  WHERE NOT EXISTS (
    SELECT 1 FROM saathi_enrollments e
    WHERE e.user_id = p_user_id AND e.vertical_id = v.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM saathi_addons a
    WHERE a.user_id = p_user_id AND a.vertical_id = v.id
      AND a.status = 'active'
  )
  AND v.id != v_current_vertical
  LIMIT 10;
END;
$$;
