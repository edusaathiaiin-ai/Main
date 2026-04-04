-- 089_board_question_quota.sql
--
-- Server-side enforcement of daily board question limits per plan.
-- free: 2/day  |  plus: 10/day  |  pro: 25/day  |  unlimited/faculty: 999

-- ── Helper: today in IST ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_today_ist()
RETURNS DATE
LANGUAGE SQL
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::DATE
$$;

-- ── Helper: quota by plan ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.get_board_quota(
  p_plan_id TEXT,
  p_role    TEXT DEFAULT 'student'
)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE
    WHEN p_role IN ('faculty', 'admin')  THEN 999
    WHEN p_plan_id = 'unlimited'         THEN 999
    WHEN p_plan_id LIKE 'unlimited%'     THEN 999
    WHEN p_plan_id LIKE 'pro%'           THEN 25
    WHEN p_plan_id LIKE 'plus%'          THEN 10
    ELSE 2   -- free / null / unknown
  END
$$;

-- ── Main quota check function ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.can_post_board_question(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id TEXT;
  v_role    TEXT;
  v_quota   INTEGER;
  v_used    INTEGER;
  v_today   DATE := public.get_today_ist();
BEGIN
  -- Fetch plan + role (SECURITY DEFINER bypasses RLS on profiles)
  SELECT plan_id, COALESCE(role, 'student')
  INTO   v_plan_id, v_role
  FROM   public.profiles
  WHERE  id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'allowed',    false,
      'used',       0,
      'limit',      0,
      'remaining',  0,
      'resets_at',  (v_today + 1)::TEXT || 'T00:00:00+05:30'
    );
  END IF;

  v_quota := public.get_board_quota(v_plan_id, v_role);

  -- Count questions posted today (IST)
  SELECT COUNT(*)
  INTO   v_used
  FROM   public.board_questions
  WHERE  user_id = p_user_id
    AND  (created_at AT TIME ZONE 'Asia/Kolkata')::DATE = v_today;

  RETURN jsonb_build_object(
    'allowed',   (v_used < v_quota),
    'used',      v_used,
    'limit',     v_quota,
    'remaining', GREATEST(0, v_quota - v_used),
    'resets_at', (v_today + 1)::TEXT || 'T00:00:00+05:30'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_post_board_question(UUID) TO authenticated;

-- ── RLS: enforce quota on INSERT ───────────────────────────────────────────

DROP POLICY IF EXISTS board_questions_student_write ON public.board_questions;

CREATE POLICY board_questions_student_write
  ON public.board_questions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Must be posting as yourself
    user_id = auth.uid()
    -- Must have quota remaining (SECURITY DEFINER fn sees real data)
    AND (public.can_post_board_question(auth.uid()) ->> 'allowed')::boolean = true
    -- Must be an eligible role
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE  p.id = auth.uid()
        AND  p.role IN ('student', 'faculty', 'admin', 'public')
    )
  );
