/*
  Migration 060 — explore_resources
  Purpose: Curated knowledge resources per Saathi, cached weekly.
  vertical_id references verticals(id) which is TEXT (the slug, e.g. 'kanoonsaathi').
*/

CREATE TABLE IF NOT EXISTS public.explore_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Saathi this resource belongs to
  vertical_id TEXT NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,

  -- Resource content
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  url         TEXT NOT NULL,
  resource_type TEXT NOT NULL
    CHECK (resource_type IN ('book','article','website','youtube','journal','tool','paper')),

  -- Display
  emoji               TEXT    NOT NULL DEFAULT '📖',
  author              TEXT    NULL,
  publisher           TEXT    NULL,
  year                INTEGER NULL,
  is_free             BOOLEAN NOT NULL DEFAULT true,
  is_indian_context   BOOLEAN NOT NULL DEFAULT false,

  -- Curation metadata
  curated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  curated_by  TEXT        NOT NULL DEFAULT 'ai' CHECK (curated_by IN ('ai', 'manual')),
  week_number INTEGER     NOT NULL,

  -- Ordering + prominence
  display_order INTEGER NOT NULL DEFAULT 0,
  is_featured   BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.explore_resources ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read
CREATE POLICY explore_read
  ON public.explore_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can write (edge function uses service role key)
CREATE POLICY explore_service_write
  ON public.explore_resources
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Fast fetch index
CREATE INDEX IF NOT EXISTS idx_explore_vertical_week
  ON public.explore_resources (vertical_id, week_number);

-- Ordering index
CREATE INDEX IF NOT EXISTS idx_explore_order
  ON public.explore_resources (vertical_id, display_order);
