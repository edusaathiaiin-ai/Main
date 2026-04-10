-- ════════════════════════════════════════════════════════════════
-- Migration 096 — Factual Error Reporting System
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fact_corrections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who reported
  reporter_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_role   TEXT,             -- student / faculty / institution / public
  reporter_email  TEXT,             -- for notification when verified

  -- What Saathi + context
  vertical_id     UUID REFERENCES verticals(id) ON DELETE CASCADE,
  vertical_slug   TEXT NOT NULL,    -- denormalised for easy querying
  bot_slot        SMALLINT,         -- which bot mode was active
  session_id      UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,

  -- The error
  wrong_claim     TEXT NOT NULL,    -- what the Saathi said that is wrong
  correct_claim   TEXT NOT NULL,    -- what the reporter believes is correct
  topic           TEXT,             -- e.g. "Section 498A IPC"
  message_excerpt TEXT,             -- the specific Saathi message that was wrong
  evidence_url    TEXT,             -- optional: link to source (bare act, judgment)

  -- Admin workflow
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',    -- submitted, not reviewed
      'verified',   -- confirmed correct by admin — inject into Saathi
      'rejected',   -- reporter was wrong
      'duplicate'   -- same error already reported
    )),
  admin_note      TEXT,
  verified_by     TEXT,             -- admin name who verified
  verified_at     TIMESTAMPTZ,

  -- Reward tracking
  points_awarded  INTEGER DEFAULT 0,
  reward_sent_at  TIMESTAMPTZ,

  -- Injection tracking
  injected_at     TIMESTAMPTZ,      -- when correction was added to system prompt
  prevented_count INTEGER DEFAULT 0, -- how many students got correct answer after fix

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_fc_vertical
  ON fact_corrections (vertical_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fc_status
  ON fact_corrections (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fc_reporter
  ON fact_corrections (reporter_id, created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE fact_corrections ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert
CREATE POLICY "fc_insert" ON fact_corrections
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Reporter can read their own
CREATE POLICY "fc_read_own" ON fact_corrections
  FOR SELECT USING (auth.uid() = reporter_id);

-- Service role full access
CREATE POLICY "fc_service" ON fact_corrections
  FOR ALL USING (auth.role() = 'service_role');

-- Admin full access
CREATE POLICY "fc_admin" ON fact_corrections
  FOR ALL USING (is_admin());

-- ── Updated_at trigger ────────────────────────────────────────────
CREATE TRIGGER fact_corrections_updated_at
  BEFORE UPDATE ON fact_corrections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
