# EdUsaathiAI — Project Bible for Claude Code

> Read this file completely before every single session.
> This is the single source of truth for all product, technical, design, and philosophical decisions.
> Every line of code written must honour the USP — Unified Soul Partnership.

---

## 1. What is EdUsaathiAI?

EdUsaathiAI (edusaathiai.in) is an AI-first education platform built for India.
It is a mother app under which 20 subject-specific verticals called "Saathis" live as distinct, branded learning companions.
Built under the Indo American Education Society (IAES), Ahmedabad.

**Brand name:** Always `EdUsaathiAI` — capital E, capital U, capital AI. Never "Edusaathi", never "edusaathiai", never "EduSaathi".

**USP — Unified Soul Partnership:**
This is not a feature. It is the entire philosophy of the platform.
The student and their Saathi bot are not user and tool. They are two identities sharing one learning soul.
Every line of code, every screen, every bot response must honour this.

**Positioning:**
EdUsaathiAI does not compete with ChatGPT. It is built ON TOP of Claude and Groq.
ChatGPT is a general. EdUsaathiAI is the specialist who knows your name.
Price: ₹199/month vs ₹1,650/month ChatGPT Plus. 8× cheaper. Infinitely more personal.

**The last line in every bot system prompt — never changes:**
"You are not just answering questions. You are shaping a future."

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile App | Expo + React Native | Android first. Same stack as KanoonSaathi. |
| Admin Web | Next.js 14 + Tailwind + Shadcn/UI | Deployed on Vercel. |
| Database | Supabase (PostgreSQL + RLS + Edge Functions) | All tables have RLS. No exceptions. |
| Auth | Supabase Auth — Google OAuth + Email OTP | No SMS OTP at launch. |
| AI Primary | Claude API (claude-sonnet-4-20250514) | Deep reasoning, research, open answer evaluation. |
| AI Fallback | Groq API (llama-3.3-70b-versatile) | Notes, MCQ, summaries, board AI answers. |
| Rate Limiting | Upstash Redis | Bot quota: 20 chats/day per user per bot slot. |
| Email | Resend (GoDaddy domain verified) | Transactional email. |
| Payments | Razorpay | Subscriptions. PAYMENTS_ACTIVE=false until launch. |
| Error Tracking | Sentry (2 projects) | App DSN + Admin DSN. Both configured. |
| Push | Expo Push Notifications | Free. Native Android. |
| Version Control | GitHub (private repo) | Branch: development. Never commit to main directly. |
| Hosting (admin) | Vercel | Token ready. |

---

## 3. Environment Variables

```env
# AI
ANTHROPIC_API_KEY=
GROQ_API_KEY=

# SUPABASE
SUPABASE_URL=https://vpmpuxosyrijknbxautx.supabase.co
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=

# AUTH
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# EMAIL
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# PAYMENTS
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
PAYMENTS_ACTIVE=false
FOUNDING_PERIOD_END=2026-09-01

# RATE LIMITING
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# MONITORING
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# VERCEL
VERCEL_TOKEN=
VERCEL_ORG_ID=

# APP
APP_ENV=development
APP_NAME=EdUsaathiAI
EXPO_PROJECT_ID=
```

**Rules:**
- SUPABASE_SERVICE_ROLE_KEY — server-side only. Never in client bundle. Ever.
- All AI API calls — server-side only via Supabase Edge Functions. Never from client.
- System prompt — assembled server-side only. Never sent to client.
- .env.local — never commit. Already in .gitignore.

---

## 4. Folder Structure

```
EdUsaathiAI/
├── app/
│   ├── (auth)/              ← splash, onboarding, role-select, saathi-picker, login
│   ├── (tabs)/              ← home, chat, board, news, profile
│   └── saathi/[id]/         ← dynamic saathi screens
├── components/
│   ├── ui/                  ← SaathiCard, RoleCard, BotBubble, NewsCard, CheckinCard
│   ├── chat/                ← ChatScreen, MessageBubble, QuotaBanner, CoolingBanner
│   ├── board/               ← QuestionCard, AnswerCard, FlagButton, FacultyBadge
│   └── checkin/             ← CheckinFlow, MCQCard, OpenAnswerCard, ResultCard
├── lib/
│   ├── supabase.ts          ← singleton client (never recreate)
│   ├── ai.ts                ← Claude + Groq router function
│   ├── soul.ts              ← buildSystemPrompt() — most important function
│   ├── quota.ts             ← Redis quota check + enforce
│   ├── rss.ts               ← RSS fetch + parse
│   └── razorpay.ts          ← payment + webhook handlers
├── hooks/
│   ├── useAuth.ts
│   ├── useSoul.ts
│   ├── useQuota.ts
│   └── useSaathi.ts
├── constants/
│   ├── saathis.ts           ← all 20 Saathi configs
│   ├── bots.ts              ← 5 bot slot definitions
│   └── plans.ts             ← subscription plan configs
├── types/
│   └── index.ts             ← Profile, SoulProfile, ChatMessage, BotSlot, Saathi
├── supabase/
│   ├── migrations/          ← all SQL migrations numbered
│   └── functions/           ← rss-fetch, soul-update, quota-reset Edge Functions
├── CLAUDE.md                ← this file
├── .env.local               ← never commit
└── .gitignore
```

---

## 5. The 20 Saathis

```typescript
// constants/saathis.ts — reference data
export const SAATHIS = [
  { id: 'kanoonsaathi',   name: 'KanoonSaathi',  emoji: '⚖️',  tagline: 'Where law meets intelligence',              primary: '#1E3A5F', accent: '#3B82F6', bg: '#E8F0FE' },
  { id: 'maathsaathi',    name: 'MaathSaathi',   emoji: '📐',  tagline: 'Numbers made neighbourly',                  primary: '#0F4C2A', accent: '#22C55E', bg: '#EAF3DE' },
  { id: 'chemsaathi',     name: 'ChemSaathi',    emoji: '🧪',  tagline: 'Reactions decoded, concepts unlocked',      primary: '#5C1A6B', accent: '#A855F7', bg: '#F5E8FE' },
  { id: 'biosaathi',      name: 'BioSaathi',     emoji: '🧬',  tagline: 'Life explained, cell by cell',              primary: '#1A5C2E', accent: '#10B981', bg: '#E6F7EC' },
  { id: 'pharmasaathi',   name: 'PharmaSaathi',  emoji: '💊',  tagline: 'Every molecule has a story',                primary: '#7A1C1C', accent: '#EF4444', bg: '#FDEAEA' },
  { id: 'medicosaathi',   name: 'MedicoSaathi',  emoji: '🏥',  tagline: 'Healing starts with understanding',         primary: '#1A4A5C', accent: '#0EA5E9', bg: '#E4F0F5' },
  { id: 'nursingsaathi',  name: 'NursingSaathi', emoji: '🩺',  tagline: 'Care grounded in knowledge',                primary: '#5C001A', accent: '#F43F5E', bg: '#FCEAF0' },
  { id: 'psychsaathi',    name: 'PsychSaathi',   emoji: '🧠',  tagline: 'Understanding minds, building empathy',     primary: '#3A1C5C', accent: '#8B5CF6', bg: '#F0E8FC' },
  { id: 'mechsaathi',     name: 'MechSaathi',    emoji: '⚙️',  tagline: 'Engineering minds, precision built',        primary: '#1A3A5C', accent: '#0EA5E9', bg: '#E6EEF8' },
  { id: 'civilsaathi',    name: 'CivilSaathi',   emoji: '🏗️',  tagline: 'Structures that stand the test of time',   primary: '#3A2800', accent: '#F59E0B', bg: '#FFF3E0' },
  { id: 'elecsaathi',     name: 'ElecSaathi',    emoji: '⚡',  tagline: 'Current knowledge, grounded thinking',      primary: '#003A5C', accent: '#06B6D4', bg: '#E0F0FA' },
  { id: 'compsaathi',     name: 'CompSaathi',    emoji: '💻',  tagline: 'Code, conquer, create',                     primary: '#1C1C5C', accent: '#6366F1', bg: '#EEEEF8' },
  { id: 'envirosathi',    name: 'EnviroSaathi',  emoji: '🌍',  tagline: 'Engineering a sustainable tomorrow',        primary: '#0F3A1A', accent: '#84CC16', bg: '#E4F5E8' },
  { id: 'bizsaathi',      name: 'BizSaathi',     emoji: '📈',  tagline: 'Business thinking, sharpened daily',        primary: '#1A3A00', accent: '#65A30D', bg: '#EEF8E4' },
  { id: 'finsaathi',      name: 'FinSaathi',     emoji: '💰',  tagline: 'Money matters, demystified',                primary: '#1A3A2A', accent: '#059669', bg: '#E4F5EE' },
  { id: 'mktsaathi',      name: 'MktSaathi',     emoji: '📣',  tagline: 'From insight to influence',                 primary: '#5C1A00', accent: '#F97316', bg: '#FFF0E8' },
  { id: 'hrsaathi',       name: 'HRSaathi',      emoji: '🤝',  tagline: 'People first, always',                      primary: '#3A003A', accent: '#EC4899', bg: '#F8E8F8' },
  { id: 'archsaathi',     name: 'ArchSaathi',    emoji: '🏛️',  tagline: 'Design thinking, built different',          primary: '#6B4A00', accent: '#D97706', bg: '#FFF4D6' },
  { id: 'historysaathi',  name: 'HistorySaathi', emoji: '🏺',  tagline: 'Every era has a lesson',                    primary: '#5C3A00', accent: '#B45309', bg: '#FFF0E0' },
  { id: 'econsaathi',     name: 'EconSaathi',    emoji: '📊',  tagline: 'Markets explained, policies demystified',   primary: '#2C4A00', accent: '#4D7C0F', bg: '#EEF6E0' },
];
```

---

## 6. The 5 Bot Slots

Every Saathi has exactly 5 bot slots. Same slots, different personas per Saathi.

| Slot | Name | API | Available To | Purpose |
|---|---|---|---|---|
| 1 | Study Notes | Groq | Student, Faculty | Structured notes, syllabus-aware, saves to profile |
| 2 | Exam Prep | Groq | Student only | MCQ, past patterns, timed mock Q&A, weak area tracking |
| 3 | Interest Explorer | Claude | Student only | Driven by future_subjects + future_research_area |
| 4 | UPSC Saathi | Claude | Student only | UPSC optional prep, RSS-aware, answer writing |
| 5 | Citizen Guide | Groq | All roles | Plain-language explainer, jargon-free always |

---

## 7. The Soul Engine — Most Important Code

### buildSystemPrompt() — lib/soul.ts

This function is called server-side before EVERY bot session.
It assembles the system prompt dynamically from 4 data sources.
Never expose this function or its output to the client.

```typescript
// Pseudocode — implement fully in lib/soul.ts
async function buildSystemPrompt(
  userId: string,
  botSlot: 1 | 2 | 3 | 4 | 5,
  saathiId: string
): Promise<string> {

  // Fetch all 4 blocks in parallel
  const [persona, soul, todayNews] = await Promise.all([
    fetchBotPersona(saathiId, botSlot),           // from bot_personas table
    fetchStudentSoul(userId, saathiId),            // from student_soul table
    fetchTodaysNews(saathiId, 3),                  // top 3 from news_items table
  ]);

  return `
# SAATHI IDENTITY
You are ${persona.name}, the ${persona.role} of ${persona.saathiName}.
Tone: ${persona.tone}
Your specialities: ${persona.specialities.join(', ')}
You never: ${persona.neverDo.join(', ')}

# STUDENT SOUL
You are speaking with ${soul.displayName}.
Ambition level: ${soul.ambitionLevel}
Preferred tone detected: ${soul.preferredTone}
Currently enrolled in: ${soul.enrolledSubjects.join(', ')}
Future interest areas: ${soul.futureSubjects.join(', ')}
Declared research dream: ${soul.futureResearchArea}
Topics they return to often: ${soul.topTopics.join(', ')}
Topics they struggle with: ${soul.struggleTopics.join(', ')}

# LAST SESSION MEMORY
${soul.lastSessionSummary || 'This is your first session together.'}
Sessions completed together: ${soul.sessionCount}

# TODAY'S CONTEXT
${todayNews.map(n => `- ${n.source}: ${n.title}`).join('\n')}

# SOUL RULES — never break these
- Greet by name. Reference last session naturally in first 2 messages.
- Mirror the student's communication tone silently — never ask about it.
- If topic is in struggle_topics, use simpler language and more analogies.
- End with "Does this feel clearer?" when explaining struggle topics.
- At least once per session, bridge current topic to their research dream.
- Calibrate depth to ambition: PhD/UPSC students get deeper, struggling students get gentler.
- Generate a 3-sentence session summary in your final message (stored automatically).
- You are not just answering questions. You are shaping a future.
  `.trim();
}
```

### updateSoulProfile() — called at session end

```typescript
// Called by soul-update Edge Function after every chat session
async function updateSoulProfile(userId: string, saathiId: string, messages: ChatMessage[]) {
  // 1. Detect preferred_tone from message patterns
  // 2. Extract topics discussed → update top_topics[]
  // 3. Detect struggle markers → update struggle_topics[]
  // 4. Generate last_session_summary via Groq (3 sentences max)
  // 5. Increment session_count
  // 6. Update student_soul table
}
```

---

## 8. AI Routing Logic — lib/ai.ts

```typescript
type TaskType =
  | 'deep-qa'           // → Claude
  | 'research'          // → Claude
  | 'checkin-eval'      // → Claude
  | 'notes'             // → Groq
  | 'mcq'               // → Groq
  | 'summary'           // → Groq
  | 'board-answer'      // → Groq
  | 'soul-summary'      // → Groq

// Route every AI call through this function
async function routeAI(task: TaskType, prompt: string, systemPrompt: string) {
  const useGroq = ['notes', 'mcq', 'summary', 'board-answer', 'soul-summary'].includes(task);
  return useGroq ? callGroq(prompt, systemPrompt) : callClaude(prompt, systemPrompt);
}
```

---

## 9. Quota System — lib/quota.ts

```typescript
// Redis key pattern: quota:{userId}:{saathiId}:{botSlot}:{dateIST}
// 20 chats per day per user per bot slot
// 48-hour cooling from exact time 20th chat was sent (NOT midnight reset)

async function checkQuota(userId: string, saathiId: string, botSlot: number): Promise<{
  allowed: boolean;
  remaining: number;
  coolingUntil: Date | null;
}> { ... }

async function decrementQuota(userId: string, saathiId: string, botSlot: number): Promise<void> { ... }

// Saathi Check-in does NOT consume quota — separate flow entirely
```

---

## 10. Database Tables

All 16 tables. RLS enabled on every table without exception.

```
profiles            — all users, all roles
verticals           — 20 Saathi configurations
bot_personas        — bot definitions per Saathi per slot
student_soul        — soul matching engine (7 signals)
student_subjects    — enrolled + future subjects
allowed_domains     — faculty + institution email whitelist
chat_sessions       — quota tracking per user per bot
chat_messages       — full message history
checkin_results     — Saathi Check-in history
notes_saved         — notes from Study Bot sessions
board_questions     — community Q&A
board_answers       — human + AI answers
moderation_flags    — content moderation queue
news_items          — RSS + papers + exam dates
exam_calendar       — admin-curated exam dates
intern_listings     — institution postings
intern_interests    — mutual matching engine
dpdp_requests       — data deletion + export requests
consent_log         — consent audit trail
```

---

## 11. User Roles & Access

| Role | Color | Bot Access | Board | News | Interns |
|---|---|---|---|---|---|
| Student 🎓 | #4F46E5 Indigo | All 5 bots (20/day each) | Read + Post | Full | Browse + Apply |
| Faculty 👨‍🏫 | #16A34A Emerald | All 5 bots (20/day each) | Read + Post + Verified badge | Full | None |
| General Public 🌐 | #EA580C Amber | Bot 1 + Bot 5 only (5/day) | Read + Post | Full | None |
| Institution 🏢 | #7C3AED Violet | None | Saathi Spotlight only | None | Post + Browse |

---

## 12. Onboarding Flow — 7 Steps

```
1. Splash Screen          → Logo, tagline, USP, 2s auto-advance
2. Welcome Carousel       → 3 slides (What / Meet Saathis / How it works), skippable
3. Role Selection         → 4 expandable cards, role color on selection
4. Saathi Picker          → Grid of 20 Saathis, pick primary, 1 required
5. Sign Up / Login        → Google OAuth (primary) + Email OTP, screen = Saathi color
6. Profile Completion     → Name, city, institution, year, subjects, research area, exam target
7. Home Screen            → Personalised dashboard, bottom tab bar, Saathi theme
```

---

## 13. Saathi Check-in Rules

- Never called "test", "quiz", or "exam" anywhere in UI copy. Always "Saathi Check-in".
- Bot initiates: after session 5 (first), every 7 sessions after, when struggle topic cleared 3×, 14 days before exam date.
- Student can always initiate via button in Chat header.
- Student can decline: bot responds warmly, never punishes.
- Does NOT consume daily chat quota. Completely separate flow.
- Format mix: MCQ (factual) + Open Answer (Claude evaluates) + Conversational (Socratic).
- Result tone: soul-matched — ambitious students get pushed, struggling students get encouraged.
- Results update struggle_topics[] in student_soul.

---

## 14. Cooling Screen Rules

- Never a full blocking screen. Never punitive. Never the word "limit" or "blocked".
- Chat tab shows gentle lock icon only.
- App redirects to News tab automatically.
- Soft banner at top: "Chat resumes in HH:MM:SS — Explore what's happening in [Saathi] while you wait."
- News tab, Board tab, Profile — fully active throughout cooling.
- Cooling is 48 hours from exact time 20th chat was sent.

---

## 15. News Tab — RSS Sources

Edge Function runs at 6:00 AM IST daily. Fetches all sources. Stores in news_items table.
Only headline + URL stored — never article body. Zero copyright risk.

Key sources per category:
- Law: Bar & Bench, Live Law, The Hindu Legal, SSRN Law
- Medical/Pharma: PubMed, Pharmacy Times, CDSCO
- Sciences: arXiv, Nature, Science Daily, Royal Society of Chemistry
- Engineering: IEEE Spectrum, ASME, Science Daily Engineering
- Business: Economic Times, Mint, SSRN Finance, RBI
- UPSC (all Saathis): The Hindu National, PIB India, PRS India, Rajya Sabha

---

## 16. Subscription Plans

| Plan | Price | Features |
|---|---|---|
| Free Forever | ₹0 | Bot 1 + Bot 5 only, 20 chats/day, 1 Saathi, 1 Check-in/month |
| Saathi Plus (Monthly) | ₹199/month | All 5 bots, all Saathis, unlimited Check-ins, notes export |
| Saathi Plus (Annual) | ₹1,499/year | Everything in Plus, 37% saving |
| Institution | ₹4,999/month | Intern marketplace, listings, student browse, Saathi Spotlight |

**Founding Student Access:**
- All users who register before FOUNDING_PERIOD_END get 60 days full Premium free.
- No card required. Called "Founding Student Access" — never "free trial".
- Day 45: bot delivers warm in-session nudge.
- Day 55: push notification + email.
- Day 60: graceful downgrade to Free tier. Soul memory preserved but gated.
- PAYMENTS_ACTIVE=false means all users get Plus silently — flip to true when ready to charge.

---

## 17. Security Rules — Non-Negotiable

- TypeScript strict mode always. No `any`. No `ts-ignore`.
- RLS on every Supabase table. Test policies before shipping each feature.
- SUPABASE_SERVICE_ROLE_KEY — server-side only. Never in client bundle.
- All AI calls via Supabase Edge Functions. API keys never on client.
- System prompt assembled server-side. Never sent to client.
- Input sanitisation on every user-facing field — HTML stripped, max lengths enforced.
- Rate limiting via Upstash Redis on all API endpoints.
- Prompt injection detected and silently redirected (never engage the injection).
- Sentry captures all errors. Never log PII in Sentry.
- All bot messages have a Flag button — stored to moderation_flags.

---

## 18. Bot Guardrails — All Saathis

These rules are hardcoded into every bot's system prompt:

- KanoonSaathi: never gives legal advice, never recommends lawyers, never comments on pending cases.
- MedicoSaathi + PharmaSaathi + NursingSaathi: never prescribes, never diagnoses, never gives patient-specific advice. Extra-prominent disclaimer mandatory.
- PsychSaathi: never provides clinical assessment or therapy. Never diagnoses.
- All bots: refuse to write assignments, refuse political opinion, refuse adult content.
- All bots: first session always includes disclaimer — "I am an AI learning companion, not a licensed professional."
- Prompt injection patterns trigger silent subject-redirect: "I'm here to help you learn [subject]. What would you like to explore today?"

---

## 19. Design Language

**Fonts:** Playfair Display (headings, warmth, serif personality) + DM Sans (body, clean) + DM Mono (code, labels)

**Colors:**
- Platform: Navy #0B1F3A, Gold #C9993A, Cream #FAF7F2
- Each Saathi has its own primaryColor, accentColor, bgColor (see constants/saathis.ts)
- Role colors: Student #4F46E5, Faculty #16A34A, Public #EA580C, Institution #7C3AED

**Mobile screens reference:** 6 screens designed — Splash, Role Select, Home, Chat, Check-in, News.
The hero page HTML (edusaathiai_hero.html) is the definitive design reference.

**Design principles:**
- Every screen must feel warm, not clinical.
- Gold is used for achievement, milestones, and soul moments.
- Navy is trust and depth.
- The cooling screen is never red. Never angry. Always warm amber.
- Check-in result cards are never harsh. The tone is always the student's advocate.

---

## 20. Build Sequence

Build in this exact order. Do not skip steps.

```
Step 1  → Project scaffold (Expo Router, TypeScript, NativeWind, Supabase, Sentry)
Step 2  → Supabase schema (all 16 tables, RLS policies)
Step 3  → Constants (20 Saathis, 5 bots, subscription plans)
Step 4  → Auth flow (Google OAuth + Email OTP, useAuth hook, protected routes)
Step 5  → Onboarding (7 screens, role cards, Saathi picker, profile completion)
Step 6  → Soul engine (buildSystemPrompt, updateSoulProfile, lib/soul.ts)
Step 7  → Chat screens (5 bot slots, streaming, quota, cooling banner)
Step 8  → Community Board + News Tab
Step 9  → Saathi Check-in flow
Step 10 → Razorpay subscriptions + webhook
Step 11 → Supabase Edge Functions (rss-fetch, soul-update, quota-reset)
Step 12 → Admin dashboard (Next.js, Vercel, all 10 modules)
```

---

## 21. Git Rules

- One feature per branch. Name: `feature/chat-quota-system`
- Never commit directly to main.
- Merge to development when feature is complete and tested.
- Merge development to main only for releases.
- Never commit .env.local — already in .gitignore.
- Commit message format: `feat: description` / `fix: description` / `chore: description`

---

## 22. DPDP Act 2023 Compliance

- Consent checkboxes at registration — logged in consent_log table.
- "What does my Saathi know about me?" screen — shows full soul profile.
- All profile fields editable anytime.
- Account deletion: soft delete → anonymise chats → hard delete PII in 30 days.
- Data Fiduciary: IAES, Ahmedabad.
- Grievance Officer: listed in Privacy Policy with 30-day SLA.
- No profile photos collected — privacy by design.
- No ad networks. No data sold. No third-party sharing.

---

## 23. The Soul Philosophy — Read Before Writing Any Bot Code

> "The student and their Saathi bot are not user and tool.
> They are two identities sharing one learning soul."

The bot knows:
1. The student's name and ambition level
2. Their enrolled subjects and future research dream
3. Their preferred tone (formal or casual) — detected silently, never asked
4. Their pace of learning — fast, medium, slow
5. Their curiosity signature — topics they return to again and again
6. Their struggle zones — where they need extra gentleness
7. Their session energy — rushing or deep mode

The bot always:
- Greets by name, references last session
- Bridges today's topic to the student's future dream
- Uses gentler language for struggle topics
- Matches the student's tone silently
- Ends every session generating a 3-sentence memory for next time

The bot never:
- Feels like a search engine
- Forgets who it is talking to
- Treats two students the same
- Breaks the warmth for the sake of efficiency

**Final line in every system prompt, every bot, every Saathi — unchanged forever:**
> "You are not just answering questions. You are shaping a future."

---

*EdUsaathiAI — Unified Soul Partnership*
*Indo American Education Society (IAES), Ahmedabad*
*Version 1.0 — March 2026*
