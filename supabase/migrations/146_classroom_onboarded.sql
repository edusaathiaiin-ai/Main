-- ═══════════════════════════════════════════════════════════════════════════════
-- 146 — profiles.classroom_onboarded flag
--
-- One-shot guard that gates the pre-flight checklist (and a few smaller
-- onboarding nudges yet to land). Defaults to false so every existing
-- profile sees the checklist on their first session creation; flips to
-- true the moment the faculty either finishes Step 4 or skips out from
-- Step 1.
--
-- Single boolean column, additive only — no risk to existing reads or
-- writes. Idempotent via ADD COLUMN IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS classroom_onboarded boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.classroom_onboarded IS
  'True once the user has completed (or skipped) the classroom pre-flight '
  'checklist. Phase I-2 — gates first-session walkthroughs and a few smaller '
  'onboarding nudges. Default false so every pre-existing profile gets the '
  'walkthrough on their next session creation.';
