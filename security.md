# EdUsaathiAI Security Audit Report
> Audited: 2026-03-25 · Auditor: Antigravity AI  
> Scope: website, admin, supabase/functions, mobile hooks

---

## Summary

| Category | Total Found | Fixed | Status |
|---|---|---|---|
| Exposed API keys | 0 | — | ✅ Clean |
| Unprotected routes | 1 | 1 | ✅ Fixed |
| Missing auth checks | 1 | 1 | ✅ Fixed |
| Unsanitised inputs | 2 | 2 | ✅ Fixed |
| Weak auth method | 1 | 1 | ✅ Fixed |
| One-time function not gated | 1 | 1 | ✅ Fixed |

---

## Findings

### ✅ CLEAN — No hardcoded secrets
All 7 API keys (Anthropic, Groq, xAI, Razorpay, Resend, Supabase service_role, Redis) are accessed exclusively via `Deno.env.get()` in Edge Functions or `process.env` in Next.js. No secrets found in TypeScript source.  
**No fix required.**

---

### ✅ CLEAN — Admin portal fully protected
All admin routes call `requireAdmin()` which verifies the Supabase session and asserts `role = 'superadmin'`. The layout itself also calls it. Double-guarded.  
**No fix required.**

---

### ✅ CLEAN — Razorpay webhook integrity
`razorpay-webhook/index.ts` verifies the `X-Razorpay-Signature` HMAC-SHA256 signature using constant-time comparison (`match |= a ^ b`). Skipping or forging a valid payment order requires knowing `RAZORPAY_WEBHOOK_SECRET`.  
**No fix required.**

---

### ✅ CLEAN — Edge Function JWT guards
All user-facing Edge Functions (`chat`, `soul-update`, `session-register`, `parse-education`, `auto-add-college`, `checkin-eval`, `pause-subscription`, `resume-subscription`, `razorpay-order`) verify the JWT via `userClient.auth.getUser()` before processing.  
**No fix required.**

---

### ✅ CLEAN — Cron functions gated
`rss-fetch`, `quota-reset`, `health-monitor`, `weekly-eval` all require `x-cron-secret` matching `CRON_SECRET` env var.  
**No fix required.**

---

### 🔴 FIXED — [P2] `auto-add-college`: No max-length on string inputs
**File:** `supabase/functions/auto-add-college/index.ts`  
**Risk:** An authenticated user could insert a 1MB college name string into the `colleges` table, causing DB bloat and bypassing typical payload assumptions.  
**Fix:** Added max-length validation (200 chars for name, 100 chars for city/state, 50-item max for courses array, each course max 20 chars).  
**Status:** ✅ Fixed

---

### 🟡 FIXED — [P2] `pricing/page.tsx`: Uses `getSession()` instead of `getUser()`
**File:** `website/src/app/pricing/page.tsx`  
**Risk:** `getSession()` reads from the local cookie without verifying the JWT with Supabase Auth servers. A crafted cookie could fake a session. `getUser()` makes a network call and validates the JWT signature.  
**Fix:** Replaced `supabase.auth.getSession()` with `supabase.auth.getUser()`.  
**Status:** ✅ Fixed

---

### 🟡 FIXED — [P2] Middleware: `/onboard` not in PROTECTED list
**File:** `website/src/lib/supabase/middleware.ts`  
**Risk:** An unauthenticated user can access `/onboard` directly, bypassing the login redirect. Onboarding writes to `profiles` and `student_soul` — unauthenticated access would 401 at the DB level (RLS), but the page would render for a moment.  
**Fix:** Added `/onboard` to the `PROTECTED` array.  
**Status:** ✅ Fixed

---

### 🟡 FIXED — [P3] `migrate-soul-levels`: No CRON_SECRET gate
**File:** `supabase/functions/migrate-soul-levels/index.ts`  
**Risk:** This one-time migration function accepts any valid Supabase service_role Bearer token. Any developer with the service_role key could re-run it accidentally. Adding a CRON_SECRET check prevents unintentional re-runs.  
**Fix:** Added `x-cron-secret` header check as additional guard.  
**Status:** ✅ Fixed

---

## Remaining Notes (acceptable risk)

| Item | Assessment |
|---|---|
| CORS `*` on all Edge Functions | Acceptable — all requests are JWT-gated; CORS origin is irrelevant when auth is required |
| `auto-add-college` uses deprecated `serve()` | Functional, not a security risk; refactoring to `Deno.serve()` is a housekeeping task |
| `getSession()` in `auth/callback/page.tsx` | Acceptable — callback is only called right after OAuth redirect, session is freshly issued |
