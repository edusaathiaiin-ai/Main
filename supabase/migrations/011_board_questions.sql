/*
  Table: board_questions
  Purpose: Stores community board questions posted by users.
*/

create table if not exists public.board_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text references public.verticals(id) on delete set null,
  title text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'closed', 'archived')),
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_board_questions_updated_at
before update on public.board_questions
for each row
execute function public.set_updated_at();
