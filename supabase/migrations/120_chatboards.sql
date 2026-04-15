-- ────────────────────────────────────────────────────────────────────────
-- 120_chatboards.sql
--
-- Phase 1 of Saathi Workspaces.
--
-- Turns flat chat history into structured, named, persistent Boards.
-- Existing chat_sessions (daily quota bucket — one row per user × Saathi
-- × bot_slot × IST date) stays untouched. chat_messages gains an
-- optional chatboard_id for dual-link: messages still belong to a
-- quota session AND to a logical Board.
--
-- Identity uses saathi_slug (TEXT) rather than verticals.id (UUID). This
-- is a deliberate deviation from the rest of the schema — the Board
-- concept is consumed by client UIs that already work in slugs, and the
-- UUID↔slug conversion friction isn't worth it here. The trigger below
-- resolves the slug from verticals.id when a profile's primary_saathi_id
-- gets set.
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.chatboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  saathi_slug TEXT NOT NULL,

  -- Identity
  name TEXT NOT NULL,
  emoji TEXT DEFAULT '📒',
  focus_statement TEXT,          -- max 100 chars, optional

  -- Type
  board_type TEXT DEFAULT 'subject'
    CHECK (board_type IN ('subject', 'exam', 'project', 'general')),

  -- Exam linkage
  exam_target_id TEXT,           -- references EXAM_REGISTRY.id (client-side constant)

  -- Bot slot memory
  last_bot_slot INTEGER DEFAULT 1,

  -- State
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  message_count INTEGER DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  position INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.chatboards IS
  'Persistent, named conversation Boards per (user × Saathi). chat_sessions remains the daily quota bucket; chat_messages dual-links to both.';

-- Link messages to boards (non-destructive — existing messages get null)
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS chatboard_id uuid REFERENCES public.chatboards(id);

COMMENT ON COLUMN public.chat_messages.chatboard_id IS
  'Logical Board the message belongs to. session_id still present for quota lineage. Null for messages predating the Boards migration; Phase 2 backfill assigns them to a default General Board per (user × Saathi).';

-- Auto-create General board when a profile picks its primary Saathi.
-- Fires on OLD null → NEW set transition. Existing students are handled
-- by the Phase 2 backfill — this trigger covers future students only.
CREATE OR REPLACE FUNCTION public.auto_create_general_board()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.primary_saathi_id IS NOT NULL
     AND OLD.primary_saathi_id IS NULL THEN
    INSERT INTO public.chatboards (user_id, saathi_slug, name, emoji, board_type, is_pinned, position)
    SELECT NEW.id, v.slug, 'General', '💬', 'general', false, 0
      FROM public.verticals v
     WHERE v.id = NEW.primary_saathi_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS on_saathi_selected ON public.profiles;
CREATE TRIGGER on_saathi_selected
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_general_board();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatboards_user_saathi
  ON public.chatboards (user_id, saathi_slug, is_archived, position);

CREATE INDEX IF NOT EXISTS idx_chatboards_exam
  ON public.chatboards (exam_target_id)
  WHERE exam_target_id IS NOT NULL;
