# EdUsaathiAI — Claude Code Context
# Last updated: April 2026
# READ THIS ENTIRE FILE BEFORE WRITING A SINGLE LINE OF CODE

---

## Platform Identity

EdUsaathiAI is a bootstrapped AI learning platform built by **Jaydeep Buch, Ahmedabad**.
It is NOT affiliated with IAES or any organisation. It is a personal proprietorship.

**USP**: Unified Soul Partnership — 30 subject AI companions (Saathis) that know each
student by name, remember their journey, grow with them over time, and occasionally
show them who they are becoming.

**Live at**: https://www.edusaathiai.in
**Admin**: https://edusaathiai-admin.vercel.app
**Supabase project**: `vpmpuxosyrijknbxautx.supabase.co`

---

## THE MOST CRITICAL RULE — READ FIRST

### UUID vs Slug — This bug has caused 12+ production failures.

`vertical_id` in ANY table is ALWAYS a UUID (FK to `verticals.id`).
`SAATHIS[n].id` is ALWAYS a slug (e.g. `'biosaathi'`).
They are NEVER interchangeable.

**ALWAYS convert before use:**

```typescript
import { toSlug } from '@/constants/verticalIds'
import { resolveVerticalId } from '@/lib/resolveVerticalId'

// UUID → slug (for UI display, SAATHIS.find, URLs)
const slug = toSlug(profile.primary_saathi_id)

// slug → UUID (for DB inserts/queries)
const uuid = await resolveVerticalId(slug, supabase)

// SAATHIS.find — ALWAYS use slug, never UUID
const saathi = SAATHIS.find(s => s.id === slug) ?? null
// ↑ NEVER fall back to SAATHIS[0] — silent KanoonSaathi bug
```

**The fallback `?? SAATHIS[0]` is FORBIDDEN.**
It silently shows KanoonSaathi to every user when UUID is passed instead of slug.
Use `?? null` and handle null explicitly.

---

## All 30 Saathis — Complete List

These are the ONLY valid slugs. Any other value is a bug.

```
STEM:
biosaathi         biotechsaathi      physicsaathi
chemsaathi        maathsaathi        compsaathi
mechsaathi        civilsaathi        aerospacesaathi
elecsaathi        electronicssaathi  chemengg-saathi
envirosaathi      agrisaathi

MEDICAL:
medicosaathi      pharmasaathi       nursingsaathi

SOCIAL + LAW:
kanoonsaathi      historysaathi      psychsaathi
polscisaathi      geosaathi          archsaathi

COMMERCE:
econsaathi        accountsaathi      finsaathi
bizsaathi         mktsaathi          hrsaathi
statssaathi
```

**Note**: `chemengg-saathi` has a hyphen. All others use no separator.
The old slugs `physisaathi`, `aerosaathi`, `envirosathi` were typos — fixed.
Never use them again.

---

## verticalIds.ts — UUID Map

All 30 UUIDs are in `website/src/constants/verticalIds.ts`.
The 6 newest (physicsaathi, accountsaathi, polscisaathi, statssaathi,
geosaathi, agrisaathi) were added in April 2026.
Always import from this file — never hardcode UUIDs.

---

## Infrastructure — Current State

```
Supabase:         vpmpuxosyrijknbxautx.supabase.co
Auth:             Supabase Auth (Email magic link + Google OAuth)
Payments:         Razorpay LIVE (not test — real money)
Edge Functions:   37 deployed, all ACTIVE
DB tables:        54+ tables, full RLS
Cron jobs:        11 active via pg_cron + pg_net
Email:            Resend (from admin@edusaathiai.in)
WhatsApp:         Meta Cloud API (+91 98255 93204)
Error tracking:   Sentry
Deployment:       Vercel (auto-deploy on git push)
```

---

## Tech Stack

```
Next.js 14        App Router, TypeScript strict
Tailwind CSS      utility classes (NO hardcoded dark colors)
Framer Motion     animations
Supabase JS v2    + @supabase/ssr
Zustand v5        global state
TanStack Query v5 server state
```

---

## Design System — CURRENT (v2, Light Theme)

**The platform is LIGHT THEME. Not dark.**

```css
/* Base */
--bg-base:        #FAFAF8   /* warm white */
--bg-surface:     #FFFFFF
--text-primary:   #1A1814
--text-secondary: #4A4740
--text-tertiary:  #7A7570
--text-ghost:     #A8A49E

/* Platform gold */
--gold:           #B8860B
--gold-light:     #F5E6C8

/* Per-Saathi colors via data-saathi attribute */
/* Set on body: document.body.setAttribute('data-saathi', slug) */
/* CSS vars --saathi-primary, --saathi-light, --saathi-bg etc. */
/* auto-override per Saathi */
```

**Fonts:**
```
Display:  Fraunces (NOT Playfair Display — that was the old theme)
Body:     Plus Jakarta Sans (NOT DM Sans — that was the old theme)
Mono:     JetBrains Mono
```

**FORBIDDEN in light theme:**
```
❌ rgba(255,255,255,0.x) as TEXT color — invisible on light bg
❌ Hardcoded dark backgrounds in chat components
❌ Navy #0B1F3A or #060F1D anywhere in chat UI
   (dark theme is only for /explore marketing page)
```

**Exception:** The `/explore` Saathi grid page intentionally stays dark (#0F1923).
All other pages: light theme.

---

## CSS Variables — Typography Scale

```css
--text-xs:    11px   /* labels, captions */
--text-sm:    13px   /* sidebar, secondary */
--text-base:  15px   /* body, chat messages */
--text-md:    17px   /* prominent body */
--text-lg:    20px   /* card titles */
--text-xl:    24px   /* section headers */
--text-2xl:   30px   /* page titles */

/* Scale up automatically with data-font-size attribute */
[data-font-size="large"]  → all sizes +2px
[data-font-size="xlarge"] → all sizes +4px
```

---

## Bot Slots — Current Routing

| Slot | Name | Model | Notes |
|------|------|-------|-------|
| 1 | Study Notes | Groq llama-3.3-70b | Default |
| 2 | Exam Prep | Groq llama-3.3-70b | |
| 3 | Interest Explorer | Claude claude-sonnet-4-20250514 | |
| 4 | UPSC Saathi | Claude claude-sonnet-4-20250514 | |
| 5 | Citizen Guide | Groq llama-3.3-70b | |

**HIGH-STAKES SAATHIS — Always Claude, all slots:**
```
kanoonsaathi    (law — factual accuracy critical)
medicosaathi    (medicine — patient safety)
pharmasaathi    (pharmacy — drug accuracy)
accountsaathi   (accounting — tax compliance)
```

---

## Plan Tiers — Current

| Plan | Price | Daily chats | Notes |
|------|-------|-------------|-------|
| free | ₹0 | 5 | Slots 1, 5 only |
| trial | ₹99 first month | 20 | One-time ever |
| plus-monthly | ₹199/mo | 20 | All slots |
| plus-annual | ₹1,990/yr | 20 | 14 months equiv |
| unlimited | Internal | ∞ | Jaydeep's accounts |

**Quota is enforced SERVER-SIDE using IST dates.**
Client uses `todayIST()` from `@/lib/quota` — NOT `new Date().toISOString().slice(0,10)`.
That UTC vs IST bug caused a 5.5-hour free bypass window. Fixed April 2026.

---

## Soul Engine — v2 (April 2026)

`soul-update` Edge Function writes 18 fields after every session:

```
ALWAYS WRITTEN:
display_name, preferred_tone, top_topics, struggle_topics,
last_session_summary, session_count, last_session_date,
session_depth_avg, question_sophistication_score,
passion_intensity, flame_stage, peer_mode, exam_mode,
shell_broken, shell_broken_at (when first broken)

AI-EXTRACTED (Groq):
passion_peak_topic     ← real academic topic, never generic words
career_interest        ← specific career mentioned
career_discovery_stage ← unaware/curious/exploring/committed
predicted_trajectory   ← research/professional/entrepreneurial/academic
depth_calibration      ← 0-100, adjusts max ±10 per session
emerging_interests     ← topics beyond enrolled subjects
prior_knowledge_base   ← what student already knows
```

**flame_stage progression (quality-gated, not just session count):**
```
cold  → default
spark → session_count >= 3 AND depth_avg >= 20
ember → session_count >= 8 AND depth_avg >= 35
fire  → session_count >= 15 AND depth_avg >= 50 AND passion >= 50
wings → session_count >= 30 AND passion >= 70 AND shell_broken
```

**passion_peak_topic validation:**
Never write generic words (Pass, Notes, What, Yes, Ok).
AI prompt explicitly rejects these. Always a genuine academic topic.

---

## Personality System

68 historical figures across all 30 Saathis.
Random per session. Entire session in that voice.
Exit: student types "speak as Saathi" / "normal mode" / "back to Saathi".

**Files:**
```
supabase/functions/_shared/saathiPersonalities_part1.ts  (STEM)
supabase/functions/_shared/saathiPersonalities_part2.ts  (non-STEM + rotation logic)
```

**Prof. Sharma conflict:** KanoonSaathi system prompt previously had
hardcoded Prof. Sharma / Arjun / Meera personas. These override the
personality system. Remove any such hardcoded personas — let the
personality system handle all character voices.

**Time-aware greeting:** Personality prompt includes IST time context.
Never say "Good morning" at 10 PM. The prompt includes:
`Current time in India: [morning/afternoon/evening/night].`

---

## Grounding Rules (for chat Edge Function)

Add to system prompt for kanoonsaathi, medicosaathi, pharmasaathi, accountsaathi:

```
GROUNDING RULES:
- Never invent specific section numbers, drug dosages, or statistics
- When uncertain: "I believe this is correct — please verify"
- Flag anything that may have changed after July 2024
- You cannot access real-time data — say so when asked
```

**KanoonSaathi temporal update (CRITICAL):**
```
IPC → replaced by Bharatiya Nyaya Sanhita (BNS) 2023, effective 1 July 2024
CrPC → replaced by BNSS 2023
Indian Evidence Act → replaced by BSA 2023
Always mention equivalent BNS section when discussing IPC sections.
```

**Correction injection** (in chat/index.ts, before sending to Claude/Groq):
```typescript
const { data: corrections } = await supabaseAdmin
  .from('fact_corrections')
  .select('wrong_claim, correct_claim, topic')
  .eq('vertical_id', saathiId)
  .eq('status', 'verified')
  .order('verified_at', { ascending: false })
  .limit(20)

if (corrections?.length) {
  systemPrompt = `VERIFIED CORRECTIONS — ALWAYS USE:\n${
    corrections.map((c, i) =>
      `${i+1}. WRONG: "${c.wrong_claim}"\n   CORRECT: "${c.correct_claim}"`
    ).join('\n')
  }\n\n` + systemPrompt
}
```

---

## Edge Functions — All 37

```
CORE CHAT:
chat (v96)              rss-fetch              daily-challenge
soul-update             checkin-eval           quota-reset
curate-resources        eval-flagged

PAYMENTS:
razorpay-order          razorpay-webhook
pause-subscription      resume-subscription
subscription-lifecycle  cancel-subscription

AUTH + USERS:
auth-register           delete-account
process-dpdp-request

NOTIFICATIONS:
send-welcome-email      send-session-digest
send-feedback-alert     send-nudge
notify-meeting-link     notify-lecture-proposal
whatsapp-webhook        weekly-letter

FACULTY + SESSIONS:
confirm-lecture-slot    session-request
match-interns           faculty-verify

ADMIN:
admin-digest            health-monitor
refresh-saathi-stats    generate-recommendations
report-factual-error    verify-correction

CONTENT:
board-draft             rss-fetch
```

**After every deploy, verify with:** `supabase functions list`
Version number must increment. If not — deploy failed silently.

---

## Cron Jobs — 11 Active (pg_cron via pg_net)

```
cron-quota-reset           30 18 * * *   (midnight IST)
cron-send-session-digest   30 16 * * *   (10 PM IST)
cron-subscription-lifecycle 0 2 * * *    (7:30 AM IST)
cron-resume-subscription   0 3 * * *     (8:30 AM IST)
cron-rss-fetch             30 0 * * *    (6 AM IST)
cron-health-monitor        0 * * * *     (hourly)
cron-process-dpdp-request  30 20 * * *   (2 AM IST)
cron-admin-digest-daily    30 2 * * *    (8 AM IST)
cron-admin-digest-weekly   30 3 * * 1    (Mon 9 AM IST)
cron-weekly-letter         30 2 * * 0    (Sun 8 AM IST)
cron-eval-flagged          (Sunday)
```

Cron uses `app.service_role_key` via `current_setting()`.
Never use hardcoded secrets in pg_cron SQL.

---

## Key DB Tables (54+ total)

```
CORE:
profiles              student_soul          chat_sessions
chat_messages         verticals             bot_personas

PAYMENTS:
subscriptions         saathi_addons         saathi_enrollments

CONTENT:
news_items            board_questions       board_answers
rss_articles          explore_resources     daily_challenges

FACULTY + SESSIONS:
faculty_profiles      faculty_sessions      live_sessions
lecture_requests      live_bookings

SOUL + PROGRESS:
student_points        point_transactions    saathi_stats_cache
fact_corrections      digest_sent_log       saathi_recommendations

COMPLIANCE:
consent_log           dpdp_requests         nudge_log
feedback              moderation_flags

LEARNING:
flashcards            checkin_results       learning_intents
internship_postings   exam_calendar
```

---

## Security Rules (Non-Negotiable)

```
1. JWT verified server-side in EVERY Edge Function
2. No API keys client-side — ever
3. RLS on ALL tables
4. safeError() for all error responses — no raw error.message
5. Rate limits:
   chat: 60/min, soul-update: 30/min,
   checkin-eval: 30/min, daily-challenge: 10/min
6. File uploads: server-side MIME magic number validation
7. History: fetched from DB server-side — client history ignored
8. admin endpoints: JWT + role === 'admin' check
```

---

## Board — Access Rules

Students can post on community board ONLY if:
1. `registered_at` is more than 24 hours ago
2. `profile_completeness_pct >= 60`

Show banner BEFORE input — not after failed post attempt.
Three states:
- Under 24h → "Opens at [time] IST"
- Over 24h, profile < 60% → "Complete your profile (X% → 60%)"
- Over 24h, profile >= 60% → Post freely

---

## Name Field Validation

Never accept names that are:
- Pure numbers (1234567)
- Keyboard mash (asdfgh, qwerty)
- Single repeated character (aaaa)
- Generic words (test, user, admin, na, abc)
- Under 2 characters or over 40
- Containing numbers or special characters

Use `validateDisplayName()` from `@/lib/validation/nameValidation.ts`
Apply at: onboarding, profile edit, auth-register Edge Function.

---

## WhatsApp Setup

```
API Number:       +91 98255 93204 (no personal WhatsApp)
Phone Number ID:  1010533742151361
Business Acct ID: 934629882802473
Admin receives:   +91 93740 75275 (personal)
Templates:        7 submitted to Meta, 4 Active, 3 In review
```

**Templates approved (Active — Quality pending):**
```
edusaathiai_session_booked
edusaathiai_meeting_link_ready
new_lecture_request
faculty_accepted_your_request
hello_world
```

**Phone number issue:** +91 98255 93204 still has active personal
WhatsApp account. Must delete before Cloud API registration completes.
Delete: Settings → Account → Delete My Account on that number.

---

## DPDP Compliance

```
Data Fiduciary:    Jaydeep Buch (NOT IAES)
Grievance Officer: Jaydeep Buch
Contact:           admin@edusaathiai.in
Privacy page:      edusaathiai.in/privacy

Delete account:    All roles — student, faculty, institution, public
                   Hard delete: soul, sessions, points, auth user
                   Anonymise: profiles row (keep for FK integrity)
                   Keep: subscriptions (financial records)
```

---

## Immersive Components (Never Remove)

These are the foundation of the XR roadmap:

```
MoleculeViewer      [MOLECULE]    Chemistry AR
Molecule3DViewer    [MOLECULE3D]  PubChem 3D
MechanismViewer     [MECHANISM]   Reaction animation
AnatomyViewer       [ANATOMY]     Medical AR
CircuitSimulator    [CIRCUIT]     Live circuits
ArchModel3D         [ARCHMODEL]   Building walkthroughs
Scene360Viewer      [SCENE360]    360° VR feed
MindMap             [MINDMAP]     Spatial knowledge graph
FloorPlanViewer     [FLOORPLAN]   AR floor projection
```

**Caption text in these components:**
Use `rgba(255,255,255,0.65)` — NOT `rgba(255,255,255,0.3)`.
These widgets have dark card backgrounds even in light theme.
0.3 is invisible. 0.65 is readable.

---

## Common Bugs to Never Repeat

```
1. UUID as slug in SAATHIS.find()
   → Always toSlug() first
   → Never ?? SAATHIS[0] fallback

2. UTC date for quota check
   → Always todayIST() from @/lib/quota

3. Edge Function built but never deployed
   → After every build: supabase functions list
   → Verify version incremented

4. IAES Ahmedabad referenced anywhere
   → Remove immediately. Platform belongs to Jaydeep Buch.

5. white/rgba(255,255,255,x) as text in light theme
   → Use var(--text-secondary) or var(--text-tertiary)

6. vertical_id passed as slug to DB
   → Always resolveVerticalId() before insert

7. Client-side history sent to chat function
   → History is fetched server-side from chat_messages
   → Client history in request body is ignored

8. primary_saathi_id used directly in URL or component
   → Always toSlug(profile.primary_saathi_id) first

9. Soul upsert with .insert() instead of .upsert()
   → Always onConflict: 'user_id,vertical_id'
   → Unique constraint exists on that pair

10. passion_peak_topic accepting generic words
    → AI prompt explicitly rejects: Pass, Notes, What, Yes, Ok
    → Must be a genuine academic topic
```

---

## File Structure (Key Files)

```
website/src/
  app/
    (auth)/login/          onboard/
    (app)/chat/            board/          news/
         profile/          progress/       flashcards/
         faculty/          live/           requests/
         internships/      research/       learn/
    admin/                 pricing/        explore/
    api/                   layout.tsx      page.tsx

  components/
    chat/     ChatWindow  MessageBubble  BotSelector
              Sidebar     SaathiHeader   InputArea
              EmptyState  DidYouKnow     ReportErrorButton
              FeedbackWidget
    ui/       design system components
    saathi/   SaathiCard  SaathiGrid

  constants/
    saathis.ts        ← 30 Saathis, slugs as .id
    verticalIds.ts    ← UUID map for all 30
    subjectChips.ts   ← subjects per Saathi (all 30 covered)
    plans.ts          bots.ts

  lib/
    resolveVerticalId.ts   ← slug → UUID
    validation/nameValidation.ts
    quota.ts               ← todayIST() lives here
    soul.ts                supabase/

  stores/
    authStore.ts    chatStore.ts    soulStore.ts    fontStore.ts

supabase/functions/
  _shared/
    cors.ts         rateLimit.ts    validate.ts
    saathiPersonalities_part1.ts
    saathiPersonalities_part2.ts
  chat/             soul-update/    rss-fetch/
  [34 more functions]
```

---

## Razorpay — LIVE MODE

```
Payments are LIVE. Real money.
Triple charge guard: useRef(false) in pricing/page.tsx
Server-side: 409 if already_subscribed
Never create duplicate orders.
```

---

## Admin Dashboard

```
URL: edusaathiai-admin.vercel.app
Sections:
  Users          → filter by plan, flame, activity, Saathi
  Revenue        → subscription data
  Moderation     → flagged content
  Observability  → platform health
  WhatsApp       → message logs
  Suspensions    → 4-tier system
  Faculty        → profiles + verification
  Sessions (1:1) → booking management
  Live Lectures  → group sessions
  Requests       → lecture requests
  Financials     → payouts
  Saathi Stats   → per-Saathi analytics
  Nudge Centre   → send emails/WhatsApp to segments
  Platform Health → Edge Functions + cron status
```

---

## Session Checklist (Run at End of Every Session)

```bash
# 1. Verify all functions deployed
supabase functions list

# 2. Verify DB health
# Run in Supabase SQL Editor:
SELECT
  (SELECT COUNT(*) FROM verticals WHERE is_active = true) AS saathis,
  (SELECT COUNT(*) FROM saathi_stats_cache)               AS cache_rows,
  (SELECT COUNT(*) FROM profiles WHERE is_active = true)  AS active_users,
  (SELECT COUNT(*) FROM profiles
   WHERE plan_id != 'free' AND plan_id != 'deleted')      AS paid_users;

# 3. Deploy frontend
npm run test:saathis   # must pass before deploy
npm run build && vercel --prod
```
