/*
  Migration: 052_news_professor_note
  Purpose: Add professor_note and domain_verified columns to news_items.
           professor_note: 2-sentence Groq-generated explanation per article.
           domain_verified: confirms article URL belongs to a trusted source domain.
*/

ALTER TABLE public.news_items
  ADD COLUMN IF NOT EXISTS professor_note   TEXT NULL,
  ADD COLUMN IF NOT EXISTS domain_verified  BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.news_items.professor_note IS
  '2-sentence professor explanation: what happened + why it matters for student career.';

COMMENT ON COLUMN public.news_items.domain_verified IS
  'True if article URL domain matches the hard-coded trusted domain list for this Saathi.';
