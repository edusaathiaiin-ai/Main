/**
 * ╔══════════════════════════════════════════╗
 * ║     EdUsaathiAI — Vertical ID Rules      ║
 * ╠══════════════════════════════════════════╣
 * ║                                          ║
 * ║  The verticals table stores Saathis.     ║
 * ║  Every Saathi has:                       ║
 * ║    id   — UUID (primary key)             ║
 * ║    slug — text e.g. "kanoonsaathi"       ║
 * ║                                          ║
 * ║  RULE: Any column named vertical_id      ║
 * ║  in ANY table is a FK to verticals(id).  ║
 * ║  It MUST store a UUID. Never a slug.     ║
 * ║                                          ║
 * ╠══════════════════════════════════════════╣
 * ║  TABLES WITH vertical_id FK (UUID):      ║
 * ║                                          ║
 * ║  Core:                                   ║
 * ║    student_soul          vertical_id     ║
 * ║    bot_personas          vertical_id     ║
 * ║    news_items            vertical_id     ║
 * ║    subject_chips         vertical_id*    ║
 * ║                                          ║
 * ║  Community:                              ║
 * ║    board_questions       vertical_id     ║
 * ║    board_answers         vertical_id     ║
 * ║                                          ║
 * ║  Marketplace:                            ║
 * ║    faculty_sessions      vertical_id     ║
 * ║    live_sessions         vertical_id     ║
 * ║    live_bookings         vertical_id*    ║
 * ║    live_lectures         vertical_id*    ║
 * ║    lecture_requests      vertical_id     ║
 * ║    learning_intents      vertical_id     ║
 * ║    internship_postings   vertical_id     ║
 * ║                                          ║
 * ║  Analytics:                              ║
 * ║    daily_challenges      vertical_id     ║
 * ║    saathi_stats_cache    vertical_id     ║
 * ║    explore_resources     vertical_id     ║
 * ║    whatsapp_sessions     vertical_id*    ║
 * ║                                          ║
 * ║  (* = indirect, via session join)        ║
 * ║                                          ║
 * ╠══════════════════════════════════════════╣
 * ║  TABLES THAT STORE SLUG AS TEXT:         ║
 * ║  (these are lookup/config tables only)   ║
 * ║                                          ║
 * ║    profiles.primary_saathi_id            ║
 * ║      ↑ WRONG — should be UUID           ║
 * ║      fixed in onboarding migration       ║
 * ║                                          ║
 * ║    profiles.wa_saathi_id                 ║
 * ║      ↑ UUID FK — use resolveVerticalId   ║
 * ║                                          ║
 * ╠══════════════════════════════════════════╣
 * ║  WHEN TO USE resolveVerticalId():        ║
 * ║                                          ║
 * ║  Call it when vertical_id value comes    ║
 * ║  from ANY of these sources:              ║
 * ║    • URL params  (/board/kanoonsaathi)   ║
 * ║    • User selection (Saathi picker)      ║
 * ║    • Profile state (may be stale slug)   ║
 * ║    • WhatsApp payload (slug-based)       ║
 * ║    • SAATHIS constant .slug field        ║
 * ║                                          ║
 * ║  Skip it when value comes from:          ║
 * ║    • DB query result .vertical_id col    ║
 * ║    • SAATHIS constant .id field          ║
 * ║    • Another table's vertical_id FK      ║
 * ║                                          ║
 * ╠══════════════════════════════════════════╣
 * ║  CHECKLIST FOR NEW MIGRATIONS:           ║
 * ║                                          ║
 * ║  Adding a new table with vertical_id?    ║
 * ║  □ Add FK: REFERENCES verticals(id)      ║
 * ║  □ Add to the list above                 ║
 * ║  □ Use resolveVerticalId() in all        ║
 * ║    insert/update handlers for that table ║
 * ║  □ Add index: CREATE INDEX ON            ║
 * ║      new_table(vertical_id)              ║
 * ║                                          ║
 * ╚══════════════════════════════════════════╝
 */

import { SupabaseClient } from '@supabase/supabase-js';

// In-memory cache so we don't hit DB
// repeatedly for the same slug
const slugCache = new Map<string, string>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a Saathi slug OR UUID to a
 * confirmed vertical UUID.
 *
 * Safe to call with either format —
 * returns the UUID either way.
 *
 * Returns null if not found.
 * Always check for null before inserting.
 *
 * @example
 * // From URL param (slug)
 * const id = await resolveVerticalId(
 *   'kanoonsaathi', supabase
 * )
 *
 * // From profile state (may be slug or UUID)
 * const id = await resolveVerticalId(
 *   profile.primary_saathi_id, supabase
 * )
 *
 * // Already a UUID — returns immediately
 * const id = await resolveVerticalId(
 *   '2b3d9904-71d9-4275-...', supabase
 * )
 */
export async function resolveVerticalId(
  slugOrId: string | null | undefined,
  supabase: SupabaseClient,
): Promise<string | null> {

  if (!slugOrId) return null;

  // Already a UUID — return immediately
  if (UUID_REGEX.test(slugOrId)) {
    return slugOrId;
  }

  // Check in-memory cache first
  if (slugCache.has(slugOrId)) {
    return slugCache.get(slugOrId)!;
  }

  // Resolve slug → UUID from DB
  const { data, error } = await supabase
    .from('verticals')
    .select('id')
    .eq('slug', slugOrId)
    .single();

  if (error || !data) {
    console.error(
      `[resolveVerticalId] Could not resolve slug: "${slugOrId}"`,
      error?.message,
    );
    return null;
  }

  // Cache for this session
  slugCache.set(slugOrId, data.id);
  return data.id;
}

/**
 * Same as resolveVerticalId but throws
 * instead of returning null.
 * Use when vertical MUST exist.
 */
export async function requireVerticalId(
  slugOrId: string | null | undefined,
  supabase: SupabaseClient,
): Promise<string> {
  const id = await resolveVerticalId(slugOrId, supabase);
  if (!id) {
    throw new Error(
      `[requireVerticalId] Could not resolve: "${slugOrId}". ` +
      `Check that this Saathi slug exists in verticals table.`,
    );
  }
  return id;
}

/**
 * Resolve multiple slugs in one DB call.
 * Use when inserting many rows at once.
 */
export async function resolveVerticalIds(
  slugsOrIds: string[],
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  const toResolve: string[] = [];

  for (const s of slugsOrIds) {
    if (!s) continue;
    if (UUID_REGEX.test(s)) {
      result.set(s, s);
    } else if (slugCache.has(s)) {
      result.set(s, slugCache.get(s)!);
    } else {
      toResolve.push(s);
    }
  }

  if (toResolve.length > 0) {
    const { data } = await supabase
      .from('verticals')
      .select('id, slug')
      .in('slug', toResolve);

    data?.forEach((row: { id: string; slug: string }) => {
      result.set(row.slug, row.id);
      slugCache.set(row.slug, row.id);
    });
  }

  return result;
}
