-- Migration 075: Subscription refund tracking fields
-- Adds razorpay_refund_id + refunded_at to subscriptions table

alter table public.subscriptions
  add column if not exists razorpay_refund_id text,
  add column if not exists refunded_at         timestamptz,
  add column if not exists refund_amount_inr   integer;      -- may be partial

-- Note: faculty_sessions.razorpay_refund_id will be added when migration 062 is applied.

-- Index for refund ID lookups from webhook
create index if not exists idx_subscriptions_payment_id
  on public.subscriptions(razorpay_payment_id)
  where razorpay_payment_id is not null;

create index if not exists idx_subscriptions_refund_id
  on public.subscriptions(razorpay_refund_id)
  where razorpay_refund_id is not null;
