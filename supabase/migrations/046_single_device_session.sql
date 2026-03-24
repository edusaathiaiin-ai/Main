-- Migration 046: Single-device session enforcement columns
-- Adds tracking fields to profiles table for session management

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_session_id   TEXT NULL,
  ADD COLUMN IF NOT EXISTS active_device_info  JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_login_at        TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS session_count_today  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_date_ist     TEXT NULL,
  ADD COLUMN IF NOT EXISTS forced_logout_count  INTEGER DEFAULT 0;

-- Verify
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN (
    'active_session_id', 'active_device_info',
    'last_login_at', 'session_count_today',
    'session_date_ist', 'forced_logout_count'
  )
ORDER BY column_name;
