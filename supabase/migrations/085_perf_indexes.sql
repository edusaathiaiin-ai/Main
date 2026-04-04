-- 085_perf_indexes.sql
--
-- Composite indexes for the most common query patterns.
-- Covers: quota lookups, soul reads, news feeds, board, sessions, bookings.

-- chat_sessions — quota row lookup (called on every chat message)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_quota
  ON public.chat_sessions (user_id, vertical_id, bot_slot, quota_date_ist);

-- student_soul — soul read by user+vertical (called on every chat session)
CREATE INDEX IF NOT EXISTS idx_student_soul_user_vertical
  ON public.student_soul (user_id, vertical_id);

-- news_items — news feed by vertical + active + recency
CREATE INDEX IF NOT EXISTS idx_news_items_feed
  ON public.news_items (vertical_id, is_active, fetched_at DESC);

-- board_questions — board by vertical + status
CREATE INDEX IF NOT EXISTS idx_board_questions_vertical_status
  ON public.board_questions (vertical_id, status, created_at DESC);

-- board_answers — answers by question
CREATE INDEX IF NOT EXISTS idx_board_answers_question
  ON public.board_answers (question_id, created_at DESC);

-- faculty_sessions — student's sessions list
CREATE INDEX IF NOT EXISTS idx_faculty_sessions_student
  ON public.faculty_sessions (student_id, status, created_at DESC);

-- faculty_sessions — faculty's sessions list
CREATE INDEX IF NOT EXISTS idx_faculty_sessions_faculty
  ON public.faculty_sessions (faculty_id, status, created_at DESC);

-- live_bookings — student's bookings
CREATE INDEX IF NOT EXISTS idx_live_bookings_student_session
  ON public.live_bookings (student_id, session_id);

-- moderation_flags — violation count query (user + type + recency)
CREATE INDEX IF NOT EXISTS idx_moderation_flags_user_type_time
  ON public.moderation_flags (reporter_user_id, violation_type, created_at DESC);

-- profiles — active students with primary_saathi_id (notify-live-published query)
CREATE INDEX IF NOT EXISTS idx_profiles_saathi_active
  ON public.profiles (primary_saathi_id, role, is_active)
  WHERE is_active = true;
