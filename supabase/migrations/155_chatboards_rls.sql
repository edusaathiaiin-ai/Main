-- ────────────────────────────────────────────────────────────────────────
-- 155_chatboards_rls.sql
--
-- Enable Row Level Security (RLS) for chatboards table and add policies.
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE public.chatboards ENABLE ROW LEVEL SECURITY;

-- Consolidate policy for owner: full CRUD
DROP POLICY IF EXISTS chatboards_own ON public.chatboards;
CREATE POLICY chatboards_own
ON public.chatboards FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Consolidate policy for admins: full access
DROP POLICY IF EXISTS chatboards_admin ON public.chatboards;
CREATE POLICY chatboards_admin
ON public.chatboards FOR ALL TO authenticated
USING (public.is_admin());

-- Consolidate policy for service role: full access
DROP POLICY IF EXISTS chatboards_service ON public.chatboards;
CREATE POLICY chatboards_service
ON public.chatboards FOR ALL TO service_role
USING (true) WITH CHECK (true);
