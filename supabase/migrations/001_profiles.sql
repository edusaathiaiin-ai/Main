/*
  Table: profiles
  Purpose: Stores core profile records for all authenticated users and roles.
*/

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'faculty', 'public', 'institution')),
  email text not null unique,
  full_name text not null,
  city text,
  institution_name text,
  year_of_study text,
  exam_target text,
  primary_saathi_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();
