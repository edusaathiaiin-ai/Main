-- ═══════════════════════════════════════════════════════
-- Suspension & Policy Enforcement System
-- ═══════════════════════════════════════════════════════

-- Add suspension fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspension_status TEXT NULL,
  -- null=active | warned | suspended | banned
ADD COLUMN IF NOT EXISTS suspension_tier INTEGER NULL,
  -- 1=warning 2=temp(24h) 3=extended(7d) 4=permanent
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS suspension_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS suspension_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_suspended_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;

-- Suspension audit log
CREATE TABLE IF NOT EXISTS suspension_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Action
  action TEXT NOT NULL,
    -- suspend | warn | lift | ban | appeal_accepted | appeal_rejected
  tier INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reason_detail TEXT NULL,

  -- Duration
  suspended_until TIMESTAMPTZ NULL,
  duration_hours INTEGER NULL,

  -- Who did it
  triggered_by TEXT DEFAULT 'auto',
    -- auto | admin | system
  admin_id UUID NULL,
  admin_note TEXT NULL,

  -- Violation that triggered it
  violation_type TEXT NULL,
  violation_count INTEGER NULL,

  -- Student response
  student_appealed BOOLEAN DEFAULT false,
  appeal_note TEXT NULL,
  appeal_resolved_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE suspension_log ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY suspension_admin ON suspension_log
FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- User can see their own
CREATE POLICY suspension_own ON suspension_log
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suspension_user
ON suspension_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_suspended
ON profiles(suspension_status, suspended_until)
WHERE suspension_status IS NOT NULL;

-- Helper RPC: atomically increment suspension_count
CREATE OR REPLACE FUNCTION public.increment_suspension_count(target_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE profiles
  SET suspension_count = COALESCE(suspension_count, 0) + 1
  WHERE id = target_user_id
  RETURNING suspension_count INTO new_count;
  RETURN new_count;
END;
$$;

-- Cron: auto-lift expired Tier 2 suspensions every hour
-- (requires pg_cron extension enabled in Supabase dashboard)
-- SELECT cron.schedule(
--   'auto-lift-suspensions',
--   '0 * * * *',
--   $$
--     UPDATE profiles
--     SET suspension_status = NULL,
--         suspension_tier = NULL,
--         suspended_until = NULL,
--         suspension_reason = NULL
--     WHERE suspension_status = 'suspended'
--       AND suspended_until <= NOW()
--       AND is_banned = false;
--   $$
-- );
