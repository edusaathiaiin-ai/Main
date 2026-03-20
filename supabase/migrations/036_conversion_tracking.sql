/*
  Migration: 036_conversion_tracking.sql
  Purpose: Track which conversion popups have been shown to each user,
           how many times dismissed, and whether they acted on the offer.
           Used by useConversionTrigger hook to enforce frequency caps.
*/

create table if not exists public.conversion_shown (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        references public.profiles(id) on delete cascade,
  trigger_type       text        not null,
  shown_at           timestamptz not null default now(),
  dismissed_count    integer     not null default 0,
  last_dismissed_at  timestamptz,
  acted_on           boolean     not null default false,

  unique (user_id, trigger_type)
);

create index if not exists conversion_shown_user_idx
  on public.conversion_shown (user_id);

-- RLS: users read/write only their own rows
alter table public.conversion_shown enable row level security;

create policy conversion_shown_user_own
  on public.conversion_shown
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy conversion_shown_service_role_all
  on public.conversion_shown
  for all
  to service_role
  using (true)
  with check (true);
