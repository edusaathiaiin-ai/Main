/*
  Migration 028: Subscriptions
  Adds subscription fields to profiles + a subscriptions ledger table.
*/

-- Add subscription columns to profiles
alter table public.profiles
  add column if not exists plan_id text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text;

-- Transactions ledger — one row per Razorpay order
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  status text not null default 'created'
    check (status in ('created', 'paid', 'failed', 'cancelled', 'refunded')),
  amount_inr integer not null,
  currency text not null default 'INR',
  webhook_event text,
  raw_webhook jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_subscriptions_updated_at
before update on public.subscriptions
for each row
execute function public.set_updated_at();

-- RLS: users can only see their own subscription rows
alter table public.subscriptions enable row level security;

create policy "subscriptions: users read own"
on public.subscriptions for select
using (auth.uid() = user_id);

-- Service role (webhook) can write
create policy "subscriptions: service role write"
on public.subscriptions for all
using (auth.role() = 'service_role');

-- Index for webhook lookups by order ID
create index if not exists idx_subscriptions_order_id
on public.subscriptions(razorpay_order_id);

create index if not exists idx_subscriptions_user_id
on public.subscriptions(user_id);
