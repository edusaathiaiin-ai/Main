/*
  Table: notes_saved
  Purpose: Stores structured notes generated and saved from study sessions.
*/

create table if not exists public.notes_saved (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text not null references public.verticals(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  title text not null,
  content text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_notes_saved_updated_at
before update on public.notes_saved
for each row
execute function public.set_updated_at();
