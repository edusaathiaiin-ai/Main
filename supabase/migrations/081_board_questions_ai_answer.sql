-- Migration 081: Add ai_answer column + fix status constraint on board_questions
--
-- board-answer edge function writes to board_questions.ai_answer and sets
-- status='answered'. Neither existed in the original schema (migration 011).
--
-- Safe to run in any state: uses IF NOT EXISTS + constraint drop/recreate.

-- Add ai_answer column if missing
ALTER TABLE public.board_questions
  ADD COLUMN IF NOT EXISTS ai_answer TEXT NULL;

-- Fix status CHECK constraint to include 'answered'
-- Must drop + recreate (PostgreSQL doesn't support ALTER CONSTRAINT for checks)
ALTER TABLE public.board_questions
  DROP CONSTRAINT IF EXISTS board_questions_status_check;

ALTER TABLE public.board_questions
  ADD CONSTRAINT board_questions_status_check
  CHECK (status IN ('open', 'answered', 'closed', 'archived'));
