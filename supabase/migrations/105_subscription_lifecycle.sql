-- Migration 105: Subscription lifecycle tracking
-- Tracks renewal reminder emails and expiry notifications to avoid duplicates.

-- ── renewal_reminders_sent ─────────────────────────────────────────────────
-- One row per reminder sent per subscription period. Prevents duplicate emails.

create table if not exists renewal_reminders_sent (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  reminder_type  text not null check (reminder_type in ('3_day', 'expired')),
  expires_at     timestamptz not null,
  sent_at        timestamptz not null default now(),
  unique (user_id, reminder_type, expires_at)
);

-- RLS — service role only (cron function uses service key)
alter table renewal_reminders_sent enable row level security;

create policy "no_public_access_renewal_reminders"
  on renewal_reminders_sent for all using (false);

-- Index for fast lookup during cron
create index if not exists idx_rrs_user_type
  on renewal_reminders_sent (user_id, reminder_type, expires_at);

-- Seed cron_job_log so platform-health tracks this job
insert into cron_job_log (job_id, status)
  values ('subscription-lifecycle', 'ok')
  on conflict (job_id) do nothing;
