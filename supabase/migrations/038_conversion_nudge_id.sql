/*
  Migration: 038_conversion_nudge_id.sql
  Purpose: Track which specific nudge (by ID) was shown to each user
           per trigger, so the selector can avoid repetition and reset
           after all 20 nudges have been shown.
*/

alter table public.conversion_shown
  add column if not exists nudge_id integer;

alter table public.conversion_shown
  add column if not exists shown_nudge_ids integer[] not null default '{}';

comment on column public.conversion_shown.nudge_id is
  'ID of the last nudge shown for this trigger type';

comment on column public.conversion_shown.shown_nudge_ids is
  'Array of all nudge IDs shown to this user for this trigger. Resets when all seen.';
