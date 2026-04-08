# EdUsaathiAI — Technical Specification

> **Version:** 2.0 | **Last updated:** 2026-04-08
> **Status:** Production (Web live, Mobile in development)
> **Maintainer:** EdUsaathiAI Engineering / IAES, Ahmedabad

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
14. [Live Lectures](#14-live-lectures)
15. [Marketplace (Internships & Research)](#15-marketplace-internships--research)
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
                    |   (54 tables)    |
                    |   RLS on all     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
    +---------+----------+       +----------+---------+
    | Supabase Edge Fns  |       |   Supabase Auth    |
    | (27 functions)     |       |   Google OAuth     |
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
| Web App | Next.js 14 + Tailwind + Shadcn/UI | **Live** (edusaathiai.in) |
| Admin | Next.js 14 + Tailwind | **Live** (internal) |
| Mobile | Expo + React Native | **In development** |
| Database | Supabase PostgreSQL + RLS | **Live** (54 tables) |
| Auth | Supabase Auth (Google OAuth + Email OTP/Magic Link) | **Live** |
| AI Primary | Claude API (claude-sonnet-4-20250514, claude-haiku-4-5-20251001) | **Live** |
| AI Secondary | Groq (llama-3.3-70b-versatile) | **Live** |
| AI Tertiary | Gemini, Grok (xAI) — fallback routing | **Live** |
| Payments | Razorpay (test + live keys) | **Live** |
| Rate Limiting | Upstash Redis | **Live** |
| Email | Resend (GoDaddy domain verified) | **Live** |
| Error Tracking | Sentry | **Live** |
| WhatsApp | Meta Cloud API + Supabase Edge Function | **Deploying** |

---

## 2. Platforms & Deployment

### 2.1 Web App (`/website/`)
- **Framework:** Next.js 14 (App Router)
- **Hosting:** Vercel
- **Domain:** edusaathiai.in
- **Auth:** Google OAuth + Email magic link
- **PWA:** Service worker registered, offline page exists

### 2.2 Admin Dashboard (`/admin/`)
- **Framework:** Next.js 14 (App Router)
- **Hosting:** Vercel (separate project)
- **Auth:** Email + password, admin email whitelist
- **Access:** edusaathiai.in@gmail.com only

### 2.3 Mobile App (`/app/`, `/components/`, `/hooks/`, `/lib/`)
- **Framework:** Expo + React Native + NativeWind
- **Target:** Android first
- **Auth:** Google OAuth + Email OTP (via expo-secure-store)
- **Status:** In development, shares Supabase backend with web

### 2.4 Supabase Project
- **Project ID:** vpmpuxosyrijknbxautx
- **Region:** (default)
- **Edge Functions:** 27 deployed
- **Migrations:** 90+ SQL files

---

## 3. Database Schema

**54 tables**, RLS enabled on every table without exception.

### 3.1 Core Tables (19)

| Table | Purpose | Key Columns | RLS Policies |
|---|---|---|---|
| `profiles` | All users, all roles | id (auth.users FK), role, email, full_name, plan_id, subscription_status, primary_saathi_id, wa_phone, academic_level, suspension_status, is_banned | 6 policies |
| `verticals` | 24 Saathi configurations | id, name, slug, emoji, tagline, colors, is_live, is_active | 2 policies |
| `bot_personas` | Bot definitions per Saathi per slot | vertical_id, bot_slot (1-5), name, role, tone, specialities[], never_do[], system_prompt | 3 policies |
| `student_soul` | Soul matching engine | user_id, vertical_id (unique pair), display_name, depth_calibration, flame_stage, top_topics[], struggle_topics[], session_count | 3 policies |
| `student_subjects` | Enrolled + future subjects | user_id, vertical_id, subject_name, subject_type | 2 policies |
| `chat_sessions` | Quota tracking per user per bot | user_id, vertical_id, bot_slot, message_count, quota_date_ist, cooling_until | 3 policies |
| `chat_messages` | Full message history | session_id, user_id, role, content, vertical_id, bot_slot, is_flagged | 3 policies |
| `board_questions` | Community Q&A questions | user_id, vertical_id, title, body, status, ai_answer | 4 policies |
| `board_answers` | Human + AI answers | question_id, user_id, body, is_ai, is_faculty_answer, faculty_verified | 4 policies |
| `checkin_results` | Saathi Check-in history | user_id, vertical_id, result_score, mcq_payload, open_answer_feedback | 2 policies |
| `notes_saved` | Saved study notes | user_id, vertical_id, title, content, tags[] | 2 policies |
| `moderation_flags` | Content + behavior reports | reporter_user_id, target_type, reason, status, violation_type | 4 policies |
| `news_items` | RSS + curated news | vertical_id, source, title, url, professor_note, domain_verified | 2 policies |
| `exam_calendar` | Admin-curated exam dates | vertical_id, exam_name, exam_date | 2 policies |
| `subscriptions` | Payment transaction ledger | user_id, plan_id, razorpay_order_id, status, amount_inr | 2 policies |
| `dpdp_requests` | Data deletion + export requests | user_id, request_type, status | 2 policies |
| `consent_log` | Consent audit trail | user_id, consent_type, accepted | 2 policies |
| `allowed_domains` | Faculty + institution email whitelist | domain, allowed_for_role, auto_verify | 3 policies |
| `flashcards` | Study flashcards | user_id, vertical_id, front, back | 2 policies |

### 3.2 Faculty Ecosystem (6)

| Table | Purpose |
|---|---|
| `faculty_profiles` | Faculty registration, verification, expertise, session pricing, payout UPI |
| `faculty_sessions` | 1:1 paid sessions (doubt/research/deepdive) with full lifecycle |
| `session_reviews` | Student + faculty mutual ratings |
| `session_messages` | In-session chat messages |
| `faculty_payouts` | Payout records (gross, TDS, net, UPI) |
| `faculty_bookmarks` | Students bookmarking faculty |

### 3.3 Live Lecture System (4)

| Table | Purpose |
|---|---|
| `live_sessions` | Group lectures by faculty (single/series/workshop/recurring) |
| `live_lectures` | Individual lectures within a session |
| `live_bookings` | Student bookings with payment tracking |
| `live_wishlist` | Intent-to-buy for upcoming sessions |

### 3.4 Marketplace (5)

| Table | Purpose |
|---|---|
| `intern_listings` | Legacy institution internship listings |
| `intern_interests` | Legacy internship applications |
| `internship_postings` | Unified institution + research postings (v2) |
| `intern_applications` | Applications with soul snapshot + match score |
| `intern_matches` | AI-scored student-listing matches |
| `research_projects` | Faculty research opportunities |
| `research_applications` | Student research applications |

### 3.5 Learning Intent Marketplace (3)

| Table | Purpose |
|---|---|
| `learning_intents` | Students declare learning goals with preferences |
| `intent_joiners` | Students joining intents to express demand |
| `lecture_requests` | Direct topic requests to specific faculty |

### 3.6 Platform & Admin (10)

| Table | Purpose |
|---|---|
| `institution_profiles` | Organization registration + verification |
| `whatsapp_sessions` | WhatsApp conversation state + daily quota |
| `explore_resources` | Curated learning resources per Saathi |
| `daily_challenges` | Daily MCQ challenges per Saathi |
| `daily_challenge_attempts` | Student attempt + streak tracking |
| `traces` | Chat interaction telemetry (TTFB, tokens, provider) |
| `suspension_log` | Moderation audit trail |
| `saathi_stats_cache` | Aggregated community stats per Saathi |
| `cron_job_log` | Scheduled task monitoring |
| `edge_function_errors` | Error tracking |
| `courses` | Degree programs with year-wise subjects |
| `colleges` | Indian college master data (NAAC-seeded) |
| `conversion_shown` | Feature adoption / nudge tracking |
| `disposable_email_domains` | Email abuse blocklist |
| `rss_feed_health` | Feed monitoring |
| `nudge_log` | Notification audit |
| `auto_nudge_rules` | Toggle nudge automation |

### 3.7 Key Database Functions (RPC)

| Function | Purpose |
|---|---|
| `search_colleges(query, limit)` | Trigram fuzzy search on colleges |
| `search_courses(query, limit)` | Trigram fuzzy search on courses |
| `can_post_board_question(user_id)` | Returns quota check as JSONB |
| `get_board_quota(plan_id, role)` | Quota by plan and role |
| `book_live_seat(session_id, student_id, order_id)` | Atomic seat booking with FOR UPDATE lock |
| `release_faculty_payout(session_id, upi_id)` | Atomic payout release |
| `increment_suspension_count(user_id)` | Atomic suspension counter |
| `generate_faculty_slug(name, institution)` | Unique URL-safe slug |
| `handle_new_user()` | Profile creation trigger on auth signup |
| `is_admin()` / `is_faculty()` / `is_institution()` | Role-checking helpers for RLS |
| `cleanup_old_traces()` | Purge telemetry > 30 days |
| `get_today_ist()` | IST date helper |

---

## 4. Edge Functions

**27 deployed functions** on Supabase Deno runtime.

### 4.1 Core Chat & AI

| Function | Method | AI Provider | Purpose |
|---|---|---|---|
| `chat` | POST | Claude, Groq, Gemini, Grok | Main chat with SSE streaming, quota, suspension, guardrails |
| `soul-update` | POST | Groq | Post-session soul analysis: tone, topics, struggle, flame, summary |
| `checkin-eval` | POST | Claude | Evaluate open-ended check-in answers |
| `board-answer` | POST | Groq | Generate AI answers for board questions |
| `board-draft` | POST | Claude | AI-assisted draft for faculty board answers |
| `daily-challenge` | GET/POST | Groq | Generate + serve daily MCQ challenges |

### 4.2 Onboarding & Auth

| Function | Method | Purpose |
|---|---|---|
| `auth-register` | POST | Registration with email validation, geo-limiting, device tracking |
| `parse-education` | POST | Claude-powered free-text education parsing with fuzzy matching |
| `auto-add-college` | POST | Community college addition when no match found |
| `session-register` | POST | Device session tracking, login count, daily limits by plan |
| `send-welcome-email` | POST | Welcome email via Resend |

### 4.3 Payments

| Function | Method | Purpose |
|---|---|---|
| `razorpay-order` | POST | Create Razorpay orders (subscriptions + faculty sessions) |
| `razorpay-webhook` | POST | Payment/refund/subscription webhook with HMAC verification |
| `pause-subscription` | POST | Pause Razorpay subscription (7/14/30/60 days, max 2/year) |
| `resume-subscription` | POST | Resume paused subscriptions |

### 4.4 Faculty & Sessions

| Function | Method | Purpose |
|---|---|---|
| `session-request` | POST | Faculty session lifecycle (accept, decline, confirm, dispute) |
| `confirm-lecture-slot` | POST | Confirm a lecture time slot |
| `notify-lecture-proposal` | POST | Notify about lecture proposals |
| `notify-meeting-link` | POST | Send meeting link notifications |

### 4.5 Content & Discovery

| Function | Method | Purpose |
|---|---|---|
| `rss-fetch` | POST | Daily RSS fetch (6 AM IST) for all Saathis + professor notes |
| `curate-resources` | POST | Weekly learning resource curation via Claude |
| `match-interns` | POST | Score + match students to internship listings |

### 4.6 Platform Operations

| Function | Method | Purpose |
|---|---|---|
| `quota-reset` | GET/POST | Midnight IST quota reset + cooling expiry |
| `health-monitor` | POST | Hourly P1/P2/P3 checks (quota theft, stale RSS, TTFB) |
| `weekly-eval` | POST | Sunday 9 AM IST metrics report (8 metrics) |
| `weekly-letter` | POST | Sunday 8 AM IST personalized Saathi letter to active users |
| `admin-digest` | POST | Daily/weekly admin digest email with platform metrics |
| `refresh-saathi-stats` | POST | Aggregate community stats per Saathi (every 48h) |
| `eval-flagged` | POST | Auto-triage flagged messages via Claude |
| `migrate-soul-levels` | POST | One-time migration utility |

### 4.7 WhatsApp

| Function | Method | Purpose |
|---|---|---|
| `whatsapp-webhook` | GET/POST | Meta webhook verification + message handling via Claude Haiku |

### 4.8 Shared Modules (`_shared/`)

| Module | Purpose |
|---|---|
| `rateLimit.ts` | Upstash Redis rate limiter |
| `validate.ts` | Input validation (isUUID, sanitize, isOneOf, etc.) |
| `sentry.ts` | Error capture helper |
| `violations.ts` | Violation pattern detection |
| `suspensions.ts` | Suspension check + escalation logic |
| `cors.ts` | CORS headers |
| `chat/guardrails.ts` | Per-Saathi subject boundary definitions |

---

## 5. Application Routes

### 5.1 Web App Routes (`/website/src/app/`)

**Public:**

| Route | Purpose |
|---|---|
| `/` | Landing page (redirects to /chat if authenticated) |
| `/pricing` | Subscription pricing |
| `/terms` | Terms of service |
| `/privacy` | Privacy policy |
| `/login` | Google OAuth + email magic link |
| `/onboard` | Profile completion |
| `/auth/callback` | OAuth callback handler |

**Protected (require auth):**

| Route | Purpose | Role |
|---|---|---|
| `/chat` | Main chat interface with bot selector | All |
| `/board` | Community Q&A board | All |
| `/explore` | Learning content discovery | All |
| `/news` | News feed + exam alerts | All |
| `/learn` | Learning intent marketplace | All |
| `/live` | Live lecture list | All |
| `/live/[id]` | Individual lecture details | All |
| `/my-sessions` | Booked 1:1 sessions | Student |
| `/flashcards` | Spaced repetition review | All |
| `/profile` | User profile + settings | All |
| `/progress` | Learning progress dashboard | All |
| `/faculty-finder` | Search verified faculty | All |
| `/faculty-finder/[slug]` | Faculty profile page | All |
| `/saved-faculty` | Bookmarked faculty | Student |
| `/internships` | Internship marketplace | All |
| `/requests` | Public learning requests | All |
| `/institution` | Institution profile | Institution |

**Faculty routes (role: faculty):**

| Route | Purpose |
|---|---|
| `/faculty` | Faculty dashboard |
| `/faculty/live` | Manage live lectures |
| `/faculty/live/create` | Create new lecture |
| `/faculty/create-material` | Create study materials |
| `/faculty/question-paper` | Create question papers |
| `/faculty/analytics` | Teaching analytics |
| `/faculty/requests` | Student session requests |
| `/faculty/sessions` | Manage 1:1 sessions |
| `/faculty/research` | Research collaboration |
| `/faculty/demand` | Student demand for topics |

**API routes:**

| Route | Purpose |
|---|---|
| `/api/admin/faculty-doc` | Faculty verification doc upload |
| `/api/admin/trigger-rss` | Manual RSS trigger |
| `/api/board/quota` | Board posting quota check |
| `/api/learn/suggest-tags` | AI tag suggestions |
| `/api/notify-admin-doc-upload` | Admin notification for doc upload |

### 5.2 Admin Dashboard Routes (`/admin/app/`)

| Route | Purpose |
|---|---|
| `/users` | User list + search |
| `/users/[id]` | User detail view |
| `/revenue` | Revenue analytics |
| `/moderation` | Content moderation |
| `/observability` | System monitoring |
| `/whatsapp` | WhatsApp management |
| `/suspensions` | Suspension management |
| `/faculty` | Faculty verification |
| `/sessions` | 1:1 session oversight |
| `/live` | Live lecture oversight |
| `/requests` | Learning requests |
| `/financials` | Financial records + CSV export |
| `/careers` | Internship management |
| `/learning-intents` | Intent marketplace management |
| `/saathi-stats` | Per-Saathi analytics |
| `/nudge-centre` | Nudge automation rules |
| `/platform-health` | Health checks + manual cron triggers |

### 5.3 Mobile App Routes (`/app/`)

**Auth flow:** splash -> welcome -> login -> otp-verify -> role-select -> saathi-picker -> profile-setup

**Main tabs:** home, chat, board, news, profile

**Hidden:** checkin (index/flow/result), pricing

---

## 6. Client Modules

### 6.1 Hooks (`/hooks/`)

| Hook | Purpose | Returns |
|---|---|---|
| `useAuth` | Auth context: session, profile, sign-in/out, device ID | user, session, profile, auth methods |
| `useQuota` | Client-side quota state from secure store | limit, remaining, coolingUntil, consumeOne() |
| `useSoul` | Fetch student soul profile for a Saathi | soul, loading, refresh() |
| `useSaathi` | Current Saathi ID from profile | currentSaathiId, setCurrentSaathiId |
| `useSubscription` | Premium status, founding member, pause state | isPremium, planId, daysUntilExpiry |
| `useConversionTrigger` | Nudge/conversion popup gating | shouldShow, markShown(), markDismissed() |

### 6.2 Libraries (`/lib/`)

| Module | Side | Purpose |
|---|---|---|
| `ai.ts` | Client | SSE streaming to /chat edge function, token refresh, soul-update trigger |
| `soul.ts` | **Server only** | buildSystemPrompt() + updateSoulProfile() — never import client-side |
| `instantSoulCalibration.ts` | Shared | Pure TS depth/flame calibration from onboarding data |
| `quota.ts` | Client | Persistent quota tracking with expo-secure-store |
| `razorpay.ts` | Client | Create orders, open checkout in browser |
| `nudgeSelector.ts` | Client | Contextual Hinglish nudge selection with regional scoring |
| `supabase.ts` | Client | Supabase client singleton with secure token storage |
| `sentry.ts` | Client | Sentry initialization helper |
| `rss.ts` | — | Empty; RSS is server-side only via edge function |

### 6.3 Constants (`/constants/`)

| File | Exports |
|---|---|
| `saathis.ts` | 24 Saathi definitions (id, name, emoji, tagline, colors) |
| `bots.ts` | 5 bot slot definitions (slot, name, provider, access, purpose) |
| `plans.ts` | 4 plan tiers: free, plus (199/mo), pro (499/mo), unlimited (4999/mo) |
| `copy.ts` | Conversion popup copy for 5 trigger types |
| `nudges.ts` | 21 Hinglish nudge messages across 8 categories |
| `verticals.ts` | Legacy 3-vertical subset (deprecated) |

### 6.4 Types (`/types/index.ts`)

Key types: `UserRole`, `Profile`, `SoulProfile`, `ChatMessage`, `BotSlot`, `Saathi`

---

## 7. AI System

### 7.1 Provider Routing

| Task | Provider | Model |
|---|---|---|
| Deep Q&A, research, open evaluation | Claude | claude-sonnet-4-20250514 |
| WhatsApp responses | Claude | claude-haiku-4-5-20251001 |
| Notes, MCQ, summaries, board answers | Groq | llama-3.3-70b-versatile |
| Soul summaries, weekly letters | Groq | llama-3.3-70b-versatile |
| Fallback routing | Gemini, Grok (xAI) | configured in chat function |

### 7.2 System Prompt Assembly

Built server-side in `buildSystemPrompt()` (lib/soul.ts) from 4 sources:
1. **Bot persona** — from `bot_personas` table (name, role, tone, specialities, never_do)
2. **Student soul** — from `student_soul` table (name, ambition, tone, subjects, struggles, last session)
3. **Today's news** — top 3 from `news_items` table for the Saathi
4. **Guardrails** — per-Saathi subject boundaries from `chat/guardrails.ts`

Final line always: *"You are not just answering questions. You are shaping a future."*

### 7.3 Per-Saathi Guardrails

Defined in `supabase/functions/chat/guardrails.ts`. Each Saathi has:
- `coreSubjects[]` — what it teaches
- `allowedTopics[]` — adjacent OK topics
- `allowedCrossover[]` — legitimate cross-subject bridges
- `hardBlocked[]` — never discuss
- `redirectMessage` — polite refusal text
- `personalityBoundary` — identity framing

### 7.4 Visualization Components (Web)

Chat responses can include interactive visualizations:
- MindMap, MermaidBlock (diagrams)
- Molecule3DViewer, Molecule3D (chemistry)
- CircuitSimulator (electronics)
- ArchModel3D, ArchTimeline, FloorPlanViewer, GoldenRatioTool (architecture)
- AnatomyViewer (medical)
- MechanismViewer (engineering)

---

## 8. Soul Engine

### 8.1 Seven Signals (student_soul table)

| Signal | Source | Updated |
|---|---|---|
| `display_name` | Profile | On registration |
| `depth_calibration` (0-100) | instantSoulCalibration.ts | On onboarding, refined per session |
| `preferred_tone` | Detected from messages | After each session |
| `top_topics[]` | Extracted from user messages | After each session |
| `struggle_topics[]` | Detected from struggle markers | After each session |
| `flame_stage` | Computed from engagement | After each session |
| `last_session_summary` | Generated by Groq (3 sentences) | After each session |

### 8.2 Flame Stages

`cold` -> `spark` -> `flame` -> `fire` -> `wings`

Progression based on session count, engagement depth, topic consistency.

### 8.3 Depth Calibration Scale

| Academic Level | Base Depth |
|---|---|
| Diploma | 25 |
| Bachelor (year-adjusted) | 30-55 |
| Masters | 70 |
| PhD | 88 |
| Postdoc | 92 |

Bot adjusts language complexity based on depth:
- < 40: Simple language, lots of examples, no jargon
- 40-65: Standard undergraduate, balance theory + application
- 65+: Deep, assume strong foundation, connect to research

### 8.4 Soul Update Flow

After each chat session, `soul-update` edge function:
1. Detects preferred_tone from message patterns
2. Extracts topics discussed -> updates top_topics[]
3. Detects struggle markers -> updates struggle_topics[]
4. Generates 3-sentence session summary via Groq
5. Advances flame_stage if criteria met
6. Increments session_count

---

## 9. Subscription & Payments

### 9.1 Plans

| Plan | Price | Daily Chat Limit | Cooling | Bot Slots | Saathis |
|---|---|---|---|---|---|
| Free | 0 | 5 | 48h | 1, 5 | 1 |
| Plus | 199/mo or 1499/yr | 20 | 48h | All 5 | All 24 |
| Pro | 499/mo or 3999/yr | 50 | 24h | All 5 | All 24 |
| Unlimited | 4999/mo | 9999 | 0h (midnight reset) | All 5 | All 24 |

### 9.2 Founding Student Access

- All users registered before `FOUNDING_PERIOD_END` (2026-09-01) get 60 days full premium free
- No card required
- Day 45: in-session nudge
- Day 55: push notification + email
- Day 60: graceful downgrade to Free

### 9.3 Payment Flow

1. Client calls `razorpay-order` edge function -> creates Razorpay order + subscription row
2. Client opens Razorpay hosted checkout
3. On payment, Razorpay sends webhook to `razorpay-webhook` edge function
4. Webhook verifies HMAC signature, updates subscription + profile
5. Environment-aware: test keys in development, live keys in production

### 9.4 Subscription Pause

- Max 2 pauses per year
- Duration: 7, 14, 30, or 60 days
- Auto-resume via cron when pause expires

---

## 10. Quota & Cooling

### 10.1 Daily Quota

Tracked in `chat_sessions` table per user + vertical + bot_slot + quota_date_ist.

| Plan | Daily Limit | Cooling Duration |
|---|---|---|
| Free | 5 | 48h from last message |
| Plus | 20 | 48h from last message |
| Pro | 50 | 24h from last message |
| Unlimited | 9999 | 0h (midnight IST reset) |

### 10.2 Cooling Rules

- Triggered when daily limit is hit
- Cooling starts from exact time of last message (not midnight)
- During cooling: chat tab shows gentle lock, app redirects to News
- Banner: "Chat resumes in HH:MM:SS"
- News, Board, Profile remain fully active
- Never uses words "limit" or "blocked"

### 10.3 Quota Reset

`quota-reset` edge function runs at midnight IST daily. Resets message_count and clears expired cooling periods.

### 10.4 Board Question Quota

Enforced server-side via RPC `can_post_board_question()`:
- Free: 2/day
- Plus: 10/day
- Pro: 25/day
- Accounts under 24h old: cannot post

---

## 11. Content Moderation & Suspensions

### 11.1 Violation Detection

`violations.ts` detects patterns in user messages:
- Prompt injection attempts
- Abuse / harassment
- Off-topic content
- Policy violations

### 11.2 Suspension Tiers

Tracked in `profiles` (suspension_status, suspension_tier, suspended_until) and `suspension_log`.

| Tier | Duration | Trigger |
|---|---|---|
| Warning | None | First violation |
| Tier 1 | 24 hours | Repeated violations |
| Tier 2 | 7 days | Continued violations |
| Ban | Permanent | Severe or persistent abuse |

### 11.3 Moderation Flow

1. User flags content -> `moderation_flags` table
2. `eval-flagged` edge function auto-triages via Claude
3. 3 flags auto-hide content
4. Admin reviews in `/moderation` dashboard
5. Suspension actions logged in `suspension_log`

### 11.4 WhatsApp Enforcement

Same violation detection + suspension system applies. Banned users get silence, suspended users get one-line message.

---

## 12. WhatsApp Saathi

### 12.1 Architecture

- **Edge Function:** `whatsapp-webhook` (GET for Meta verification, POST for messages)
- **AI Model:** Claude Haiku (fast + cheap, 500 max tokens)
- **Session Store:** `whatsapp_sessions` table (messages JSON, daily count, reset date)
- **Security:** HMAC-SHA256 signature verification via WHATSAPP_APP_SECRET

### 12.2 Environment Variables

| Variable | Purpose |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook verification string |
| `WHATSAPP_TOKEN` | Meta Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp Business phone number ID |
| `WHATSAPP_APP_SECRET` | Meta app secret for HMAC verification |

### 12.3 User Flow

1. First message -> Welcome + Saathi selection list
2. User picks Saathi by number or text
3. Saathi selected -> chat begins with soul-aware prompts
4. Commands: HELP, STATUS, PROFILE, SWITCH, STOP/UNSUBSCRIBE, START/RESTART

### 12.4 Quota (WhatsApp)

| Plan | Daily Messages |
|---|---|
| Free | 5 |
| Plus | 20 |
| Pro | 50 |
| Unlimited | 999 |

Resets at midnight IST. Rate limited: 20 messages/phone/minute (anti-loop).

### 12.5 Formatting Rules

WhatsApp responses: max 250 words, no markdown headers, *bold* and _italic_ only, numbered lists, no LaTeX/HTML/code blocks. Language auto-detected (Hindi, Gujarati, Hinglish, English).

---

## 13. Faculty Ecosystem

### 13.1 Faculty Registration

1. Faculty signs up with role = faculty
2. Creates `faculty_profiles` record
3. Uploads verification document
4. Admin reviews in `/faculty` admin page
5. On approval: verified badge, session capabilities enabled

### 13.2 Verification Statuses

`pending` -> `verified` | `rejected`

Badge types: `faculty_verified`, `emeritus`, `expert_verified`, `pending`

Employment statuses: `active`, `retired`, `independent`

### 13.3 Faculty Sessions (1:1)

Types: `doubt` (quick help), `research` (guidance), `deepdive` (extended)

Lifecycle: `requested` -> `accepted` -> `paid` -> `confirmed` -> `completed` -> `reviewed`

Also: `declined`, `cancelled`, `disputed`

### 13.4 Faculty Payouts

- Platform takes fee (platform_fee_paise)
- Faculty payout calculated (faculty_payout_paise)
- TDS deducted (total_tds_deducted_paise)
- Payout via UPI (payout_upi_id)
- Trigger prevents unauthorized fee field updates

### 13.5 Faculty Finder

- Public search at `/faculty-finder`
- Faculty slugs for SEO-friendly URLs
- Bookmark/save faculty
- Filter by expertise, Saathi, availability

---

## 14. Live Lectures

### 14.1 Session Types

`single` | `series` | `workshop` | `recurring` | `qa`

### 14.2 Pricing

- `price_per_seat_paise` — standard price
- `bundle_price_paise` — full series discount
- `early_bird_price_paise` — limited early bird seats

### 14.3 Lifecycle

`draft` -> `pending_review` -> `published` -> `completed` | `cancelled`

### 14.4 Booking

Atomic seat booking via `book_live_seat()` RPC (FOR UPDATE lock prevents overselling).

Payment via Razorpay, tracked in `live_bookings`.

### 14.5 Reminders

Cron jobs: `send-24h-reminders`, `send-1h-reminders` (tracked via boolean flags in live_bookings).

---

## 15. Marketplace (Internships & Research)

### 15.1 Internship Postings (v2)

Unified `internship_postings` table supporting:
- Institution postings (company internships)
- Research postings (faculty research opportunities)

Listing plans: `basic`, `featured`, `corporate`

### 15.2 Research Projects

Faculty can post research opportunities with:
- Required subjects, preferred academic level
- Duration, remote/onsite, stipend
- Includes: authorship, certificate, letter

### 15.3 Match System

`match-interns` edge function scores students based on:
- Saathi alignment
- Flame stage
- Profile completeness
- Academic level

Results stored in `intern_matches` with score_breakdown JSON.

### 15.4 Application Flow

1. Student views posting
2. Submits application with cover note + research statement
3. Soul snapshot captured at application time
4. Match score computed (0-100)
5. Faculty reviews: shortlist -> interview -> select/reject

---

## 16. Learning Intent System

### 16.1 Student Intents

Students declare what they want to learn:
- Topic, description, depth preference
- Format preference (lecture/series/workshop/1:1/any)
- Max price willingness
- Urgency (this_month / next_3_months / anytime)

### 16.2 Demand Aggregation

Other students can "join" an intent, incrementing `joiner_count`. Faculty see demand signals.

### 16.3 Intent -> Session Pipeline

When faculty creates a session matching an intent:
- `resulting_session_id` linked
- Intent status -> `fulfilled`
- Joiners notified

### 16.4 Lecture Requests

Direct requests to specific faculty with upvoting by other students.

---

## 17. News & RSS

### 17.1 RSS Fetch

`rss-fetch` edge function runs daily at 6 AM IST (18:30 UTC).

Fetches feeds for all 24 Saathis + shared UPSC feeds. Stores headline + URL only (zero copyright risk).

### 17.2 Professor Notes

AI-generated contextual notes added to news items via Groq during RSS fetch.

### 17.3 Feed Health

`rss_feed_health` table tracks feed failures. `health-monitor` checks for stale feeds.

### 17.4 Explore Resources

`curate-resources` edge function generates weekly learning resources per Saathi via Claude. Stored in `explore_resources`.

---

## 18. Observability & Admin

### 18.1 Traces

Every chat interaction logged in `traces` table:
- TTFB (time to first byte)
- Total tokens, prompt tokens
- AI provider used
- Outcome (success/error/quota_exceeded/rate_limited)
- Duration in ms

Auto-purged after 30 days via `cleanup_old_traces()`.

### 18.2 Health Monitor

`health-monitor` runs hourly. Checks:
- P1: Quota theft, API errors
- P2: Stale RSS, soul update failures
- P3: High TTFB, passion engine issues

### 18.3 Weekly Eval

`weekly-eval` runs Sunday 9 AM IST. Reports 8 metrics:
1. Completion rate
2. Passion ignition
3. Career discovery
4. TTFB by provider
5. Guardrail violations
6. Injection attempts
7. Error rate
8. Active users

### 18.4 Admin Digest

`admin-digest` sends daily/weekly email with platform metrics, revenue, errors.

### 18.5 Weekly Letter

`weekly-letter` sends personalized Saathi letter to active users every Sunday 8 AM IST via Groq + Resend.

---

## 19. Saathi Verticals

**24 active verticals** (up from original 20):

| # | ID | Name | Emoji | Subject Domain |
|---|---|---|---|---|
| 1 | kanoonsaathi | KanoonSaathi | ⚖️ | Law |
| 2 | maathsaathi | MaathSaathi | 📐 | Mathematics |
| 3 | chemsaathi | ChemSaathi | 🧪 | Chemistry |
| 4 | biosaathi | BioSaathi | 🧬 | Biology |
| 5 | pharmasaathi | PharmaSaathi | 💊 | Pharmacy |
| 6 | medicosaathi | MedicoSaathi | 🏥 | Medicine |
| 7 | nursingsaathi | NursingSaathi | 🩺 | Nursing |
| 8 | psychsaathi | PsychSaathi | 🧠 | Psychology |
| 9 | mechsaathi | MechSaathi | ⚙️ | Mechanical Engineering |
| 10 | civilsaathi | CivilSaathi | 🏗️ | Civil Engineering |
| 11 | elecsaathi | ElecSaathi | ⚡ | Electrical Engineering |
| 12 | compsaathi | CompSaathi | 💻 | Computer Science |
| 13 | envirosaathi | EnviroSaathi | 🌍 | Environmental Engineering |
| 14 | bizsaathi | BizSaathi | 📈 | Business |
| 15 | finsaathi | FinSaathi | 💰 | Finance |
| 16 | mktsaathi | MktSaathi | 📣 | Marketing |
| 17 | hrsaathi | HRSaathi | 🤝 | Human Resources |
| 18 | archsaathi | ArchSaathi | 🏛️ | Architecture |
| 19 | historysaathi | HistorySaathi | 🏺 | History |
| 20 | econsaathi | EconSaathi | 📊 | Economics |
| 21 | chemengg | ChemEnggSaathi | 🏭 | Chemical Engineering |
| 22 | biotech | BioTechSaathi | 🦠 | Biotechnology |
| 23 | aerospace | AerospaceSaathi | 🚀 | Aerospace Engineering |
| 24 | electronics | ElectronicsSaathi | 📡 | Electronics Engineering |

### 5 Bot Slots Per Saathi

| Slot | Name | Provider | Access | Purpose |
|---|---|---|---|---|
| 1 | Study Notes | Groq | Student, Faculty | Structured notes, syllabus-aware |
| 2 | Exam Prep | Groq | Student only | MCQ, past patterns, weak area tracking |
| 3 | Interest Explorer | Claude | Student only | Driven by future_subjects + research_area |
| 4 | UPSC Saathi | Claude | Student only | UPSC optional, RSS-aware, answer writing |
| 5 | Citizen Guide | Groq | All roles | Plain-language, jargon-free |

---

## 20. Environment Variables

### 20.1 Supabase Edge Function Secrets (set via `supabase secrets set`)

| Variable | Used By |
|---|---|
| `ANTHROPIC_API_KEY` | chat, checkin-eval, board-draft, parse-education, curate-resources, eval-flagged, whatsapp-webhook |
| `GROQ_API_KEY` | chat, soul-update, board-answer, daily-challenge, rss-fetch, weekly-letter |
| `GEMINI_API_KEY` | chat (fallback) |
| `GROK_API_KEY` | chat (fallback) |
| `SUPABASE_URL` | All functions |
| `SUPABASE_ANON_KEY` | Functions with JWT auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions with admin access |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | pause/resume-subscription |
| `RAZORPAY_LIVE_KEY_ID` / `RAZORPAY_LIVE_KEY_SECRET` | razorpay-order (production) |
| `RAZORPAY_WEBHOOK_SECRET` | razorpay-webhook (HMAC) |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Email functions |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Rate limiting |
| `SENTRY_DSN` | Error tracking |
| `CRON_SECRET` | Cron-triggered functions (6 functions) |
| `WHATSAPP_VERIFY_TOKEN` | whatsapp-webhook |
| `WHATSAPP_TOKEN` | whatsapp-webhook |
| `WHATSAPP_PHONE_NUMBER_ID` | whatsapp-webhook |
| `WHATSAPP_APP_SECRET` | whatsapp-webhook |
| `APP_ENV` | razorpay-order (test vs live key selection) |

### 20.2 Vercel Environment Variables (Web + Admin)

Standard Next.js env vars for Supabase URL, anon key, Google OAuth, Sentry, Razorpay public key.

### 20.3 Mobile Environment Variables

Expo public env vars (`EXPO_PUBLIC_*`) for Supabase, Sentry, Razorpay, payments active flag.

---

## 21. Cron Jobs

Tracked in `cron_job_log` table.

| Job | Schedule | Edge Function | Purpose |
|---|---|---|---|
| `rss-fetch` | Daily 6 AM IST | rss-fetch | Fetch RSS feeds for all Saathis |
| `refresh-saathi-stats` | Every 48h, 6 AM IST | refresh-saathi-stats | Aggregate community stats |
| `expire-learning-intents` | Daily 9 AM IST | (DB function) | Expire old learning intents |
| `check-minimum-seats` | (configured) | (TBD) | Check minimum seats for live sessions |
| `send-24h-reminders` | (configured) | (TBD) | 24h lecture reminders |
| `send-1h-reminders` | (configured) | (TBD) | 1h lecture reminders |
| `auto-release-payments` | (configured) | (TBD) | Auto-release faculty payouts |
| `auto-lift-suspensions` | (configured) | (TBD) | Lift expired suspensions |
| `expire-referral-wallet` | (configured) | (TBD) | Expire referral credits |
| `admin-daily-digest` | Daily | admin-digest | Daily metrics email |
| `admin-weekly-digest` | Weekly | admin-digest | Weekly metrics email |
| `quota-reset` | Daily midnight IST | quota-reset | Reset daily chat quotas |
| `health-monitor` | Hourly | health-monitor | P1/P2/P3 health checks |
| `weekly-eval` | Sunday 9 AM IST | weekly-eval | Weekly metrics report |
| `weekly-letter` | Sunday 8 AM IST | weekly-letter | Personalized Saathi letters |

---

## 22. Security Model

### 22.1 Data Access

- **RLS on every table** — no exceptions (54/54)
- **Service role key** — server-side only, never in client bundle
- **System prompts** — assembled server-side only, never sent to client
- **AI API keys** — server-side only via edge functions

### 22.2 Auth

- **JWT auth** on most edge functions
- **HMAC verification** on webhooks (Razorpay, WhatsApp)
- **CRON_SECRET** on cron-triggered functions
- **Admin whitelist** for admin dashboard
- **`--no-verify-jwt`** only on whatsapp-webhook (Meta can't send JWT)

### 22.3 Input Validation

- Server-side message length reject (> 2000 chars)
- HTML stripping on all user input
- UUID validation on all ID parameters
- Disposable email domain blocklist
- Geo-limiting on registration

### 22.4 Rate Limiting

- Upstash Redis on all AI and payment edge functions
- WhatsApp: 20 messages/phone/minute
- Board posts: plan-based daily limits
- OTP: 5 attempts per email per 15 minutes
- Registration: velocity detection trigger

### 22.5 Abuse Prevention

- Prompt injection detection + silent redirect
- Violation detection with escalating suspensions
- 3-flag auto-hide on content
- 24h account age requirement for board posting
- Faculty impersonation prevention via allowed_domains + admin verification
- Watermark on assistant responses (planned)

---

## 23. Drift Log

Differences between CLAUDE.md (v1.0 March 2026) and current reality:

| Area | CLAUDE.md Says | Reality |
|---|---|---|
| Saathis | 20 verticals | 24 verticals (+ChemEngg, BioTech, Aerospace, Electronics) |
| Tables | 16 tables | 54 tables |
| Edge Functions | 3 mentioned (rss-fetch, soul-update, quota-reset) | 27 deployed |
| Plans | 3 tiers (Free, Plus Monthly, Plus Annual) | 4 tiers (Free, Plus, Pro, Unlimited) |
| Platform | Mobile (Expo) first | Web (Next.js) first, mobile in development |
| AI Providers | Claude + Groq | Claude + Groq + Gemini + Grok (xAI) |
| Faculty System | Not mentioned | Full ecosystem (profiles, sessions, payouts, bookmarks) |
| Live Lectures | Not mentioned | Complete system (sessions, lectures, bookings, wishlist) |
| Research Projects | Not mentioned | Faculty research + applications |
| Learning Intents | Not mentioned | Demand marketplace with joiners |
| WhatsApp | Not mentioned | Full WhatsApp Saathi via Meta Cloud API |
| Internships | Simple listings | Unified postings with AI match scoring |
| Daily Challenges | Not mentioned | Daily MCQ per Saathi with streaks |
| Flashcards | Not mentioned | Spaced repetition system |
| Visualization | Not mentioned | 11 interactive viewers (3D, circuits, anatomy) |
| Suspension System | Not mentioned | Tiered suspension with auto-escalation |
| Conversion/Nudges | Not mentioned | 21 Hinglish nudges with regional scoring |
| Admin Dashboard | 10 modules mentioned | 17 routes with full platform management |
| Onboarding | 7 steps (mobile) | Web: 3 steps, Mobile: 7 steps |
| Institution | Basic listing | Full profile + verification + marketplace |

---

*EdUsaathiAI — Unified Soul Partnership*
*Indo American Education Society (IAES), Ahmedabad*
*SPEC.md v2.0 — April 2026*
