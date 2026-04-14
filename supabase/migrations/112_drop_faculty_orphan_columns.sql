-- ────────────────────────────────────────────────────────────────────────
-- 112_drop_faculty_orphan_columns.sql
--
-- Drop two orphan columns on faculty_profiles that ended up written by
-- no code path but read by Faculty Finder. New signups were producing
-- empty tiles because writes went to speciality_areas / current_research
-- while reads looked at expertise_tags / research_areas.
--
-- Fix (April 2026): updated all reads in
--   website/src/app/(app)/faculty-finder/page.tsx
--   website/src/app/(app)/faculty-finder/[slug]/page.tsx
--   website/src/app/(app)/saved-faculty/page.tsx
-- to match what FacultyOnboardFlow actually writes. These two columns
-- are now pure dead weight — drop them to stop future confusion.
--
-- Safe to run: zero production data today (faculty_profiles row count = 0).
-- ────────────────────────────────────────────────────────────────────────

ALTER TABLE faculty_profiles
  DROP COLUMN IF EXISTS expertise_tags,
  DROP COLUMN IF EXISTS research_areas;
