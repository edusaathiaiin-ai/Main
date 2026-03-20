# Step 10 — Razorpay Subscriptions + Webhook

> **Note:** `PAYMENTS_ACTIVE=false` in [.env](file:///c:/Users/JAYDEEP/EdUsaathiAI/.env) — all paywalls will be no-ops until enabled. This lets you ship and test without blocking free-tier users.

## What Needs to Be Built

| Layer | Gap |
|---|---|
| DB | `profiles` has no subscription fields. No `subscriptions` table |
| Edge Functions | `razorpay-order` (create order) + `razorpay-webhook` (validate + activate) missing |
| Client lib | [lib/razorpay.ts](file:///c:/Users/JAYDEEP/EdUsaathiAI/lib/razorpay.ts) is a stub (throws) |
| Hook | `useSubscription` hook missing |
| UI | `PricingScreen`, `PaywallBanner` — nothing exists |
| Wiring | [ChatScreen](file:///c:/Users/JAYDEEP/EdUsaathiAI/components/chat/ChatScreen.tsx#50-393) has no paywall guard for bot slots 2–4 (Plus-only) |

---

## Proposed Changes

### DB

#### [NEW] [028_subscriptions.sql](file:///c:/Users/JAYDEEP/EdUsaathiAI/supabase/migrations/028_subscriptions.sql)
```sql
-- Add subscription columns to profiles
alter table public.profiles
  add column if not exists plan_id text not null default 'free',
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_expires_at timestamptz,
  add column if not exists razorpay_customer_id text,
  add column if not exists razorpay_subscription_id text;

-- subscriptions table (one row per transaction / renewal)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id text not null,
  razorpay_order_id text not null unique,
  razorpay_payment_id text,
  razorpay_subscription_id text,
  status text not null default 'created', -- created | paid | failed | cancelled
  amount_inr integer not null,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

### Edge Functions

#### [NEW] [razorpay-order/index.ts](file:///c:/Users/JAYDEEP/EdUsaathiAI/supabase/functions/razorpay-order/index.ts)
- Auth-protected POST → `{ planId }`
- Creates a Razorpay Order via API (`RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`)
- Inserts a row in `subscriptions` with `status: 'created'`
- Returns `{ orderId, amount, currency, keyId }` to the client

#### [NEW] [razorpay-webhook/index.ts](file:///c:/Users/JAYDEEP/EdUsaathiAI/supabase/functions/razorpay-webhook/index.ts)
- Verifies `x-razorpay-signature` via HMAC-SHA256 against `RAZORPAY_WEBHOOK_SECRET`
- On `payment.captured`:
  - Updates `subscriptions.status → 'paid'`, stores `razorpay_payment_id`
  - Updates `profiles.plan_id`, `subscription_status → 'active'`, `subscription_expires_at`
- On `subscription.cancelled` / `payment.failed` → marks appropriately
- Returns `200` immediately (Razorpay requires fast ACK)

---

### Client Lib

#### [MODIFY] [razorpay.ts](file:///c:/Users/JAYDEEP/EdUsaathiAI/lib/razorpay.ts)
- `createOrder(planId)` → calls `razorpay-order` Edge Function → returns order params
- `openCheckout(orderParams)` → Razorpay Web Checkout inside `expo-web-browser`
- `verifyPayment(paymentId, orderId, signature)` → signature check on client  
  (server also verifies in webhook — belt + suspenders)

---

### Hook

#### [NEW] [useSubscription.ts](file:///c:/Users/JAYDEEP/EdUsaathiAI/hooks/useSubscription.ts)
- Reads `plan_id`, `subscription_status`, `subscription_expires_at` from `profile`
- Exposes: `isPremium`, `isFoundingMember`, `planId`, `expiresAt`, `openPricing()`
- **60-day founding period detection**: if `profile.created_at` < 60 days ago → auto `isPremium = true` without payment (founding student grace period)

---

### Screens & Components

#### [NEW] [app/(tabs)/pricing.tsx](file:///c:/Users/JAYDEEP/EdUsaathiAI/app/%28tabs%29/pricing.tsx)
- Displays the 3 paid plans (Plus Monthly ₹199 / Plus Annual ₹1499 / Institution ₹4999)
- Free tier chip shown as current
- Founding student countdown shown if applicable
- Tap → triggers `createOrder` → Razorpay checkout → webhook handles activation

#### [NEW] [components/chat/PaywallBanner.tsx](file:///c:/Users/JAYDEEP/EdUsaathiAI/components/chat/PaywallBanner.tsx)
- Shown in ChatScreen when user tries to use bot slot 2–4 without Premium
- Warm, non-punitive: "Bot 2 unlocks with Saathi Plus"
- "Upgrade →" button → `router.push('/pricing')`

---

## Verification Plan

### Automated
```
npx tsc --noEmit  → 0 errors
```

### Manual on Expo Go + Razorpay Test Mode
1. Use Razorpay test credentials (`rzp_test_*`)
2. Set `PAYMENTS_ACTIVE=true` in [.env.local](file:///c:/Users/JAYDEEP/EdUsaathiAI/.env.local)
3. Tap **Upgrade to Plus** on Pricing screen
4. Complete Razorpay test checkout (card: 4111 1111 1111 1111)
5. ✅ `subscriptions` row status → `paid`
6. ✅ `profiles.plan_id` → `plus-monthly`
7. ✅ Bot slots 2–4 unlock in ChatScreen
8. Test webhook signature rejection (corrupt payload → 400)

> [!IMPORTANT]
> Set `PAYMENTS_ACTIVE=false` for production launch until Razorpay KYC is approved.
