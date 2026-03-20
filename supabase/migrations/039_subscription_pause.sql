/*
  Migration 039: Subscription Pause Fields
  Adds pause_until, pause_count_this_year, and cancellation_reason to profiles.
  subscription_status already exists from migration 028.
*/

alter table public.profiles
  add column if not exists pause_until             timestamptz null,
  add column if not exists pause_count_this_year   integer     not null default 0,
  add column if not exists cancellation_reason     text        null;

comment on column public.profiles.pause_until is
  'When pause expires and subscription auto-resumes. NULL when not paused.';
comment on column public.profiles.pause_count_this_year is
  'Number of pauses taken this calendar year. Max 2.';
comment on column public.profiles.cancellation_reason is
  'Reason chosen by user when cancelling. Stored for product insights.';
