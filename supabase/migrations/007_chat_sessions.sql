/*
  Table: chat_sessions
  Purpose: Tracks per-user chat sessions and quota metadata per bot slot.
*/

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text not null references public.verticals(id) on delete cascade,
  bot_slot smallint not null check (bot_slot between 1 and 5),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  message_count integer not null default 0,
  quota_date_ist date,
  cooling_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_chat_sessions_updated_at
before update on public.chat_sessions
for each row
execute function public.set_updated_at();
