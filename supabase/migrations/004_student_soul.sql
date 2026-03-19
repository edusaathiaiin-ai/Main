/*
  Table: student_soul
  Purpose: Stores the soul profile state used to personalize learning sessions.
*/

create table if not exists public.student_soul (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text not null references public.verticals(id) on delete cascade,
  display_name text not null,
  ambition_level text not null default 'medium',
  preferred_tone text not null default 'neutral',
  enrolled_subjects text[] not null default '{}',
  future_subjects text[] not null default '{}',
  future_research_area text,
  top_topics text[] not null default '{}',
  struggle_topics text[] not null default '{}',
  last_session_summary text,
  session_count integer not null default 0,
  pace text not null default 'medium',
  curiosity_signature text[] not null default '{}',
  session_energy text not null default 'balanced',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vertical_id)
);

create trigger trg_student_soul_updated_at
before update on public.student_soul
for each row
execute function public.set_updated_at();
