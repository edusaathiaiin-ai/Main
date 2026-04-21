-- Migration 127: Add faculty-specific profile fields
-- Teaching style, availability, bio, publications

ALTER TABLE faculty_profiles
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS teaching_style text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS session_format_prefs text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_days text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS available_slots text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS publications text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS why_edusaathiai text;
