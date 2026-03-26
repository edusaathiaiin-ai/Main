-- Migration 053: Add thesis_area column to profiles
-- Missing column causes handleProfile UPDATE to fail silently,
-- keeping is_active = false and creating an onboarding loop.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS thesis_area TEXT NULL;
