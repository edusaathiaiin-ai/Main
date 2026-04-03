-- Migration 071: Comprehensive schema audit fixes
-- Fixes every mismatch found between DB schema and application code.
--
-- ISSUES FIXED:
--   1. chat_messages — add vertical_id, bot_slot (edge function sends these, columns missing)
--   2. chat_sessions — add session_id alias via view is unnecessary; edge function bypasses session tracking
--              The edge function uses (user_id, vertical_id, bot_slot, quota_date_ist) as the
--              quota key, not session_id. So chat_messages must store vertical_id + bot_slot.
--   3. moderation_flags — add status value 'auto_flagged' to constraint; add violation_type column;
--              details column is TEXT but edge function sends object — add details_json JSONB column
--   4. intern_listings — add institution_id column alias (code sends institution_id, DB has institution_profile_id)
--   5. flashcards — table missing entirely; create it
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. chat_messages: add vertical_id + bot_slot ─────────────────────────────
-- The chat edge function inserts with these columns. Without them inserts fail silently
-- (Postgres ignores unknown columns in upsert but rejects them in plain insert).
-- Also make session_id nullable — edge function doesn't track session_id per message.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS vertical_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS bot_slot    SMALLINT NULL;

ALTER TABLE public.chat_messages
  ALTER COLUMN session_id DROP NOT NULL;

-- ── 2. moderation_flags: fix constraint + add structured columns ──────────────

-- Drop old status constraint
ALTER TABLE public.moderation_flags
  DROP CONSTRAINT IF EXISTS moderation_flags_status_check;

-- Re-add with 'auto_flagged' included (used by suspensions edge function)
ALTER TABLE public.moderation_flags
  ADD CONSTRAINT moderation_flags_status_check
  CHECK (status IN ('open', 'in_review', 'resolved', 'rejected', 'auto_flagged'));

-- Add details_json for structured violation data (edge function sends object, not string)
ALTER TABLE public.moderation_flags
  ADD COLUMN IF NOT EXISTS details_json JSONB NULL;

-- Add violation_type for suspension system tracking
ALTER TABLE public.moderation_flags
  ADD COLUMN IF NOT EXISTS violation_type TEXT NULL;

-- ── 3. intern_listings: add institution_id as alias for institution_profile_id ─
-- institution/page.tsx sends institution_id (which is institution_profiles.id).
-- Rather than renaming the column (breaking), add institution_id as a separate nullable column.
ALTER TABLE public.intern_listings
  ADD COLUMN IF NOT EXISTS institution_id UUID NULL REFERENCES public.institution_profiles(id) ON DELETE SET NULL;

-- Backfill from existing institution_profile_id
UPDATE public.intern_listings
  SET institution_id = institution_profile_id
  WHERE institution_id IS NULL AND institution_profile_id IS NOT NULL;

-- ── 4. flashcards: create missing table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.flashcards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vertical_id TEXT NOT NULL,
  front       TEXT NOT NULL,
  back        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

CREATE POLICY flashcards_own ON public.flashcards
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY flashcards_service ON public.flashcards
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_flashcards_user
  ON public.flashcards (user_id, vertical_id, created_at DESC);

CREATE OR REPLACE TRIGGER trg_flashcards_updated_at
  BEFORE UPDATE ON public.flashcards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
