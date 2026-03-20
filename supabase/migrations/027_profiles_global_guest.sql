/*
  Migration: 027_profiles_global_guest
  Purpose: Add global guest tier fields to profiles table
*/

alter table public.profiles
  add column if not exists country text,
  add column if not exists is_global_guest boolean not null default false,
  add column if not exists timezone text;

create index if not exists idx_profiles_country on public.profiles(country);
create index if not exists idx_profiles_is_global_guest on public.profiles(is_global_guest);
