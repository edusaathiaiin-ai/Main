# EdUsaathiAI — Technical Specification

> **Version:** 3.0 | **Last updated:** April 2026
> **Status:** Production (Web live, Classroom live, Mobile in development)
> **Maintainer:** Jaydeep Buch, Ahmedabad

This document is the single source of truth for what is built, how it works, and what each part does.
CLAUDE.md defines philosophy and rules. SPEC.md defines reality.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Platforms & Deployment](#2-platforms--deployment)
3. [Database Schema](#3-database-schema)
4. [Edge Functions](#4-edge-functions)
5. [Application Routes](#5-application-routes)
6. [Client Modules](#6-client-modules)
7. [AI System](#7-ai-system)
8. [Soul Engine](#8-soul-engine)
9. [Subscription & Payments](#9-subscription--payments)
10. [Quota & Cooling](#10-quota--cooling)
11. [Content Moderation & Suspensions](#11-content-moderation--suspensions)
12. [WhatsApp Saathi](#12-whatsapp-saathi)
13. [Faculty Ecosystem](#13-faculty-ecosystem)
14. [Live Lectures & Classroom](#14-live-lectures--classroom)
15. [Marketplace](#15-marketplace)
16. [Learning Intent System](#16-learning-intent-system)
17. [News & RSS](#17-news--rss)
18. [Observability & Admin](#18-observability--admin)
19. [Saathi Verticals](#19-saathi-verticals)
20. [Environment Variables](#20-environment-variables)
21. [Cron Jobs](#21-cron-jobs)
22. [Security Model](#22-security-model)
23. [Drift Log](#23-drift-log)

---

## 1. Architecture Overview

```
                    +------------------+
                    |   Supabase       |
                    |   PostgreSQL     |
                    |   (60+ tables)   |
                    |   RLS on all     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------+----------+       +----------+---------+
    | Supabase Edge Fns  |       |   Supabase Auth    |
    | (37 functions)     |       |   Google OAuth     |
    | Deno runtime       |       |   Email OTP/Magic  |
    +----+------+--------+       +--------------------+
         |      |
    +----+    +-+--------+
    |         |          |
+---+---+ +--+----+ +---+------+
| Web   | | Admin | | Mobile   |
| Next  | | Next  | | Expo RN  |
| .js   | | .js   | | Android  |
| Vercel| | Vercel| | (dev)    |
+-------+ +-------+ +----------+
```

| Layer | Technology | Status |
|---|---|---|
| Web App | Next.js 14 + Tailwind | **Live** (edusaathiai.in) |
| Classroom | Next.js 14 + Liveblocks + tldraw | **Live** (/classroom/[id]) |
| Admin | Next.js 14 + Tailwind | **Live** (internal) |
| Mobile | Expo + React Native | **In development** |
| Database | Supabase PostgreSQL + RLS | **Live** (60+ tables) |
| Auth | Supabase Auth (Google OAuth + Email Magic Link) | **Live** |
| AI Primary | Claude API (sonnet-4, haiku-4-5) | **Live** |
| AI Secondary | Groq (llama-3.3-70b) | **Live** |
| AI Fallback | Gemini, Grok (xAI) | **Live** |
| Payments | Razorpay LIVE | **Live** |
| Rate Limiting | Upstash Redis | **Live** |
| Email | Resend (admin@edusaathiai.in) | **Live** |
| WhatsApp | Meta Cloud API | **Live** |
| Canvas Sync | Liveblocks | **Live** (classroom) |
| Error Tracking | Sentry | **Live** |
| Secrets | Doppler (edusaathiai project) | **Live** |

---

## 2. Platforms & Deployment

### 2.1 Web App (`/website/`)
- **Framework:** Next.js 14 (App Router)
- **Hosting:** Vercel, auto-deploy on push to `main`
- **Domain:** edusaathiai.in
- **Auth:** Google OAuth + Email magic link
- **PWA:** Service worker registered, offline page exists

### 2.2 Admin Dashboard (`/admin/`)
- **Hosting:** Vercel (separate project)
- **Auth:** Email + password, admin email whitelist
- **Access:** edusaathiai.in@gmail.com only

### 2.3 Mobile App (`/app/`)
- **Framework:** Expo + React Native + NativeWind
- **Target:** Android first
- **Status:** In development, shares Supabase backend with web

### 2.4 Supabase Project
- **Project ID:** vpmpuxosyrijknbxautx
- **Edge Functions:** 37 deployed
- **Migrations:** 126+ SQL files

### 2.5 Secrets Management
- **Tool:** Doppler (edusaathiai project)
- **Configs:** dev (local), stg (staging), prd (production)
- **Vercel sync:** automatic via Doppler integration
- **Supabase sync:** `bash scripts/sync-doppler-to-supabase.sh`

---

## 3. Database Schema

**60+ tables**, RLS enabled on every table without exception.

### 3.1 Core Tables

| Table | Purpose |
|---|---|
| `profiles` | All users — role, plan, soul FK, WhatsApp, suspension |
| `verticals` | 30 Saathi configurations |
| `bot_personas` | Bot definitions per Saathi per slot (5 slots) |
| `student_soul` | Soul engine — depth, flame, topics, research fields |
| `student_subjects` | Enrolled subjects |
| `chat_sessions` | Quota tracking per user per bot |
| `chat_messages` | Full message history |
| `board_questions` | Community Q&A |
| `board_answers` | Human + AI answers |
| `checkin_results` | Saathi check-in history |
| `notes_saved` | Saved study notes |
| `moderation_flags` | Content reports |
| `news_items` | RSS + curated news |
| `exam_calendar` | Admin-curated exam dates |
| `subscriptions` | Payment ledger |
| `dpdp_requests` | Data deletion/export |
| `consent_log` | Consent audit trail |
| `flashcards` | Spaced repetition |

### 3.2 Faculty Ecosystem

| Table | Purpose |
|---|---|
| `faculty_profiles` | Registration, verification, expertise, pricing |
| `faculty_sessions` | 1:1 paid sessions lifecycle |
| `session_reviews` | Mutual ratings |
| `session_messages` | In-session chat |
| `faculty_payouts` | Payout records (gross, TDS, net, UPI) |
| `faculty_bookmarks` | Student bookmarks |

### 3.3 Live Lecture + Classroom System

| Table | Purpose |
|---|---|
| `live_sessions` | Group lectures — includes classroom columns (delivery_type, external_url, classroom_mode, canvas_snapshot, session_artifacts, saathi_slug, started_at, ended_at) |
| `live_lectures` | Individual lectures within a session |
| `live_bookings` | Student bookings with payment |
| `live_wishlist` | Intent-to-buy |
| `classroom_presence` | Who joined, when, device |
| `classroom_commands` | AI command bar history + artifact log + question log |
| `research_archives` | Permanent research notebook per student per session |
| `homework` | Faculty-assigned homework with 30-min send window |
| `system_tokens` | Refreshable API tokens (e.g. ISRO Bhuvan) |

### 3.4 Marketplace

| Table | Purpose |
|---|---|
| `internship_postings` | Institution + research postings (v2) |
| `intern_applications` | Applications with soul snapshot |
| `intern_matches` | AI-scored matches |
| `research_projects` | Faculty research opportunities |
| `research_applications` | Student research applications |

### 3.5 Learning Intent

| Table | Purpose |
|---|---|
| `learning_intents` | Student learning goals |
| `intent_joiners` | Demand aggregation |
| `lecture_requests` | Direct requests to faculty |

### 3.6 Platform & Admin

| Table | Purpose |
|---|---|
| `whatsapp_sessions` | WhatsApp conversation state |
| `whatsapp_sends` | Send-to-phone audit log |
| `explore_resources` | Curated resources per Saathi |
| `daily_challenges` | Daily MCQ per Saathi |
| `traces` | Chat telemetry (TTFB, tokens, provider) |
| `suspension_log` | Moderation audit |
| `saathi_stats_cache` | Aggregate stats per Saathi |
| `colleges` | Indian college master data |
| `courses` | Degree programs |
| `nudge_log` | Notification audit |
| `fact_corrections` | Verified factual corrections per Saathi |
| `digest_sent_log` | Session digest audit |

### 3.7 Key RPC Functions

| Function | Purpose |
|---|---|
| `search_colleges(query, limit)` | Trigram fuzzy search |
| `book_live_seat(session_id, student_id, order_id)` | Atomic booking with FOR UPDATE |
| `release_faculty_payout(session_id, upi_id)` | Atomic payout |
| `can_post_board_question(user_id)` | Quota check as JSONB |
| `get_today_ist()` | IST date helper |
| `handle_new_user()` | Profile creation trigger |
| `is_admin()` / `is_faculty()` | RLS helpers |

---

## 4. Edge Functions (37 deployed)

### Core Chat & AI
| Function | Provider | Purpose |
|---|---|---|
| `chat` (v138) | Claude/Groq/Gemini/Grok | Main chat, SSE streaming, quota, suspension, inline tags |
| `soul-update` | Groq | Post-session soul analysis |
| `checkin-eval` | Claude | Open-ended check-in evaluation |
| `board-answer` | Groq | AI board answers |
| `board-draft` | Claude | Faculty board draft assist |
| `daily-challenge` | Groq | Daily MCQ generation |

### Payments
`razorpay-order`, `razorpay-webhook`, `pause-subscription`,
`resume-subscription`, `subscription-lifecycle`, `cancel-subscription`

### Auth & Users
`auth-register`, `delete-account`, `process-dpdp-request`

### Notifications
`send-welcome-email`, `send-session-digest`, `send-feedback-alert`,
`send-nudge`, `notify-meeting-link`, `notify-lecture-proposal`,
`whatsapp-webhook`, `weekly-letter`

### Faculty & Sessions
`confirm-lecture-slot`, `session-request`, `match-interns`, `faculty-verify`

### Admin
`admin-digest`, `health-monitor`, `refresh-saathi-stats`,
`generate-recommendations`, `report-factual-error`, `verify-correction`

### Data Integrations
`fetch-wolfram`, `fetch-nasa`, `fetch-chemspider`, `fetch-datagovin`,
`refresh-bhuvan-token`

### Content
`board-draft`, `rss-fetch`

---

## 5. Application Routes

### Web — Public
`/` `/pricing` `/terms` `/privacy` `/login` `/onboard` `/auth/callback`

### Web — Protected (all roles)
`/chat` `/board` `/explore` `/news` `/learn` `/live` `/live/[id]`
`/flashcards` `/profile` `/progress` `/faculty-finder`
`/faculty-finder/[slug]` `/saved-faculty` `/internships` `/requests`

### Web — Student
`/my-sessions`

### Web — Faculty
`/faculty` `/faculty/live` `/faculty/live/create`
`/faculty/requests` `/faculty/sessions` `/faculty/research`

### Web — Classroom (LIVE)
`/classroom/[id]`
`/classroom/[id]?mode=review`

### Web — API Routes
```
/api/classroom/*              15 routes (command, archive, tools, notes)
/api/indiankanoon             case law proxy
/api/nasa                     NASA data proxy
/api/chemspider               molecule data proxy
/api/learning-summary         yesterday's digest
/api/board/quota              board posting quota
```

### Admin Dashboard
16 routes: users, revenue, moderation, observability, whatsapp,
suspensions, faculty, sessions, live, requests, financials,
careers, learning-intents, saathi-stats, nudge-centre, platform-health

---

## 6. Client Modules

### Hooks
`useAuth`, `useQuota`, `useSoul`, `useArtifactLog`, `useAutoQueryHandler`

### Key Libraries
`ai.ts` (SSE streaming), `soul.ts` (server-only system prompt),
`quota.ts` (todayIST), `AutoQueryContext.tsx` (universal TA),
`useAutoQueryHandler.ts` (one-line panel auto-execution)

---

## 7. AI System

### Provider Routing
| Task | Model |
|---|---|
| Deep Q&A | claude-sonnet-4-20250514 |
| WhatsApp + classroom TA + archive summary | claude-haiku-4-5-20251001 |
| Notes, MCQ, soul | llama-3.3-70b-versatile |

### Inline Tool Tags
| Tag | Card | Saathis |
|---|---|---|
| `[CASE:name\|court\|year\|url]` | CaseLawCard | KanoonSaathi |
| `[WOLFRAM:query]` | WolframCard | Maath, Physics, Stats, Chem, Econ |
| `[NASA:query]` | NasaCard | Aerospace, Physics |
| `[CHEMSPIDER:compound]` | ChemSpiderCard | Chem, Pharma, ChemEngg, BioTech |

---

## 8. Soul Engine

18 base fields + 3 classroom fields.
Flame: cold → spark → ember → fire → wings.
Research depth weights: protein +10, wolfram +8, pubmed +6, pdf +5,
geogebra +4, formula +3, code +2, molecule +1.

---

## 9. Subscription & Payments

| Plan | Price | Daily Chats |
|---|---|---|
| free | ₹0 | 5 |
| plus | ₹99/mo (launch) | 20 |
| plus-annual | ₹1,990/yr | 20 |
| unlimited | Internal | ∞ |

Razorpay LIVE. HMAC-verified webhooks.

---

## 10–18. [See CLAUDE.md v3.2 for detailed rules]

---

## 19. Saathi Verticals (30 active)

30 Saathis across STEM, Medical, Social+Law, Commerce.
5 bot slots per Saathi. 4 high-stakes Saathis always use Claude.
See CLAUDE.md for complete slug list.

---

## 20. Environment Variables

Managed via Doppler. Synced to Vercel (auto) and Supabase (script).

---

## 21. Cron Jobs (13 active)

See CLAUDE.md v3.2 for complete schedule.

---

## 22. Security Model

RLS on 60+ tables. JWT on all functions. HMAC on webhooks.
All API keys server-side only. Prompt injection detection.
Tiered suspensions. 24h account age for board posting.

---

## 23. Drift Log

| Area | v2.0 | v3.0 |
|---|---|---|
| Saathis | 24 | 30 |
| Tables | 54 | 60+ |
| Edge Functions | 27 | 37 |
| Classroom | Not mentioned | LIVE |
| Research Archive | Not mentioned | LIVE |
| Inline Tool Tags | Not mentioned | 4 types |
| Secrets | .env.local | Doppler |
| data.gov.in | Not mentioned | 5 datasets |
| Maintainer | IAES | Jaydeep Buch |

---

*EdUsaathiAI — Unified Soul Partnership*
*Jaydeep Buch, Ahmedabad*
*SPEC.md v3.0 — April 2026*
