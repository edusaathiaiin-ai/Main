-- ────────────────────────────────────────────────────────────────────────
-- 116_saathi_horizons.sql
--
-- Horizon entries per Saathi — aspirational career pathways shown to
-- students. Each entry is a real destination (institution, qualification,
-- role, or entrepreneurial path) with a concrete "start today" action
-- the student can ask their Saathi about immediately.
--
-- Surfaces that consume this:
--   • /explore/[saathi] "Your Horizon" panel
--   • Saathi chat first-session opener (bot picks 1 random by difficulty)
--   • Profile page "what could you become" section
--
-- Content is admin-curated (service_role writes, public reads active).
-- ────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS saathi_horizons (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  saathi_slug        TEXT NOT NULL REFERENCES verticals(slug) ON DELETE CASCADE,

  title              TEXT NOT NULL,

  category           TEXT NOT NULL
    CHECK (category IN ('international','certification','crossover','entrepreneurship','research','today')),

  difficulty         TEXT NOT NULL
    CHECK (difficulty IN ('ambitious','reachable','today')),

  description        TEXT NOT NULL,
  inspiration        TEXT,

  steps              JSONB NOT NULL DEFAULT '[]',

  today_action       TEXT NOT NULL,
  today_prompt       TEXT,

  external_links     JSONB DEFAULT '[]',
  deadlines          JSONB DEFAULT '[]',

  academic_levels    TEXT[] DEFAULT ARRAY['bachelor','master','phd'],

  -- ── Authorship (the virtuous cycle) ──────────────────────────────────
  -- Faculty author Horizons → gain reputation + visibility on the card
  -- footer → drives session bookings. Author fields are CACHED so the
  -- card renders fast and survives the faculty later editing their
  -- profile. Initial seed rows are NULL + author_display_name =
  -- 'EdUsaathiAI Research'; faculty co-authorship layers in over time
  -- via the admin dashboard.
  authored_by          UUID REFERENCES faculty_profiles(id) ON DELETE SET NULL,
  author_display_name  TEXT,         -- e.g. 'Prof. R.K. Krishnamurthy'
  author_credentials   TEXT,         -- e.g. 'Constitutional Law · NLU · 38 years'
  author_verified_at   TIMESTAMPTZ,  -- when faculty last reviewed/refreshed THIS entry

  is_active          BOOLEAN DEFAULT true,
  last_verified_at   TIMESTAMPTZ,

  -- Set TRUE by the weekly cron when this row hasn't been verified in
  -- 90+ days. Admin dashboard surfaces these for re-check; UI hides
  -- time-sensitive Layer-2 details (deadlines, links) and falls back
  -- to the evergreen Layer-1 aspiration text.
  needs_verification BOOLEAN DEFAULT false,

  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_horizons_saathi
  ON saathi_horizons(saathi_slug, is_active);

-- "Show me all Horizons authored by this faculty" — drives the faculty
-- profile page reputation panel.
CREATE INDEX IF NOT EXISTS idx_horizons_authored_by
  ON saathi_horizons(authored_by)
  WHERE authored_by IS NOT NULL;

-- ── updated_at auto-maintenance ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_saathi_horizons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_saathi_horizons_updated_at ON saathi_horizons;
CREATE TRIGGER trg_saathi_horizons_updated_at
  BEFORE UPDATE ON saathi_horizons
  FOR EACH ROW
  EXECUTE FUNCTION set_saathi_horizons_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE saathi_horizons ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) can read active horizons — this is public
-- content by design; it's what the student sees when exploring a Saathi.
DROP POLICY IF EXISTS "horizons_public_read" ON saathi_horizons;
CREATE POLICY "horizons_public_read"
  ON saathi_horizons FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

-- Admin (service_role) only for writes. No end-user write path exists;
-- content is curated via migrations or admin dashboard.
DROP POLICY IF EXISTS "horizons_service_all" ON saathi_horizons;
CREATE POLICY "horizons_service_all"
  ON saathi_horizons FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE saathi_horizons IS
  'Admin-curated career pathways per Saathi. Public-readable when active.';

-- ── Weekly staleness flagger ─────────────────────────────────────────────
-- Mondays 09:00 UTC. Marks active rows as needing verification if the
-- last_verified_at is older than 90 days (or never set). Admin dashboard
-- queues these for re-check; UI hides Layer-2 details until cleared.
SELECT cron.schedule(
  'flag-stale-horizons',
  '0 9 * * 1',
  $$
    UPDATE saathi_horizons
       SET needs_verification = true
     WHERE is_active = true
       AND (last_verified_at IS NULL
            OR last_verified_at < NOW() - INTERVAL '90 days');
  $$
);
