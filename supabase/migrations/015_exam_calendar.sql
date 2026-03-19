/*
  Table: exam_calendar
  Purpose: Stores admin-curated exam dates and references per vertical.
*/

create table if not exists public.exam_calendar (
  id uuid primary key default gen_random_uuid(),
  vertical_id text references public.verticals(id) on delete set null,
  exam_name text not null,
  exam_date date not null,
  description text,
  source_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_exam_calendar_updated_at
before update on public.exam_calendar
for each row
execute function public.set_updated_at();
