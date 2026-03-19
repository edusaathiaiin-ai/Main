/*
  Table: intern_interests
  Purpose: Stores student interest and application state for internship listings.
*/

create table if not exists public.intern_interests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.intern_listings(id) on delete cascade,
  student_user_id uuid not null references public.profiles(id) on delete cascade,
  statement text,
  status text not null default 'applied' check (status in ('applied', 'shortlisted', 'rejected', 'selected', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (listing_id, student_user_id)
);

create trigger trg_intern_interests_updated_at
before update on public.intern_interests
for each row
execute function public.set_updated_at();
