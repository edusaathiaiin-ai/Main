/*
  Table: news_items
  Purpose: Stores RSS and curated news metadata for each vertical.
*/

create table if not exists public.news_items (
  id uuid primary key default gen_random_uuid(),
  vertical_id text references public.verticals(id) on delete set null,
  source text not null,
  category text,
  title text not null,
  url text not null unique,
  published_at timestamptz,
  fetched_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_news_items_updated_at
before update on public.news_items
for each row
execute function public.set_updated_at();
