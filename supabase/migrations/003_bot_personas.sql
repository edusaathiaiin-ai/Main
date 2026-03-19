/*
  Table: bot_personas
  Purpose: Stores persona configuration for each bot slot in each Saathi vertical.
*/

create table if not exists public.bot_personas (
  id uuid primary key default gen_random_uuid(),
  vertical_id text not null references public.verticals(id) on delete cascade,
  bot_slot smallint not null check (bot_slot between 1 and 5),
  name text not null,
  role text not null,
  tone text not null,
  specialities text[] not null default '{}',
  never_do text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (vertical_id, bot_slot)
);

create trigger trg_bot_personas_updated_at
before update on public.bot_personas
for each row
execute function public.set_updated_at();
