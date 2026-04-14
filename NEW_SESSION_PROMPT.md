# EdUsaathiAI — New Session Prompt

> Read this BEFORE touching code. Captures end-of-day state on **2026-04-14**
> so the next session doesn't reconstruct context from `git log`.

---

## What shipped on 2026-04-14 (23 commits, all on `main`)

### Faculty pipeline — fully functional end-to-end

| Piece | State | File / Route |
|---|---|---|
| Public landing | LIVE | [/teach](website/src/app/teach/page.tsx) — 6 sections, application form (13 fields, emails admin) |
| Application receive | LIVE | Form posts → admin dashboard |
| Verification | LIVE | Notifications + correct columns + edge-centralised |
| Read/write schema | ALIGNED | "Option A" — single source of truth resolved (c083385) |
| Payouts cron | LIVE | Weekly cron + correct TDS |
| Payouts admin | LIVE | `/admin/payouts` — Mark as Paid, summary strip, audit trail |
| Homepage CTA | LIVE | Faculty tab → gold button → `/teach` |

The whole faculty journey now works: apply → admin verifies → faculty profile
goes live → payouts run weekly → admin marks paid. No known blockers.

### Saathi Horizons — career-pathways feature LIVE

- **DB**: `saathi_horizons` table (migration 116) — **120 rows seeded**
  across all 30 Saathis. ~4 horizons per Saathi.
- **Admin page**: `/horizons` — full CRUD for Layer 1 fields (title,
  description, inspiration, today_action, today_prompt, category,
  difficulty, academic_levels).
- **Public surface**: floating draggable panel on `/chat`, anchored
  bottom-right, position persists in `localStorage`. Sidebar CTA
  `✦ Your Horizon` opens it via `horizon:open` window event.
- **Per-Saathi theming**: panel uses `var(--saathi-primary)` — adapts
  to NursingSaathi crimson, KanoonSaathi navy, etc. Was hardcoded gold
  before today.
- **Three-moment handoff** when student clicks `Start this conversation →`:
  1. Button: `scale 0.96` + ring pulse + label → `Opening…`
  2. Prompt typewriters into chat input over ~400ms, border halo flashes
  3. Textarea focuses, send button shimmers, hint
     `Your Saathi is ready — press Enter to begin ✦` fades for 3s.
     Source card dims to 0.6 with `✓ Added to chat` badge.
  Coordination via `CustomEvent('horizon:prompt')` — InputArea owns the
  typewriter so ChatWindow needs no orchestration.

### Sidebar journey redesign

- New `Your Horizon` row with breathing ✦ icon (animation isolated to
  the icon, not the whole row), Saathi-aware copy `What [SaathiName]
  students achieve`, and live `{N} paths →` badge fetched on Saathi change.
- Active-item visual: 2px left accent stripe via `inset 2px 0 0 ${accent}`
  box-shadow — no layout shift.
- `ExpandableSidebarItem` now accepts `description` and `iconClassName`
  props (overriding the static `SIDEBAR_CTA_META` map).

### Auth + onboarding polish

- Magic-link waiting screen — countdown timer, resend button, corporate
  email tip.

### Infra / docs

- `verify_jwt = false` added for **all** cron-triggered edge functions
  (was breaking silently — same class of bug as the WhatsApp webhook
  outage in early April).
- CLAUDE.md §10 — documents `proposed_slots` two-shape quirk
  (`lecture_requests` vs `faculty_sessions`).
- CLAUDE.md §26 — Known Gaps section started.
- Disambiguated `verticals` FK join in `send-welcome-email` and admin users page.
- Stale Saathi count fixed across homepage (24 → **30**).

---

## Known gaps — pick up here

### 1:1 session reminders not wired
Documented in [CLAUDE.md §26](CLAUDE.md). `send-session-reminders`
covers `live_lectures` (group). `faculty_sessions` (1:1) have **no
reminders today** — students/faculty get no T07/T08/T12 for 1:1.

Deferred because zero `faculty_sessions` rows exist. Build trigger:
**first paid 1:1 session lands**. ~1hr of work — see §26 for the
exact migration + edge function diff to apply.

### Saathi Horizons — Layer 2 fields (deadlines, external_links)
Only mutable via SQL today. Admin UI at `/horizons` covers Layer 1
(evergreen text) only. To edit a deadline or update a broken link,
must run SQL against `saathi_horizons.deadlines` (JSONB) or
`saathi_horizons.external_links` (JSONB).

The weekly `flag-stale-horizons` cron (Mondays 09:00 UTC) sets
`needs_verification = true` on rows older than 90 days, and the public
panel auto-hides Layer 2 details for those rows — so we degrade
gracefully, but the admin UX for refresh is missing.

Build when first stale flag appears (≈90 days from seed = ~mid-July 2026)
or when a faculty author asks to edit their own horizon.

### Sidebar design rules — partial
Today's pass shipped the Horizon-specific items (breathing icon,
Saathi-aware copy, paths badge, active stripe). Still TODO from the
broader design rules in that brief:
- Section labels: tiny caps, `--saathi-primary`, 8px spacing
- Mobile: collapse section labels, show only icons + labels

Not blocking — sidebar works fine without these. Bundle with next
sidebar touch.

---

## Where things live (quick map)

```
website/src/components/chat/
  SaathiHorizon.tsx     ← floating panel + HorizonCard
  InputArea.tsx          ← horizon:prompt listener + typewriter
  ChatWindow.tsx         ← mounts SaathiHorizon

website/src/components/layout/
  Sidebar.tsx            ← Your Horizon CTA + ExpandableSidebarItem

website/src/app/
  teach/page.tsx         ← faculty landing
  admin/horizons/page.tsx ← Layer-1 admin CRUD
  admin/payouts/page.tsx  ← Mark as Paid

supabase/migrations/
  116_saathi_horizons.sql ← table + RLS + weekly stale cron

website/src/app/globals.css
  .horizon-breathe       ← 2.8s opacity 0.7↔1.0 keyframe
  .horizon-scroll        ← thin scrollbar for cards container
```

---

## Pre-deploy checklist (unchanged)

```bash
cd website && npm run test:saathis   # 13/13 must pass
npx tsc --noEmit                     # must be clean
git push origin main                 # Vercel auto-deploys
```

---

## Open environment notes

- Branch: `main` (no feature branches in flight)
- HEAD: `7474bb1` — `feat(horizon): per-Saathi theming + alive Start-Conversation handoff`
- Working tree: clean except `.claude/settings.local.json` (local-only, never commit)
- Vercel: auto-deploys on push; `https://www.edusaathiai.in` reflects `main` within ~2 min

---

*Last updated: 2026-04-14 evening*
