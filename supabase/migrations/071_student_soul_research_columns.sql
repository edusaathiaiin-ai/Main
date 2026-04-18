-- Migration 071: add research tracking columns to student_soul
-- Used by soul engine to carry research context into next chat session.

ALTER TABLE student_soul
  ADD COLUMN IF NOT EXISTS last_research_summary  text,
  ADD COLUMN IF NOT EXISTS research_depth_score   int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_archive_context   text;
  -- last_archive_context is injected into system prompt
  -- for the NEXT chat session with this Saathi
  -- max 400 chars — trim if longer
