-- ════════════════════════════════════════════════════════════════════════════
-- 079: RLS role-aware policy audit fixes
--
-- Problem: Most policies were written for role='student'.
-- Faculty, admin, and institution users get silently blocked on tables
-- they legitimately need access to.
--
-- Safe to run in any DB state: every block checks if the target table
-- exists before attempting to create the policy.
-- ════════════════════════════════════════════════════════════════════════════

-- ── Step 1: Role helper functions ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION public.is_faculty()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'faculty');
$$;

CREATE OR REPLACE FUNCTION public.is_institution()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'institution');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin()       TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_faculty()     TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_institution() TO authenticated;


-- ── Step 2: faculty_profiles — authenticated read ────────────────────────────
-- Students browsing Faculty Finder need SELECT on faculty_profiles.
-- The existing faculty_own policy only lets faculty read their own row.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='faculty_profiles') THEN
    DROP POLICY IF EXISTS faculty_profiles_public_read ON public.faculty_profiles;
    CREATE POLICY faculty_profiles_public_read ON public.faculty_profiles
      FOR SELECT TO authenticated USING (true);

    DROP POLICY IF EXISTS faculty_profiles_admin ON public.faculty_profiles;
    CREATE POLICY faculty_profiles_admin ON public.faculty_profiles
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 3: chat_sessions — faculty access ───────────────────────────────────
-- Bots 1 & 5 are available to faculty. Existing policy requires role='student'.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='chat_sessions') THEN
    DROP POLICY IF EXISTS chat_sessions_faculty_own ON public.chat_sessions;
    CREATE POLICY chat_sessions_faculty_own ON public.chat_sessions
      FOR ALL TO authenticated
      USING (user_id = auth.uid() AND is_faculty())
      WITH CHECK (user_id = auth.uid() AND is_faculty());

    DROP POLICY IF EXISTS chat_sessions_admin ON public.chat_sessions;
    CREATE POLICY chat_sessions_admin ON public.chat_sessions
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 4: chat_messages — faculty access ───────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='chat_messages') THEN
    DROP POLICY IF EXISTS chat_messages_faculty_own ON public.chat_messages;
    CREATE POLICY chat_messages_faculty_own ON public.chat_messages
      FOR ALL TO authenticated
      USING (user_id = auth.uid() AND is_faculty())
      WITH CHECK (user_id = auth.uid() AND is_faculty());

    DROP POLICY IF EXISTS chat_messages_admin ON public.chat_messages;
    CREATE POLICY chat_messages_admin ON public.chat_messages
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 5: notes_saved — faculty access ─────────────────────────────────────
-- Study Notes (bot 1) is available to faculty.

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='notes_saved') THEN
    DROP POLICY IF EXISTS notes_saved_faculty_own ON public.notes_saved;
    CREATE POLICY notes_saved_faculty_own ON public.notes_saved
      FOR ALL TO authenticated
      USING (user_id = auth.uid() AND is_faculty())
      WITH CHECK (user_id = auth.uid() AND is_faculty());
  END IF;
END $$;


-- ── Step 6: student_soul — faculty read for connected students ────────────────
-- Build the USING clause dynamically based on which tables actually exist,
-- since faculty_sessions / live_bookings / intern_applications may not yet
-- be on this DB instance.

DO $$ DECLARE
  using_clause TEXT := 'user_id = auth.uid() OR is_admin()';
BEGIN
  DROP POLICY IF EXISTS soul_faculty_session_read ON public.student_soul;

  -- Extend clause only if the referenced tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='faculty_sessions') THEN
    using_clause := using_clause || '
    OR EXISTS (
      SELECT 1 FROM public.faculty_sessions fs
      WHERE fs.faculty_id = auth.uid()
        AND fs.student_id = student_soul.user_id
        AND fs.status IN (''accepted'',''paid'',''confirmed'',''completed'')
    )';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='live_bookings')
  AND EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='live_sessions') THEN
    using_clause := using_clause || '
    OR EXISTS (
      SELECT 1 FROM public.live_bookings lb
      JOIN public.live_sessions ls ON ls.id = lb.session_id
      WHERE ls.faculty_id = auth.uid()
        AND lb.student_id = student_soul.user_id
        AND lb.payment_status = ''paid''
    )';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='intern_applications')
  AND EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='internship_postings') THEN
    using_clause := using_clause || '
    OR EXISTS (
      SELECT 1 FROM public.intern_applications ia
      JOIN public.internship_postings ip ON ip.id = ia.posting_id
      WHERE ip.posted_by = auth.uid()
        AND ia.student_id = student_soul.user_id
    )';
  END IF;

  EXECUTE format(
    'CREATE POLICY soul_faculty_session_read ON public.student_soul
     FOR SELECT TO authenticated USING (%s)',
    using_clause
  );
END $$;


-- ── Step 7: faculty_sessions — admin full access ─────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='faculty_sessions') THEN
    DROP POLICY IF EXISTS faculty_sessions_admin ON public.faculty_sessions;
    CREATE POLICY faculty_sessions_admin ON public.faculty_sessions
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 8: faculty_payouts — admin full access ──────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='faculty_payouts') THEN
    DROP POLICY IF EXISTS faculty_payouts_admin ON public.faculty_payouts;
    CREATE POLICY faculty_payouts_admin ON public.faculty_payouts
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 9: session_reviews — admin full access ──────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='session_reviews') THEN
    DROP POLICY IF EXISTS reviews_admin ON public.session_reviews;
    CREATE POLICY reviews_admin ON public.session_reviews
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 10: session_messages — admin full access ────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='session_messages') THEN
    DROP POLICY IF EXISTS messages_admin ON public.session_messages;
    CREATE POLICY messages_admin ON public.session_messages
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 11: live_sessions — admin full access ───────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='live_sessions') THEN
    DROP POLICY IF EXISTS live_sessions_admin ON public.live_sessions;
    CREATE POLICY live_sessions_admin ON public.live_sessions
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 12: live_lectures — admin full access ───────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='live_lectures') THEN
    DROP POLICY IF EXISTS live_lectures_admin ON public.live_lectures;
    CREATE POLICY live_lectures_admin ON public.live_lectures
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 13: live_bookings — admin full access ───────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='live_bookings') THEN
    DROP POLICY IF EXISTS live_bookings_admin ON public.live_bookings;
    CREATE POLICY live_bookings_admin ON public.live_bookings
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 14: live_wishlist — admin full access ───────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='live_wishlist') THEN
    DROP POLICY IF EXISTS live_wishlist_admin ON public.live_wishlist;
    CREATE POLICY live_wishlist_admin ON public.live_wishlist
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 15: internship_postings — admin full access ─────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='internship_postings') THEN
    DROP POLICY IF EXISTS postings_admin ON public.internship_postings;
    CREATE POLICY postings_admin ON public.internship_postings
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 16: intern_applications — admin full access ─────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='intern_applications') THEN
    DROP POLICY IF EXISTS apps_admin ON public.intern_applications;
    CREATE POLICY apps_admin ON public.intern_applications
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 17: moderation_flags — admin + faculty INSERT ───────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='moderation_flags') THEN
    DROP POLICY IF EXISTS moderation_flags_admin ON public.moderation_flags;
    CREATE POLICY moderation_flags_admin ON public.moderation_flags
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());

    DROP POLICY IF EXISTS moderation_flags_faculty_insert ON public.moderation_flags;
    CREATE POLICY moderation_flags_faculty_insert ON public.moderation_flags
      FOR INSERT TO authenticated
      WITH CHECK (
        is_faculty()
        AND (reporter_user_id = auth.uid() OR reported_by = auth.uid())
      );
  END IF;
END $$;


-- ── Step 18: notifications — admin SELECT ────────────────────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='notifications') THEN
    DROP POLICY IF EXISTS notifications_admin ON public.notifications;
    CREATE POLICY notifications_admin ON public.notifications
      FOR SELECT TO authenticated USING (is_admin());
  END IF;
END $$;


-- ── Step 19: learning_intents / intent_joiners — admin full access ────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='learning_intents') THEN
    DROP POLICY IF EXISTS intents_admin ON public.learning_intents;
    CREATE POLICY intents_admin ON public.learning_intents
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='intent_joiners') THEN
    DROP POLICY IF EXISTS joiners_admin ON public.intent_joiners;
    CREATE POLICY joiners_admin ON public.intent_joiners
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 20: board_questions / board_answers — admin full access ─────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='board_questions') THEN
    DROP POLICY IF EXISTS board_questions_admin ON public.board_questions;
    CREATE POLICY board_questions_admin ON public.board_questions
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='board_answers') THEN
    DROP POLICY IF EXISTS board_answers_admin ON public.board_answers;
    CREATE POLICY board_answers_admin ON public.board_answers
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;


-- ── Step 21: dpdp_requests / consent_log — admin access ──────────────────────

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='dpdp_requests') THEN
    DROP POLICY IF EXISTS dpdp_requests_admin ON public.dpdp_requests;
    CREATE POLICY dpdp_requests_admin ON public.dpdp_requests
      FOR ALL TO authenticated
      USING (is_admin()) WITH CHECK (is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='consent_log') THEN
    DROP POLICY IF EXISTS consent_log_admin ON public.consent_log;
    CREATE POLICY consent_log_admin ON public.consent_log
      FOR SELECT TO authenticated USING (is_admin());
  END IF;
END $$;


-- ── Verification ─────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd
-- FROM pg_policies WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
