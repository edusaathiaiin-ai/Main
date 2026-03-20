/*
  Migration: 029_rss_feed_health.sql
  Purpose: Tracks failed RSS feed fetches for admin visibility.
           Service role inserts on each failed run.
           Admin can mark issues resolved via resolved_at.
*/

create table if not exists public.rss_feed_health (
  id            uuid        primary key default gen_random_uuid(),
  vertical_id   text        not null,
  feed_url      text        not null,
  source_name   text        not null,
  error_message text        not null,
  failed_at     timestamptz not null default now(),
  resolved_at   timestamptz null,

  constraint rss_feed_health_feed_url_unique unique (feed_url)
);

-- Indexes
create index if not exists rss_feed_health_vertical_idx
  on public.rss_feed_health (vertical_id);

create index if not exists rss_feed_health_failed_at_idx
  on public.rss_feed_health (failed_at desc);

-- Enable RLS
alter table public.rss_feed_health enable row level security;

-- Service role: full access (inserts from Edge Function)
create policy rss_feed_health_service_role_all
  on public.rss_feed_health
  for all
  to service_role
  using (true)
  with check (true);

-- Admin role: can mark feeds as resolved
create policy rss_feed_health_admin_update
  on public.rss_feed_health
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
