/**
 * resolveVertical.ts
 *
 * Resolves a Saathi slug (e.g. 'kanoonsaathi') to the verticals.id UUID
 * required by all FK-constrained vertical_id columns.
 *
 * Tables with UUID FK on vertical_id (must use this):
 *   board_questions  — verticals.id FK ✅
 *   live_sessions    — verticals.id FK ✅
 *
 * Tables storing slug as plain TEXT (no FK, slug is correct):
 *   learning_intents, research_projects, internship_postings — TEXT, no FK ✅
 *
 * Cache is per-session (module-level Map). Verticals never change at runtime.
 */

import { createClient } from '@/lib/supabase/client';

const cache = new Map<string, string>();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function resolveVerticalId(slugOrId: string): Promise<string | null> {
  if (!slugOrId) return null;

  // Already a UUID — pass through
  if (UUID_RE.test(slugOrId)) return slugOrId;

  // Cache hit
  if (cache.has(slugOrId)) return cache.get(slugOrId)!;

  // Resolve via DB
  const supabase = createClient();
  const { data } = await supabase
    .from('verticals')
    .select('id')
    .eq('slug', slugOrId)
    .single();

  if (data?.id) cache.set(slugOrId, data.id);
  return data?.id ?? null;
}
