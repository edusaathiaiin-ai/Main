# EdUsaathiAI-Web — Claude Context

## Platform
EdUsaathiAI is an AI learning platform built under IAES Ahmedabad.
**USP**: Unified Soul Partnership — 20 subject AI companions (Saathis) that know each student by name, remember their journey, and match their soul profile.

## Infrastructure (already live)
- **Supabase**: `vpmpuxosyrijknbxautx.supabase.co`
- **Auth**: Supabase Auth (Email OTP + Google OAuth)
- **Payments**: Razorpay (test mode active)
- **Edge Functions**: 10 deployed — primary is `chat` (streaming AI)
- **DB**: 19 tables, 43 RLS policies

## Tech Stack
- Next.js 16 (App Router, TypeScript strict)
- Tailwind CSS v4
- Framer Motion v12
- Supabase JS v2 + @supabase/ssr
- Zustand v5 (global state)
- TanStack React Query v5
- Sentry (error tracking)

## Design Language (NON-NEGOTIABLE)
- Navy: `#0B1F3A`, Navy Deep: `#060F1D`
- Gold: `#C9993A`, Gold Light: `#E5B86A`
- Cream: `#FAF7F2`
- Fonts: Playfair Display (headings) + DM Sans (body)
- CSS vars: `--font-playfair`, `--font-dm-sans`
- Dark theme throughout

## URL Structure
```
/            → redirects (auth check)
/login       → Supabase Auth UI
/onboard     → new user onboarding
/chat        → main chat (PROTECTED)
/board       → community board (PROTECTED)
/news        → news feed (PROTECTED)
/profile     → user profile (PROTECTED)
/pricing     → pricing page (public)
```

## Key Supabase Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User profile (plan_id, role, primary_saathi_id) |
| `student_soul` | Per-user per-Saathi soul profile |
| `chat_sessions` | Daily quota tracking (message_count, cooling_until) |
| `chat_messages` | Message history |
| `bot_personas` | System prompt data per saathi × slot |
| `news_items` | RSS-fetched news per vertical |
| `board_questions` | Community Q&A |
| `board_answers` | Answers + faculty verification |
| `subscriptions` | Razorpay payment records |
| `conversion_shown` | Which nudges shown per user |
| `checkin_results` | Check-in quiz results |
| `moderation_flags` | Injection/abuse flags |

## Edge Functions (Supabase)
- `chat` — streaming AI response (Groq/Claude/Grok fallback)
- `razorpay-order` — create payment orders
- `razorpay-webhook` — handle payment events
- `rss-fetch` — fetch news for all verticals
- Others: subscription management

## Plan Tiers
| Plan | Price | Daily chats | Cooling | Bot slots |
|------|-------|-------------|---------|-----------|
| free | ₹0 | 5 | 48h | 1, 5 |
| plus | ₹199/mo | 20 | 48h | 1-5 |
| pro | ₹499/mo | 50 | 24h | 1-5 |
| unlimited | ₹4,999/mo | ∞ | 0 (midnight IST) | 1-5 |

## Bot Slots
| Slot | Name | API | Available to |
|------|------|-----|-------------|
| 1 | Study Notes | Groq | student, faculty |
| 2 | Exam Prep | Groq | student |
| 3 | Interest Explorer | Claude | student |
| 4 | UPSC Saathi | Claude | student |
| 5 | Citizen Guide | Groq | all |

## Soul Rules (CRITICAL)
- System prompt assembled server-side only (Edge Function)
- `student_soul` table stores: display_name, ambition_level, preferred_tone, enrolled_subjects, future_subjects, future_research_area, top_topics, struggle_topics, last_session_summary, session_count
- Never expose soul data to unauthenticated users
- Bot slot 1 and 5 use Groq; 3 and 4 use Claude

## Security Requirements
- JWT verified server-side in Edge Function
- No API keys client-side
- RLS on all tables
- Protected routes: /chat, /board, /news, /profile
- Middleware at `src/middleware.ts` handles session refresh + redirects
- Geo-limited users: slots 1 and 5 only, 5 chats/day max

## File Structure
```
website/
  src/
    app/
      (auth)/login/page.tsx
      (auth)/onboard/page.tsx
      (app)/layout.tsx        ← server-side auth guard
      (app)/chat/page.tsx
      (app)/board/page.tsx
      (app)/news/page.tsx
      (app)/profile/page.tsx
      pricing/page.tsx
      layout.tsx              ← root layout (fonts, metadata)
      page.tsx                ← redirect to /chat or /login
    components/
      chat/                   ← ChatWindow, MessageBubble, BotSelector
      layout/                 ← Navbar, Sidebar, MobileNav
      saathi/                 ← SaathiCard, SaathiGrid
    constants/
      saathis.ts, bots.ts, plans.ts, nudges.ts, copy.ts
    hooks/
      useAuth.ts, useQuota.ts, useSubscription.ts, useSaathi.ts
    lib/
      supabase/client.ts, server.ts, middleware.ts
      ai.ts                   ← streamChat() / sendChat()
      quota.ts                ← buildQuotaState()
      soul.ts                 ← display helpers
    middleware.ts             ← Next.js root middleware
    stores/
      authStore.ts, chatStore.ts, soulStore.ts
    types/index.ts
```

## Development Steps
- W1: Scaffold ✅
- W2: Auth flow (login, Google OAuth, onboarding)
- W3: App shell (layout, sidebar, navbar, chat window)
- W4: Chat streaming, quota UI, board, news
- W5: Pricing page, Razorpay integration, subscription management
- W6: Profile page, soul editing, check-in widget

---

## Vertical ID Rule — READ THIS FIRST

Any column named `vertical_id` in any table is a FK to `verticals(id)` and **MUST be a UUID. Never a slug.**

This bug has caused production failures three times. Never insert a slug where `vertical_id` is expected.

### Before any INSERT/UPDATE involving vertical_id:

```typescript
import { resolveVerticalId } from '@/lib/resolveVerticalId';

const verticalId = await resolveVerticalId(slugOrIdFromAnywhere, supabase);
if (!verticalId) {
  // handle error — never insert null
  return;
}
```

Full documentation: `website/src/lib/resolveVerticalId.ts`

### Tables with vertical_id FK (always use resolveVerticalId):

| Table | Column |
|-------|--------|
| `student_soul` | `vertical_id` |
| `bot_personas` | `vertical_id` |
| `news_items` | `vertical_id` |
| `board_questions` | `vertical_id` |
| `board_answers` | `vertical_id` |
| `faculty_sessions` | `vertical_id` |
| `live_sessions` | `vertical_id` |
| `lecture_requests` | `vertical_id` |
| `learning_intents` | `vertical_id` |
| `internship_postings` | `vertical_id` |
| `daily_challenges` | `vertical_id` |
| `saathi_stats_cache` | `vertical_id` |
| `explore_resources` | `vertical_id` |

### Adding a new table with vertical_id?

- [ ] FK: `REFERENCES verticals(id)`
- [ ] Add to the list above in `resolveVerticalId.ts`
- [ ] Use `resolveVerticalId()` in all insert/update handlers
- [ ] Add index: `CREATE INDEX ON new_table(vertical_id)`

### When to call resolveVerticalId:

**Call it** when the value comes from: URL params, user selection (Saathi picker), `profile.primary_saathi_id`, WhatsApp payloads, `SAATHIS[n].id` (slug field).

**Skip it** when the value comes from: a DB query result's `.vertical_id` column, another table's `vertical_id` FK — those are already UUIDs.
