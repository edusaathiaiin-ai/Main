/*
  Table: intern_listings
  Purpose: Stores internship opportunities posted by institution users.
*/

create table if not exists public.intern_listings (
  id uuid primary key default gen_random_uuid(),
  institution_user_id uuid not null references public.profiles(id) on delete cascade,
  vertical_id text references public.verticals(id) on delete set null,
  title text not null,
  company_name text not null,
  description text not null,
  location text,
  mode text check (mode in ('onsite', 'remote', 'hybrid')),
  stipend text,
  application_url text,
  apply_by date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_intern_listings_updated_at
before update on public.intern_listings
for each row
execute function public.set_updated_at();
