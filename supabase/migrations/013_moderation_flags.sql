/*
  Table: moderation_flags
  Purpose: Stores moderation reports for user generated content and bot outputs.
*/

create table if not exists public.moderation_flags (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles(id) on delete set null,
  target_type text not null check (target_type in ('chat_message', 'board_question', 'board_answer', 'note')),
  target_id uuid not null,
  reason text not null,
  details text,
  status text not null default 'open' check (status in ('open', 'in_review', 'resolved', 'rejected')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_moderation_flags_updated_at
before update on public.moderation_flags
for each row
execute function public.set_updated_at();
