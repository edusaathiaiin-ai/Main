/*
  Migration: Backfill updated_at columns and triggers
  Purpose: Adds missing updated_at columns/triggers for existing tables created before migration 001-020.
*/

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter table if exists public.profiles add column if not exists updated_at timestamptz not null default now();
alter table if exists public.verticals add column if not exists updated_at timestamptz not null default now();
alter table if exists public.bot_personas add column if not exists updated_at timestamptz not null default now();
alter table if exists public.student_soul add column if not exists updated_at timestamptz not null default now();
alter table if exists public.student_subjects add column if not exists updated_at timestamptz not null default now();
alter table if exists public.allowed_domains add column if not exists updated_at timestamptz not null default now();
alter table if exists public.chat_sessions add column if not exists updated_at timestamptz not null default now();
alter table if exists public.checkin_results add column if not exists updated_at timestamptz not null default now();
alter table if exists public.notes_saved add column if not exists updated_at timestamptz not null default now();
alter table if exists public.board_questions add column if not exists updated_at timestamptz not null default now();
alter table if exists public.board_answers add column if not exists updated_at timestamptz not null default now();
alter table if exists public.moderation_flags add column if not exists updated_at timestamptz not null default now();
alter table if exists public.news_items add column if not exists updated_at timestamptz not null default now();
alter table if exists public.exam_calendar add column if not exists updated_at timestamptz not null default now();
alter table if exists public.intern_listings add column if not exists updated_at timestamptz not null default now();
alter table if exists public.intern_interests add column if not exists updated_at timestamptz not null default now();
alter table if exists public.dpdp_requests add column if not exists updated_at timestamptz not null default now();

do $$
declare
  tbl text;
  tables text[] := array[
    'profiles', 'verticals', 'bot_personas', 'student_soul', 'student_subjects',
    'allowed_domains', 'chat_sessions', 'checkin_results', 'notes_saved',
    'board_questions', 'board_answers', 'moderation_flags', 'news_items',
    'exam_calendar', 'intern_listings', 'intern_interests', 'dpdp_requests'
  ];
begin
  foreach tbl in array tables loop
    if to_regclass(format('public.%I', tbl)) is not null then
      execute format('drop trigger if exists trg_%I_updated_at on public.%I', tbl, tbl);
      execute format(
        'create trigger trg_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
        tbl,
        tbl
      );
    end if;
  end loop;
end
$$;
