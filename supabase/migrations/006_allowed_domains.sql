/*
  Table: allowed_domains
  Purpose: Stores approved email domains for faculty and institution onboarding.
*/

create table if not exists public.allowed_domains (
  id uuid primary key default gen_random_uuid(),
  domain text not null unique,
  allowed_for_role text not null check (allowed_for_role in ('faculty', 'institution')),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_allowed_domains_updated_at
before update on public.allowed_domains
for each row
execute function public.set_updated_at();
