-- ── Saathi Community Stats Cache ─────────────────────────────────────────────
-- Aggregate student counts per Saathi vertical.
-- Never queried live — populated by refresh-saathi-stats Edge Function every 48h.
-- Students see community size without any PII being exposed.

CREATE TABLE IF NOT EXISTS saathi_stats_cache (
  vertical_id          TEXT PRIMARY KEY,
  -- slug e.g. 'maathsaathi', matches profiles.primary_saathi_id

  -- Student counts
  total_students       INTEGER NOT NULL DEFAULT 0,
  active_students      INTEGER NOT NULL DEFAULT 0,
  -- students with any chat_session in last 30 days
  paying_students      INTEGER NOT NULL DEFAULT 0,
  -- students with plan_id != 'free'

  -- Engagement
  total_sessions       INTEGER NOT NULL DEFAULT 0,
  total_messages       INTEGER NOT NULL DEFAULT 0,
  avg_depth            NUMERIC(4,1) NOT NULL DEFAULT 0,

  -- Community insights
  top_topics           TEXT[] NOT NULL DEFAULT '{}',

  -- Community label (computed from total_students)
  community_label      TEXT NOT NULL DEFAULT 'Founding Members',

  -- Cache freshness
  last_refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_refresh_at      TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '48 hours',

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE saathi_stats_cache ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (pure aggregates, zero PII)
CREATE POLICY stats_read ON saathi_stats_cache
  FOR SELECT TO authenticated USING (true);

-- Service role writes only
CREATE POLICY stats_service ON saathi_stats_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX idx_saathi_stats_label ON saathi_stats_cache(community_label);

-- ── pg_cron: refresh every 48 hours at 6 AM ───────────────────────────────────

SELECT cron.schedule(
  'refresh-saathi-stats',
  '0 6 */2 * *',
  $$
    SELECT net.http_post(
      url     := current_setting('app.supabase_url') || '/functions/v1/refresh-saathi-stats',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type',  'application/json'
      ),
      body    := '{}'::jsonb
    );
  $$
);
