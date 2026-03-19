/*
  Table: student_subjects
  Purpose: Stores enrolled and future subject mappings for each student.
*/

create table if not exists public.student_subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text references public.verticals(id) on delete set null,
  subject_name text not null,
  subject_type text not null check (subject_type in ('enrolled', 'future')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, vertical_id, subject_name, subject_type)
);

create trigger trg_student_subjects_updated_at
before update on public.student_subjects
for each row
execute function public.set_updated_at();
