-- ════════════════════════════════════════════════════════════════════════════
-- 080: RLS profiles cleanup + remaining policy gaps
--
-- Picks up everything NOT covered by migration 079:
--   1.  profiles      — remove duplicate/conflicting policies, consolidate
--   2.  student_soul  — simpler faculty-read (no dynamic SQL needed here)
--   3.  intern_listings  — faculty read + admin full access
--   4.  intern_matches   — admin + institution access
--   5.  faculty_bookmarks — fix {public} → {authenticated} roles
--   6.  consent_log + dpdp_requests — own-record access for all roles
--   7.  bot_personas  — authenticated read
--   8.  allowed_domains — admin manage + authenticated read
--   9.  nudge_log / auto_nudge_rules — create tables + admin policy
--  10.  moderation_flags — own-read for reporters
--
-- Safe to run in any state: every DROP uses IF EXISTS; CREATE TABLE uses
-- IF NOT EXISTS; table-existence is checked before creating policies that
-- reference tables from other migrations.
-- ════════════════════════════════════════════════════════════════════════════


-- ── FIX 1: profiles — remove duplicate policies, consolidate cleanly ────────

DROP POLICY IF EXISTS profiles_faculty_read      ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own        ON public.profiles;
DROP POLICY IF EXISTS profiles_own_insert        ON public.profiles;
DROP POLICY IF EXISTS profiles_own_select        ON public.profiles;
DROP POLICY IF EXISTS profiles_own_update        ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own        ON public.profiles;
DROP POLICY IF EXISTS profiles_own               ON public.profiles;
DROP POLICY IF EXISTS profiles_admin             ON public.profiles;
DROP POLICY IF EXISTS profiles_faculty_session_read ON public.profiles;
DROP POLICY IF EXISTS profiles_service           ON public.profiles;

-- Own profile: full CRUD
CREATE POLICY profiles_own
ON public.profiles FOR ALL TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin: full access to all profiles
CREATE POLICY profiles_admin
ON public.profiles FOR ALL TO authenticated
USING (public.is_admin());

-- Service role (webhooks, edge functions)
CREATE POLICY profiles_service
ON public.profiles FOR ALL TO service_role
USING (true) WITH CHECK (true);

-- Faculty: read profiles of students connected to them
DROP POLICY IF EXISTS profiles_faculty_session_read ON public.profiles;

CREATE POLICY profiles_faculty_session_read
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.is_admin()
  OR (
    public.is_faculty()
    AND (
      EXISTS (
        SELECT 1 FROM public.faculty_sessions fs
        WHERE fs.faculty_id = auth.uid()
          AND fs.student_id = profiles.id
      )
      OR EXISTS (
        SELECT 1 FROM public.intern_listings il
        WHERE il.institution_user_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.intern_interests ii
            WHERE ii.listing_id = il.id
              AND ii.student_user_id = profiles.id
          )
      )
    )
  )
);


-- ── FIX 2: student_soul — faculty read souls of connected students ───────────

DROP POLICY IF EXISTS soul_faculty_session_read ON public.student_soul;

CREATE POLICY soul_faculty_session_read
ON public.student_soul FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_admin()
  OR (
    public.is_faculty()
    AND (
      EXISTS (
        SELECT 1 FROM public.faculty_sessions fs
        WHERE fs.faculty_id = auth.uid()
          AND fs.student_id = student_soul.user_id
          AND fs.status IN ('accepted','paid','confirmed','completed','reviewed')
      )
      OR EXISTS (
        SELECT 1 FROM public.intern_interests ii
        JOIN public.intern_listings il ON il.id = ii.listing_id
        WHERE il.institution_user_id = auth.uid()
          AND ii.student_user_id = student_soul.user_id
      )
    )
  )
);


-- ── FIX 3: intern_listings — faculty read + admin full access ────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'intern_listings'
  ) THEN
    DROP POLICY IF EXISTS intern_listings_faculty_read ON public.intern_listings;
    DROP POLICY IF EXISTS intern_listings_admin        ON public.intern_listings;

    CREATE POLICY intern_listings_faculty_read
    ON public.intern_listings FOR SELECT TO authenticated
    USING (
      (is_active = true AND public.is_faculty())
      OR public.is_admin()
    );

    CREATE POLICY intern_listings_admin
    ON public.intern_listings FOR ALL TO authenticated
    USING (public.is_admin());
  END IF;
END $$;


-- ── FIX 4: intern_matches — admin + institution access ───────────────────────

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'intern_matches'
  ) THEN
    DROP POLICY IF EXISTS intern_matches_admin       ON public.intern_matches;
    DROP POLICY IF EXISTS intern_matches_institution ON public.intern_matches;

    CREATE POLICY intern_matches_admin
    ON public.intern_matches FOR ALL TO authenticated
    USING (public.is_admin());

    -- Institution can see matches for their own listings
    CREATE POLICY intern_matches_institution
    ON public.intern_matches FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.intern_listings il
        WHERE il.id = intern_matches.listing_id
          AND il.institution_user_id = auth.uid()
      )
    );
  END IF;
END $$;


-- ── FIX 5: faculty_bookmarks — fix {public} → {authenticated} ────────────────

DROP POLICY IF EXISTS students_delete_own_bookmarks ON public.faculty_bookmarks;
DROP POLICY IF EXISTS students_insert_own_bookmarks ON public.faculty_bookmarks;
DROP POLICY IF EXISTS students_select_own_bookmarks ON public.faculty_bookmarks;
DROP POLICY IF EXISTS bookmarks_own                 ON public.faculty_bookmarks;
DROP POLICY IF EXISTS bookmarks_service             ON public.faculty_bookmarks;

CREATE POLICY bookmarks_own
ON public.faculty_bookmarks FOR ALL TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

CREATE POLICY bookmarks_service
ON public.faculty_bookmarks FOR ALL TO service_role
USING (true) WITH CHECK (true);


-- ── FIX 6: consent_log + dpdp_requests — own-record access for all roles ─────

DROP POLICY IF EXISTS consent_log_student_own ON public.consent_log;
DROP POLICY IF EXISTS consent_log_own         ON public.consent_log;

CREATE POLICY consent_log_own
ON public.consent_log FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS dpdp_requests_student_own ON public.dpdp_requests;
DROP POLICY IF EXISTS dpdp_requests_own         ON public.dpdp_requests;

CREATE POLICY dpdp_requests_own
ON public.dpdp_requests FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ── FIX 7: bot_personas — authenticated read ─────────────────────────────────

DROP POLICY IF EXISTS bot_personas_authenticated_read ON public.bot_personas;

CREATE POLICY bot_personas_authenticated_read
ON public.bot_personas FOR SELECT TO authenticated
USING (true);


-- ── FIX 8: allowed_domains — admin manage + authenticated read ───────────────

DROP POLICY IF EXISTS allowed_domains_admin ON public.allowed_domains;
DROP POLICY IF EXISTS allowed_domains_read  ON public.allowed_domains;

CREATE POLICY allowed_domains_admin
ON public.allowed_domains FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY allowed_domains_read
ON public.allowed_domains FOR SELECT TO authenticated
USING (is_active = true);


-- ── FIX 9: nudge_log + auto_nudge_rules — create tables if missing ───────────

CREATE TABLE IF NOT EXISTS public.nudge_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  segment     TEXT NOT NULL,
  reach       INTEGER DEFAULT 0,
  sent_by     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sent_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.nudge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS nudge_log_admin ON public.nudge_log;

CREATE POLICY nudge_log_admin
ON public.nudge_log FOR ALL TO authenticated
USING (public.is_admin());

CREATE TABLE IF NOT EXISTS public.auto_nudge_rules (
  rule_id          TEXT PRIMARY KEY,
  is_active        BOOLEAN DEFAULT true,
  triggered_today  INTEGER DEFAULT 0,
  triggered_total  INTEGER DEFAULT 0,
  last_triggered   TIMESTAMPTZ NULL,
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.auto_nudge_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auto_nudge_rules_admin ON public.auto_nudge_rules;

CREATE POLICY auto_nudge_rules_admin
ON public.auto_nudge_rules FOR ALL TO authenticated
USING (public.is_admin());

-- Seed default rule rows so nudge-centre shows all 5 toggles from day one
INSERT INTO public.auto_nudge_rules (rule_id, is_active) VALUES
  ('inactive_student', true),
  ('trial_expiry',     true),
  ('doc_upload',       true),
  ('intent_expiry',    true),
  ('unanswered_req',   true)
ON CONFLICT (rule_id) DO NOTHING;


-- ── FIX 10: moderation_flags — own read for reporters ────────────────────────

DROP POLICY IF EXISTS moderation_flags_own_read ON public.moderation_flags;

CREATE POLICY moderation_flags_own_read
ON public.moderation_flags FOR SELECT TO authenticated
USING (
  reporter_user_id = auth.uid()
  OR public.is_admin()
);


-- ── VERIFY ───────────────────────────────────────────────────────────────────
-- Run these after applying to confirm:
--
-- SELECT tablename, policyname, cmd, roles
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'profiles','student_soul','intern_listings','intern_matches',
--     'faculty_bookmarks','consent_log','dpdp_requests','bot_personas',
--     'allowed_domains','nudge_log','auto_nudge_rules','moderation_flags'
--   )
-- ORDER BY tablename, policyname;
