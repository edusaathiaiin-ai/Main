/*
  Table: checkin_results
  Purpose: Stores Saathi Check-in outcomes and evaluation payloads.
*/

create table if not exists public.checkin_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text not null references public.verticals(id) on delete cascade,
  session_id uuid references public.chat_sessions(id) on delete set null,
  initiated_by text not null check (initiated_by in ('bot', 'student')),
  result_score numeric(5,2),
  result_level text,
  mcq_payload jsonb not null default '[]'::jsonb,
  open_answer_feedback jsonb not null default '[]'::jsonb,
  conversation_feedback jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_checkin_results_updated_at
before update on public.checkin_results
for each row
execute function public.set_updated_at();
