-- Migration 049: Add first_session_welcomed to student_soul
-- Tracks whether the first-session welcome overlay has been shown per soul

ALTER TABLE public.student_soul
  ADD COLUMN IF NOT EXISTS first_session_welcomed BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.student_soul.first_session_welcomed
  IS 'True after the WelcomeOverlay has been dismissed on the student''s first chat session';
