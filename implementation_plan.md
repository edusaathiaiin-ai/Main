# Instant Soul Calibration — Any Student, Any Level, Session 1

A PhD scholar joining today gets peer mode from message 1.
A Masters student gets depth=70 and "specialisation-first" greeting.
A 1st-year Bachelor gets gentle onboarding depth=25.

## Key Findings Before Planning

| File | Current State |
|------|--------------|
| [onboard/page.tsx](file:///c:/Users/JAYDEEP/EdUsaathiAI/website/src/app/%28auth%29/onboard/page.tsx) | Steps: loading→role→saathi→profile. Year dropdown has "PhD", "Postgraduate". No `academic_level` concept. |
| [app/(auth)/profile-setup.tsx](file:///c:/Users/JAYDEEP/EdUsaathiAI/app/%28auth%29/profile-setup.tsx) | Mobile equivalent — simple year dropdown. |
| `student_soul` table (004_student_soul.sql) | Has: `ambition_level, depth_calibration` (wait, checking...) **Missing**: `depth_calibration`, `peer_mode`, `exam_mode`, `flame_stage`, `career_discovery_stage`, `prior_knowledge_base` |
| [auth-register/index.ts](file:///c:/Users/JAYDEEP/EdUsaathiAI/supabase/functions/auth-register/index.ts) | Creates `profiles` row only. No `student_soul` row created here. |
| `chat/index.ts buildSystemPrompt()` | Reads `student_soul` fields. Has `session_count`. Direct place to add first-session greeting. |
| `onboard/page.tsx handleProfile()` | Creates `student_soul` row via upsert. This is where `instantCalibrate()` must be called. |

> [!IMPORTANT]
> The `student_soul` table (migration 004) does NOT have `depth_calibration`, `peer_mode`, `exam_mode`, `flame_stage`, or `career_discovery_stage`. We need **migration 045** to add them.

## Proposed Changes

---

### DB Layer

#### [NEW] [045_soul_calibration_columns.sql](file:///c:\Users\JAYDEEP\EdUsaathiAI\supabase\migrations\045_soul_calibration_columns.sql)

Add new columns to `student_soul`:
```sql
ALTER TABLE public.student_soul
  ADD COLUMN IF NOT EXISTS academic_level TEXT DEFAULT 'bachelor',
  ADD COLUMN IF NOT EXISTS depth_calibration INTEGER DEFAULT 40,
  ADD COLUMN IF NOT EXISTS peer_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS exam_mode BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS flame_stage TEXT DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS career_discovery_stage TEXT DEFAULT 'unaware',
  ADD COLUMN IF NOT EXISTS prior_knowledge_base TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS current_year INTEGER,
  ADD COLUMN IF NOT EXISTS total_years INTEGER,
  ADD COLUMN IF NOT EXISTS exam_target_soul TEXT;
```

Add `academic_level` to `profiles` table:
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS academic_level TEXT,
  ADD COLUMN IF NOT EXISTS previous_degree TEXT,
  ADD COLUMN IF NOT EXISTS thesis_area TEXT;
```

---

### Calibration Logic

#### [NEW] [website/src/lib/instantSoulCalibration.ts](file:///c:\Users\JAYDEEP\EdUsaathiAI\website\src\lib\instantSoulCalibration.ts)

Pure TypeScript (no Deno, no React) — used on both web and copied inline to Edge Functions.

Exports `instantCalibrate(params)` → `InstantCalibration`.

Exactly as specified — depth maps, flame maps, career discovery maps, prior knowledge arrays.

---

### Web Onboarding

#### [MODIFY] [onboard/page.tsx](file:///c:\Users\JAYDEEP\EdUsaathiAI\website\src\app\(auth)\onboard\page.tsx)

**Key changes:**
1. Add `'academic_level'` to [OnboardStep](file:///c:/Users/JAYDEEP/EdUsaathiAI/website/src/app/%28auth%29/onboard/page.tsx#14-15) type before `'role'`
2. Update [StepIndicator](file:///c:/Users/JAYDEEP/EdUsaathiAI/website/src/app/%28auth%29/onboard/page.tsx#129-173) to show 4 steps (academic → role → saathi → profile)
3. Add `AcademicLevelStep` component — 8 full-screen visual cards
4. Add sub-questions (year pickers) that appear inline when card selected
5. Update [handleProfile()](file:///c:/Users/JAYDEEP/EdUsaathiAI/website/src/app/%28auth%29/onboard/page.tsx#714-768) to call `instantCalibrate()` and pass result to soul upsert
6. [ProfileStep](file:///c:/Users/JAYDEEP/EdUsaathiAI/website/src/app/%28auth%29/onboard/page.tsx#438-657) shows level-specific additional fields (Part 5 — Masters shows thesis area, PhD shows research topic, competitive shows exam + prep duration)
7. Update routing logic: `!academic_level → academic_level step` else existing flow

---

### Mobile Onboarding

#### [MODIFY] [app/(auth)/profile-setup.tsx](file:///c:\Users\JAYDEEP\EdUsaathiAI\app\(auth)\profile-setup.tsx)

Same academic level selection as Step 1, before existing flow. Simpler scrollable card layout (React Native). Same `instantCalibrate()` call at save.

---

### Chat System Prompt

#### [MODIFY] [supabase/functions/chat/index.ts](file:///c:\Users\JAYDEEP\EdUsaathiAI\supabase\functions\chat\index.ts)

**Changes to [buildSystemPrompt()](file:///c:/Users/JAYDEEP/EdUsaathiAI/supabase/functions/chat/index.ts#237-339):**
1. Add new soul fields to SELECT query: `academic_level, depth_calibration, peer_mode, exam_mode, flame_stage`
2. Add [RawSoul](file:///c:/Users/JAYDEEP/EdUsaathiAI/supabase/functions/chat/index.ts#234-235) type extension for new fields
3. Add Part 4 first-session greeting block after `# SOUL RULES` section — conditionally renders based on `academic_level` and `session_count === 0`
4. Add depth instruction: `depth_calibration: ${depth}` — tell bot to match complexity to this score (0–100)
5. Add peer mode: if `peer_mode`, change tone to collegial research peer

---

### Existing Users Migration

#### [NEW] [supabase/functions/migrate-soul-levels/index.ts](file:///c:\Users\JAYDEEP\EdUsaathiAI\supabase\functions\migrate-soul-levels\index.ts)

Admin-only Edge Function (service role required, no JWT):
- Reads all `student_soul` rows
- Sets `academic_level = 'bachelor'`, runs `instantCalibrate({academicLevel:'bachelor',...})`, updates row
- Returns count of rows updated
- Designed to run once

---

## Verification Plan

### Manual Testing (after migrations run + deploy)

**Test 1 — New PhD student web flow:**
1. Open [localhost:3000/onboard](http://localhost:3000/onboard) (or staging)
2. Step 0: Select "🧪 PhD / Doctorate" card → sub-question "Which year?" appears → select "3rd Year"
3. Step 1: Select role "Student"
4. Step 2: Select any Saathi (e.g. KanoonSaathi)
5. Step 3: Profile form shows PhD-specific fields (thesis topic, institution, previous degree)
6. Submit → check Supabase `student_soul` table: `peer_mode=true`, `depth_calibration=88`, `flame_stage='fire'`
7. Open chat → confirm first message from Saathi uses peer greeting ("What's your research question?")

**Test 2 — Masters student:**
1. Select "🔬 Master's Degree" → sub-question year → "1st Year"
2. Complete flow → check: `depth_calibration=70`, `peer_mode=false`, `flame_stage='flame'`
3. Chat first message should ask about specialisation, skip basic intro

**Test 3 — 1st year Bachelor:**
1. Select "🎓 Bachelor's Degree" → "1st Year"
2. Check: `depth_calibration=25`, `peer_mode=false`, `flame_stage='cold'`
3. Chat greeting should be warm welcome, ask about semester + challenges

**Test 4 — Competitive exam:**
1. Select "📖 Competitive Exam Prep" → sub-question "Which exam?" → "UPSC"
2. Check: `exam_mode=true`, `depth_calibration=50`, `flame_stage='flame'`
3. Chat greeting asks how long preparing and biggest challenge

**Test 5 — Existing users migration:**
```
POST https://vpmpuxosyrijknbxautx.supabase.co/functions/v1/migrate-soul-levels
Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
```
Response should include `updated_count`; check a sample row in Supabase dashboard.

### DB Verification Query (run in Supabase SQL Editor after migration 045)
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'student_soul'
AND column_name IN ('academic_level','depth_calibration','peer_mode','exam_mode','flame_stage','career_discovery_stage');
-- Expect 6 rows
```
