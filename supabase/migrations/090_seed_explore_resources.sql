-- 090_seed_explore_resources.sql
--
-- Creates the explore_resources table (Treasure Chest feature) and seeds
-- initial data for KanoonSaathi. The curate-resources edge function writes
-- AI-generated rows weekly; this migration provides the static baseline.

-- ── Table ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.explore_resources (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id       UUID        NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  title             TEXT        NOT NULL,
  description       TEXT        NOT NULL DEFAULT '',
  url               TEXT        NOT NULL,
  resource_type     TEXT        NOT NULL DEFAULT 'website'
                                CHECK (resource_type IN (
                                  'book','article','website','youtube',
                                  'journal','tool','paper'
                                )),
  emoji             TEXT        NOT NULL DEFAULT '📌',
  author            TEXT,
  publisher         TEXT,
  year              INTEGER,
  is_free           BOOLEAN     NOT NULL DEFAULT TRUE,
  is_indian_context BOOLEAN     NOT NULL DEFAULT FALSE,
  display_order     INTEGER     NOT NULL DEFAULT 99,
  is_featured       BOOLEAN     NOT NULL DEFAULT FALSE,
  week_number       INTEGER     NOT NULL DEFAULT 0,
  curated_by        TEXT        NOT NULL DEFAULT 'ai',
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance index: main query pattern (vertical + week + order)
CREATE INDEX IF NOT EXISTS idx_explore_resources_vertical_week
  ON public.explore_resources (vertical_id, week_number, display_order);

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.explore_resources ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all active resources
CREATE POLICY explore_resources_read
  ON public.explore_resources
  FOR SELECT
  TO authenticated
  USING (is_active = TRUE);

-- Service role has full access (edge function uses service role key)
CREATE POLICY explore_resources_service_all
  ON public.explore_resources
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

-- ── Seed: KanoonSaathi baseline resources ──────────────────────────────────
-- vertical_id: kanoonsaathi = 2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9
-- week_number = 0 means "seed / always available" — edge fn uses week 1+

INSERT INTO public.explore_resources
  (vertical_id, title, description, url,
   resource_type, emoji,
   author, publisher, year,
   is_free, is_indian_context,
   display_order, is_featured,
   week_number, curated_by, is_active)
VALUES
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Indian Kanoon',
    'Free access to Indian court judgements, statutes, and legal documents. Essential for case law research across all Indian courts.',
    'https://indiankanoon.org',
    'website', '⚖️',
    NULL, NULL, NULL,
    TRUE, TRUE,
    1, TRUE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Live Law',
    'Real-time reporting on Supreme Court and High Court decisions, legal analysis, and breaking news from Indian courts.',
    'https://www.livelaw.in',
    'website', '📰',
    NULL, NULL, NULL,
    TRUE, TRUE,
    2, TRUE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Constitution of India — Full Text',
    'Complete text of the Indian Constitution with all amendments up to date. The primary source for all constitutional law study.',
    'https://www.constitutionofindia.net',
    'paper', '📜',
    NULL, 'Government of India', NULL,
    TRUE, TRUE,
    3, TRUE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Bar and Bench',
    'Independent legal news platform covering courts, law firms, regulatory developments, and legal policy across India.',
    'https://www.barandbench.com',
    'website', '🏛️',
    NULL, NULL, NULL,
    TRUE, TRUE,
    4, FALSE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Bare Acts Live',
    'Complete bare acts of India with amendments, section-wise navigation, and commentary. Covers IPC, CPC, CrPC, and all major central acts.',
    'https://www.bareactslive.com',
    'website', '📖',
    NULL, NULL, NULL,
    TRUE, TRUE,
    5, FALSE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'Law Commission of India Reports',
    'Official law reform reports from the Law Commission — essential for UPSC Law optional and understanding legislative intent.',
    'https://lawcommissionofindia.nic.in',
    'journal', '🏛️',
    NULL, 'Government of India', NULL,
    TRUE, TRUE,
    6, FALSE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'SSRN Legal Scholarship Network',
    'Pre-print papers in Indian and international law by leading academics. Great for research topics and citation sourcing.',
    'https://www.ssrn.com/index.cfm/en/lawschoolnetwork/',
    'journal', '🔬',
    NULL, 'SSRN', NULL,
    TRUE, FALSE,
    7, FALSE,
    0, 'seed', TRUE
  ),
  (
    '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
    'LawBhoomi — CLAT Preparation',
    'Comprehensive free CLAT, AILET, and law entrance preparation resources including mock tests, current affairs, and GK.',
    'https://lawbhoomi.com',
    'tool', '🎯',
    NULL, NULL, NULL,
    TRUE, TRUE,
    8, FALSE,
    0, 'seed', TRUE
  )
ON CONFLICT DO NOTHING;
