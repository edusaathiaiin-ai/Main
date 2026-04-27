-- Migration 142: Split TTFB measurement into prep + AI components.
-- Until now `traces.ttfb_ms` measured edge-fn entry → first AI token, which
-- bundled DB prep, network, and provider TTFB into a single number — making
-- the weekly-eval "Groq TTFB" metric impossible to interpret.
--
-- Both columns are nullable so existing rows stay valid and the chat function
-- can backfill at its own pace.

ALTER TABLE public.traces
  ADD COLUMN IF NOT EXISTS prep_ms     INTEGER,
  ADD COLUMN IF NOT EXISTS ai_ttfb_ms  INTEGER;

COMMENT ON COLUMN public.traces.prep_ms    IS 'Edge-fn entry → just before first AI fetch() (auth, DB, system-prompt build).';
COMMENT ON COLUMN public.traces.ai_ttfb_ms IS 'First AI fetch() initiated → first streaming chunk received from successful provider.';
COMMENT ON COLUMN public.traces.ttfb_ms    IS 'Legacy: prep_ms + ai_ttfb_ms. Kept for backwards-compat with pre-142 rows.';
