-- ────────────────────────────────────────────────────────────────────────
-- 108_fix_check_companionship_depth_col.sql
--
-- Fix: check_companionship RPC referenced student_soul.depth_score but the
-- actual column is session_depth_avg (added in migration 085 as part of the
-- soul v2 rewrite). Calling this RPC returns PostgREST 400 "Bad Request"
-- because the column doesn't exist.
--
-- Surfaced in browser console during Phase 1 analytics debugging.
-- Observed error: POST /rest/v1/rpc/check_companionship 400
-- ────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION check_companionship(
  p_user_id    UUID,
  p_vertical_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sessions        INTEGER;
  v_depth           INTEGER;
  v_first_session   TIMESTAMPTZ;
  v_flame_stage     TEXT;
  v_already_reached BOOLEAN;
  v_days_since      INTEGER;
BEGIN
  -- Already reached? Return early.
  SELECT true INTO v_already_reached
  FROM companionship_milestones
  WHERE user_id = p_user_id AND vertical_id = p_vertical_id;

  IF v_already_reached THEN
    RETURN jsonb_build_object('just_reached', false, 'already_reached', true);
  END IF;

  -- Get soul data (column: session_depth_avg, not depth_score)
  SELECT
    session_count,
    COALESCE(session_depth_avg, 0),
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
  -- 10+ sessions, depth_avg >= 60, 14+ days, flame_stage past 'spark'
  IF v_sessions >= 10
     AND v_depth >= 60
     AND v_days_since >= 14
     AND v_flame_stage != 'spark'
  THEN
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
