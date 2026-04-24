// ─────────────────────────────────────────────────────────────────────────────
// slugify.ts — URL-safe slug generation for education institutions.
//
// Lowercase → replace whitespace/underscores/dots with hyphens → strip any
// non [a-z0-9-] → collapse repeat hyphens → trim leading/trailing hyphens →
// truncate to a sane length. Then ensureUniqueEducationInstitutionSlug()
// tacks on -2, -3, … until the DB rejects a collision, matching how
// institution URLs will read in public marketing.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

const MAX_SLUG_LEN = 60

export function slugify(input: string): string {
  return input
    .normalize('NFKD')                 // split accents
    .replace(/[\u0300-\u036f]/g, '')   // strip combining marks
    .toLowerCase()
    .replace(/[\s_.]+/g, '-')          // whitespace / underscore / dot → hyphen
    .replace(/[^a-z0-9-]+/g, '')       // drop anything not [a-z0-9-]
    .replace(/-+/g, '-')               // collapse repeated hyphens
    .replace(/^-+|-+$/g, '')           // trim leading / trailing hyphens
    .slice(0, MAX_SLUG_LEN) || 'education-institution'
}

/**
 * Ensure the slug is unique in `education_institutions.slug`. On collision,
 * append -2, -3, ... until the first free suffix is found. Caller passes a
 * service-role client so the check runs regardless of RLS.
 */
export async function ensureUniqueEducationInstitutionSlug(
  supabase: SupabaseClient,
  base: string,
): Promise<string> {
  const root = slugify(base)
  let candidate = root
  let attempt = 1
  // Defensive ceiling — 50 attempts would mean we've collided 50 times on the
  // same base name, which is practically impossible and means something upstream
  // has gone wrong (spamming duplicate submissions?).
  while (attempt < 50) {
    const { data, error } = await supabase
      .from('education_institutions')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle()
    if (error) throw new Error(`slug-uniqueness-check-failed: ${error.message}`)
    if (!data) return candidate
    attempt += 1
    candidate = `${root}-${attempt}`.slice(0, MAX_SLUG_LEN)
  }
  throw new Error('slug-uniqueness-exhausted')
}
