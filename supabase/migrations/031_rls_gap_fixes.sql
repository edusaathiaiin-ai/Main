/*
  Migration: 031_rls_gap_fixes.sql

  Fixes three RLS gaps identified in audit:

  1. profiles — faculty and institution roles had no SELECT/UPDATE policy.
     They couldn't read or update their own profile via the client SDK.

  2. subscriptions — service_role write policy used auth.role() (wrong function).
     Replaced with correct `to service_role` grant pattern used everywhere else.

  3. rss_feed_health — no admin SELECT policy. Admin dashboard couldn't query
     broken feeds without a service_role client.

  Run in Supabase SQL Editor.
*/

-- ────────────────────────────────────────────────────────────────────────────
-- 1. profiles — faculty can read/update their own row
-- ────────────────────────────────────────────────────────────────────────────

create policy profiles_faculty_own
  on public.profiles
  for all
  to authenticated
  using (
    id = auth.uid()
    and role = 'faculty'
  )
  with check (
    id = auth.uid()
    and role = 'faculty'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 2. profiles — institution can read/update their own row
-- ────────────────────────────────────────────────────────────────────────────

create policy profiles_institution_own
  on public.profiles
  for all
  to authenticated
  using (
    id = auth.uid()
    and role = 'institution'
  )
  with check (
    id = auth.uid()
    and role = 'institution'
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 3. profiles — admin can read ALL profiles (for admin dashboard user list)
-- ────────────────────────────────────────────────────────────────────────────

create policy profiles_admin_read_all
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 4. subscriptions — fix broken service_role write policy
--    auth.role() is not reliable; drop and recreate using `to service_role`
-- ────────────────────────────────────────────────────────────────────────────

drop policy if exists "subscriptions: service role write" on public.subscriptions;

create policy subscriptions_service_role_all
  on public.subscriptions
  for all
  to service_role
  using (true)
  with check (true);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. rss_feed_health — admin can SELECT to view broken feeds
--    (service_role all already exists from 029_rss_feed_health.sql)
-- ────────────────────────────────────────────────────────────────────────────

create policy rss_feed_health_admin_read
  on public.rss_feed_health
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
