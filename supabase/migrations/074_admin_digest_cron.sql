-- Migration 074: Admin digest CRON schedules + supporting tables
-- Creates daily (8 AM IST) and weekly (Monday 9 AM IST) digest jobs,
-- plus the cron_job_log and edge_function_errors tables used by platform-health.

-- ── Enable pg_cron (must be enabled in Supabase Dashboard extensions first) ──

-- ── Supporting tables ────────────────────────────────────────────────────────

create table if not exists cron_job_log (
  job_id           text primary key,
  last_run_at      timestamptz,
  next_run_at      timestamptz,
  status           text check (status in ('ok', 'error', 'running')) default 'ok',
  records_affected integer default 0,
  updated_at       timestamptz default now()
);

create table if not exists edge_function_errors (
  id               uuid primary key default gen_random_uuid(),
  function_name    text not null,
  error_message    text,
  user_id          uuid references auth.users(id) on delete set null,
  created_at       timestamptz default now()
);

-- Index for fast recent-errors query used by platform-health
create index if not exists idx_efe_created_at on edge_function_errors (created_at desc);

-- RLS — admin only via service role (these tables are internal)
alter table cron_job_log      enable row level security;
alter table edge_function_errors enable row level security;

-- Service role bypasses RLS automatically; no explicit policy needed for admin reads.
-- Deny all anon/authenticated access:
create policy "no_public_access_cron_log"
  on cron_job_log for all using (false);

create policy "no_public_access_efe"
  on edge_function_errors for all using (false);

-- Note: CRON schedules for admin-digest are configured in Supabase Dashboard:
--   Edge Functions → admin-digest → Schedule
--   Daily:  30 2 * * *   (8:00 AM IST)
--   Weekly: 30 3 * * 1   (Monday 9:00 AM IST)

-- Seed initial cron_job_log rows so platform-health shows all 11 jobs from day one
insert into cron_job_log (job_id, status) values
  ('refresh-saathi-stats',   'ok'),
  ('rss-fetch',              'ok'),
  ('expire-learning-intents','ok'),
  ('check-minimum-seats',    'ok'),
  ('send-24h-reminders',     'ok'),
  ('send-1h-reminders',      'ok'),
  ('auto-release-payments',  'ok'),
  ('auto-lift-suspensions',  'ok'),
  ('expire-referral-wallet', 'ok'),
  ('admin-daily-digest',     'ok'),
  ('admin-weekly-digest',    'ok')
on conflict (job_id) do nothing;
