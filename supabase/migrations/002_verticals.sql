/*
  Table: verticals
  Purpose: Stores Saathi vertical configurations used across product modules.
*/

create table if not exists public.verticals (
  id text primary key,
  name text not null unique,
  emoji text not null,
  tagline text not null,
  primary_color text not null,
  accent_color text not null,
  bg_color text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_primary_saathi_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_primary_saathi_id_fkey
      foreign key (primary_saathi_id)
      references public.verticals(id)
      on delete set null;
  end if;
end $$;

create trigger trg_verticals_updated_at
before update on public.verticals
for each row
execute function public.set_updated_at();
