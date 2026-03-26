-- Migration 050: Enable RLS on news_items
-- The table already has RLS policies (news_items_authenticated_read,
-- news_items_service_role_all) but RLS was never turned on, making
-- the policies effectively dead. This enables the enforcement.

ALTER TABLE public.news_items ENABLE ROW LEVEL SECURITY;
