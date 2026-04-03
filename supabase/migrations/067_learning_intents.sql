-- ── Learning Intent Marketplace ──────────────────────────────────────────────
-- Students declare what they want to learn.
-- Faculty discover demand and create sessions. Completes the two-sided loop.

CREATE TABLE IF NOT EXISTS learning_intents (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vertical_id          TEXT NOT NULL,           -- saathi id e.g. 'maathsaathi'

  -- The intent
  topic                TEXT NOT NULL CHECK (char_length(topic) <= 100),
  description          TEXT CHECK (char_length(description) <= 300),

  -- Preferences
  depth_preference     TEXT NOT NULL DEFAULT 'intermediate'
                         CHECK (depth_preference IN ('beginner','intermediate','advanced')),
  format_preference    TEXT NOT NULL DEFAULT 'any'
                         CHECK (format_preference IN ('lecture','series','workshop','onetoone','any')),
  max_price_paise      INTEGER NOT NULL DEFAULT 150000,
  urgency              TEXT NOT NULL DEFAULT 'anytime'
                         CHECK (urgency IN ('this_month','next_3_months','anytime')),

  -- Auto-generated tags
  tags                 TEXT[] NOT NULL DEFAULT '{}',

  -- Social proof
  joiner_count         INTEGER NOT NULL DEFAULT 1,

  -- Status
  status               TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('open','fulfilled','expired','removed')),
  resulting_session_id UUID NULL REFERENCES live_sessions(id),

  -- Visibility
  is_public            BOOLEAN NOT NULL DEFAULT true,

  -- Expiry
  expires_at           TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '90 days',
  nudge_sent           BOOLEAN NOT NULL DEFAULT false,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intent_joiners (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intent_id  UUID NOT NULL REFERENCES learning_intents(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (intent_id, student_id)
);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE learning_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_joiners   ENABLE ROW LEVEL SECURITY;

-- Students can read all public intents OR their own
CREATE POLICY intents_read ON learning_intents
  FOR SELECT TO authenticated
  USING (is_public = true OR student_id = auth.uid());

-- Students create only their own
CREATE POLICY intents_create ON learning_intents
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

-- Students update only their own
CREATE POLICY intents_update ON learning_intents
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid());

-- Students manage only their own joiner rows
CREATE POLICY joiners_own ON intent_joiners
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Faculty/service reads all joiners (for demand dashboard)
CREATE POLICY joiners_read ON intent_joiners
  FOR SELECT TO authenticated
  USING (
    intent_id IN (
      SELECT id FROM learning_intents WHERE is_public = true
    )
  );

-- Service role bypass
CREATE POLICY intents_service ON learning_intents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY joiners_service ON intent_joiners
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX idx_intents_vertical  ON learning_intents(vertical_id, status);
CREATE INDEX idx_intents_joiner_count ON learning_intents(joiner_count DESC);
CREATE INDEX idx_intents_status    ON learning_intents(status, expires_at);
CREATE INDEX idx_intent_joiners_intent ON intent_joiners(intent_id);
CREATE INDEX idx_intent_joiners_student ON intent_joiners(student_id);

-- ── Auto-update updated_at ─────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_learning_intent_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER learning_intents_updated_at
  BEFORE UPDATE ON learning_intents
  FOR EACH ROW EXECUTE FUNCTION update_learning_intent_timestamp();

-- ── Add intent_id to live_sessions ─────────────────────────────────────────────

ALTER TABLE live_sessions
  ADD COLUMN IF NOT EXISTS intent_id UUID NULL REFERENCES learning_intents(id),
  ADD COLUMN IF NOT EXISTS priority_booking_until TIMESTAMPTZ NULL;

-- ── Cron: expire old intents + send nudge ──────────────────────────────────────

SELECT cron.schedule(
  'expire-learning-intents',
  '0 9 * * *',
  $$
    -- Mark nudge_sent at ~30 days before expiry (60-day mark)
    UPDATE learning_intents
    SET nudge_sent = true
    WHERE status = 'open'
      AND nudge_sent = false
      AND expires_at BETWEEN now() + INTERVAL '29 days' AND now() + INTERVAL '31 days';

    -- Expire at 90 days
    UPDATE learning_intents
    SET status = 'expired'
    WHERE status = 'open'
      AND expires_at < now();
  $$
);
