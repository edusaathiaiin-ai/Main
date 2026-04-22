-- ═══════════════════════════════════════════════════════════════════════════════
-- 129 — Faculty Solo Tool Dock — artifacts + exports
--
-- Backs the "🧬 BioSaathi's Research Basket" UI (and per-Saathi equivalents).
-- Every time a faculty user runs a free tool (PubMed, RCSB, UniProt, India Code,
-- GeoGebra, PhET, etc.) from the chat-board solo dock, one artifact row is
-- written. Each row is independently exportable (PDF / Email / WhatsApp),
-- with an export receipt stored in faculty_solo_exports.
--
-- Faculty-only surface at launch — student dock is parked for a later phase.
-- All free tools; zero paid API cost. Matches the "additive forever" rule:
-- classroom keeps its full basket, faculty solo is the free subset.
--
-- DPDP: artifacts cascade-delete on profile hard-delete (ON DELETE CASCADE).
-- No PII stored in payload_json by convention — only tool output (paper titles,
-- structure metadata, statute references, public search results).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Artifacts table ──────────────────────────────────────────────────────
-- One row per tool invocation that produced a saveable result. Search-only
-- interactions (typing in the box, browsing results) are NOT written here —
-- only when the faculty lands on a specific result worth keeping.

CREATE TABLE IF NOT EXISTS public.faculty_solo_artifacts (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id    uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  vertical_id        uuid        NOT NULL REFERENCES public.verticals(id),
  saathi_slug        text        NOT NULL,
  tool_id            text        NOT NULL,           -- 'pubmed' | 'rcsb' | 'uniprot' | 'indiacode' | 'sagemathcell' | …
  title              text,                           -- human label for Today's Work rail
  payload_json       jsonb       NOT NULL,           -- raw tool output (citation, PDB metadata, statute excerpt, …)
  source_url         text,                           -- canonical link back to the source
  session_bucket_id  uuid        NOT NULL,           -- groups one work sitting (client-generated, rotates ~2h idle)
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Today's Work rail + recent-artifacts queries
CREATE INDEX IF NOT EXISTS idx_faculty_solo_artifacts_recent
  ON public.faculty_solo_artifacts (faculty_user_id, created_at DESC);

-- Session-bundle export (grab all artifacts in one sitting)
CREATE INDEX IF NOT EXISTS idx_faculty_solo_artifacts_session
  ON public.faculty_solo_artifacts (faculty_user_id, session_bucket_id);

-- Analytics — which tools are loved per Saathi
CREATE INDEX IF NOT EXISTS idx_faculty_solo_artifacts_tool
  ON public.faculty_solo_artifacts (vertical_id, tool_id, created_at DESC);

COMMENT ON TABLE  public.faculty_solo_artifacts IS
  'Per-invocation record of every free-tool result a faculty user saves from their chat-board solo dock. Free-tier basket only — Wolfram, Elsevier, Scopus, Indian Kanoon etc. stay classroom-only.';

COMMENT ON COLUMN public.faculty_solo_artifacts.tool_id IS
  'Tool identifier (matches the dock plugin key). Unconstrained on purpose — adding a new free source is a code change, not a migration.';

COMMENT ON COLUMN public.faculty_solo_artifacts.payload_json IS
  'Tool-shape-specific payload. No PII — only public tool output.';

COMMENT ON COLUMN public.faculty_solo_artifacts.session_bucket_id IS
  'Groups a continuous work sitting. Client rotates when idle >2h. Used for session-scope PDF/Email/WhatsApp bundling.';

ALTER TABLE public.faculty_solo_artifacts ENABLE ROW LEVEL SECURITY;

-- Faculty reads their own rows. Role check defends against a compromised JWT
-- claiming a different role; the struggle-cache migration uses the same shape.
DROP POLICY IF EXISTS faculty_solo_artifacts_own_read ON public.faculty_solo_artifacts;
CREATE POLICY faculty_solo_artifacts_own_read
  ON public.faculty_solo_artifacts
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = faculty_user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'faculty'
    )
  );

-- Writes come from the API route (service role) — never directly from the client.
DROP POLICY IF EXISTS faculty_solo_artifacts_service_all ON public.faculty_solo_artifacts;
CREATE POLICY faculty_solo_artifacts_service_all
  ON public.faculty_solo_artifacts
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 2. Exports receipt table ────────────────────────────────────────────────
-- One row per successful delivery. Powers the "Sent via WhatsApp ✓" checkmarks
-- in the Today's Work rail and the admin audit view.

CREATE TABLE IF NOT EXISTS public.faculty_solo_exports (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_user_id    uuid        NOT NULL REFERENCES public.profiles(id)  ON DELETE CASCADE,
  artifact_id        uuid        REFERENCES public.faculty_solo_artifacts(id) ON DELETE CASCADE,
  session_bucket_id  uuid,
  scope              text        NOT NULL CHECK (scope IN ('artifact', 'session')),
  channel            text        NOT NULL CHECK (channel IN ('pdf', 'email', 'whatsapp')),
  status             text        NOT NULL DEFAULT 'sent'
                                 CHECK (status IN ('sent', 'failed', 'pending')),
  error              text,
  sent_at            timestamptz NOT NULL DEFAULT now(),

  -- scope determines which target column is required
  CONSTRAINT faculty_solo_exports_scope_target_matches CHECK (
    (scope = 'artifact' AND artifact_id IS NOT NULL)
    OR
    (scope = 'session' AND session_bucket_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_faculty_solo_exports_recent
  ON public.faculty_solo_exports (faculty_user_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_faculty_solo_exports_artifact
  ON public.faculty_solo_exports (artifact_id)
  WHERE artifact_id IS NOT NULL;

COMMENT ON TABLE public.faculty_solo_exports IS
  'Delivery receipts for faculty-solo PDF / Email / WhatsApp exports. Both per-artifact and session-bundle scopes share this table.';

COMMENT ON COLUMN public.faculty_solo_exports.status IS
  'sent = delivered, failed = upstream error (Resend/Meta/PDF), pending = WhatsApp template awaiting Meta approval.';

ALTER TABLE public.faculty_solo_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS faculty_solo_exports_own_read ON public.faculty_solo_exports;
CREATE POLICY faculty_solo_exports_own_read
  ON public.faculty_solo_exports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = faculty_user_id
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'faculty'
    )
  );

DROP POLICY IF EXISTS faculty_solo_exports_service_all ON public.faculty_solo_exports;
CREATE POLICY faculty_solo_exports_service_all
  ON public.faculty_solo_exports
  FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ── 3. Grants ───────────────────────────────────────────────────────────────

GRANT SELECT                         ON public.faculty_solo_artifacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_solo_artifacts TO service_role;

GRANT SELECT                         ON public.faculty_solo_exports   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_solo_exports   TO service_role;
