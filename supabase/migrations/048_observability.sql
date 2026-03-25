-- Migration 048: Observability — traces table
-- Records every chat interaction with timing, AI provider, soul state, and outcome.

CREATE TABLE IF NOT EXISTS public.traces (
  trace_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  session_id     TEXT,
  action_type    TEXT        NOT NULL,
  saathi_id      TEXT,
  bot_slot       INTEGER,
  started_at     TIMESTAMPTZ DEFAULT now(),
  completed_at   TIMESTAMPTZ,
  duration_ms    INTEGER,
  ttfb_ms        INTEGER,
  total_tokens   INTEGER,
  prompt_tokens  INTEGER,
  ai_provider    TEXT,
  depth_calibration INTEGER,
  academic_level TEXT,
  flame_stage    TEXT,
  outcome        TEXT,          -- 'success' | 'error' | 'quota_exceeded' | 'rate_limited'
  error_code     TEXT,
  error_message  TEXT,
  soul_updated   BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.traces ENABLE ROW LEVEL SECURITY;

-- Only service_role (Edge Functions) can read/write traces
CREATE POLICY traces_service_role
  ON public.traces FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- Query performance indexes
CREATE INDEX IF NOT EXISTS idx_traces_user_id
  ON public.traces (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_outcome
  ON public.traces (outcome, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_action_type
  ON public.traces (action_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_ai_provider
  ON public.traces (ai_provider, created_at DESC);

-- 30-day auto-cleanup function (call from a pg_cron job if desired)
CREATE OR REPLACE FUNCTION cleanup_old_traces()
RETURNS void
LANGUAGE sql AS $$
  DELETE FROM public.traces
  WHERE created_at < now() - interval '30 days';
$$;

-- Verify
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name)))
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'traces';
