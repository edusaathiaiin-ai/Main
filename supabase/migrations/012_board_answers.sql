/*
  Table: board_answers
  Purpose: Stores human and AI answers for community board questions.
*/

create table if not exists public.board_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.board_questions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_ai boolean not null default false,
  is_accepted boolean not null default false,
  faculty_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_board_answers_updated_at
before update on public.board_answers
for each row
execute function public.set_updated_at();
