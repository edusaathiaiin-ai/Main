-- ═══════════════════════════════════════════════════════════════════════════════
-- 134 — Security events observability layer (Week 1: observe before enforce)
--
-- Writes a row every time an anonymous caller hits a protected /api/* route,
-- the Origin header is outside the allowlist, or a honeypot is triggered.
-- No blocking in Week 1 — just a ledger + admin view.
--
-- Event types bootstrapped (extensible without a migration — just insert a new string):
--   anon_hit_protected  — /api/* handler expected auth, got null user
--   bad_origin          — Origin header present but not in allowlist
--   honeypot_triggered  — decoy route hit (Phase 2)
--   rate_anomaly        — Upstash limiter trip (Phase 2)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.security_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  severity        TEXT NOT NULL DEFAULT 'info'
                   CHECK (severity IN ('info', 'warn', 'critical')),
  user_id         UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  ip              INET NULL,
  path            TEXT NOT NULL,
  method          TEXT NOT NULL,
  origin          TEXT NULL,
  referer         TEXT NULL,
  user_agent      TEXT NULL,
  country         TEXT NULL,
  metadata        JSONB NULL,
  resolved        BOOLEAN NOT NULL DEFAULT false,
  resolved_by     UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at     TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sec_events_created
  ON public.security_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sec_events_type_severity
  ON public.security_events(event_type, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sec_events_unresolved
  ON public.security_events(resolved, created_at DESC)
  WHERE resolved = false;

CREATE INDEX IF NOT EXISTS idx_sec_events_ip
  ON public.security_events(ip, created_at DESC);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS anyway, but keep an explicit INSERT policy for clarity.
DROP POLICY IF EXISTS security_events_service_insert ON public.security_events;
CREATE POLICY security_events_service_insert ON public.security_events
  FOR INSERT TO service_role WITH CHECK (true);

-- Admin reads via is_admin() helper (matches pattern in migrations 029/031/061/079+).
DROP POLICY IF EXISTS security_events_admin_read ON public.security_events;
CREATE POLICY security_events_admin_read ON public.security_events
  FOR SELECT TO authenticated USING (public.is_admin());

-- Admin can mark events resolved (Week 2+, but wire the policy now).
DROP POLICY IF EXISTS security_events_admin_update ON public.security_events;
CREATE POLICY security_events_admin_update ON public.security_events
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 90-day auto-purge at 3 AM IST (21:30 UTC prior day).
-- Unschedule first to make re-runs idempotent (cron.schedule errors on duplicate name).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-security-events') THEN
    PERFORM cron.unschedule('purge-security-events');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-security-events',
  '30 21 * * *',
  $$ DELETE FROM public.security_events WHERE created_at < NOW() - INTERVAL '90 days'; $$
);
