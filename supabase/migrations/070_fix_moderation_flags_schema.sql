-- Migration 070: Fix moderation_flags schema mismatch
--
-- The original table (013) was designed for user-flagging content:
--   reporter_user_id, target_type (NOT NULL + CHECK), target_id (NOT NULL), reason (NOT NULL)
--
-- Since then, admin logging, faculty doc uploads, and other features evolved to
-- insert rows with a different set of columns:
--   flag_type, content, reported_by, resolved
--   (and NOT providing target_type / target_id / reason)
--
-- This migration reconciles both use cases:
--   1. Add the missing new columns
--   2. Relax NOT NULL on old columns so admin-style inserts don't fail
--   3. Drop + re-add the target_type CHECK constraint to work with NULLs
--   4. Add resolved boolean (mirrors old boolean usage in admin code)
--   5. Keep status column for admin dashboard filtering
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add new columns used by admin logging / notify routes
ALTER TABLE public.moderation_flags
  ADD COLUMN IF NOT EXISTS flag_type    TEXT NULL,
  ADD COLUMN IF NOT EXISTS content      TEXT NULL,
  ADD COLUMN IF NOT EXISTS reported_by  UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS resolved     BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Relax NOT NULL constraints on original columns so both insert patterns work
ALTER TABLE public.moderation_flags
  ALTER COLUMN target_type DROP NOT NULL,
  ALTER COLUMN target_id   DROP NOT NULL,
  ALTER COLUMN reason      DROP NOT NULL;

-- 3. Drop old target_type check constraint and re-add as nullable-safe
--    (Postgres CHECK constraints pass on NULL — this is just for documentation)
ALTER TABLE public.moderation_flags
  DROP CONSTRAINT IF EXISTS moderation_flags_target_type_check;

ALTER TABLE public.moderation_flags
  ADD CONSTRAINT moderation_flags_target_type_check
  CHECK (target_type IS NULL OR target_type IN ('chat_message', 'board_question', 'board_answer', 'note'));

-- 4. Sync resolved boolean with status text for existing rows
UPDATE public.moderation_flags
  SET resolved = (status IN ('resolved', 'rejected'))
  WHERE resolved = FALSE AND status IN ('resolved', 'rejected');
