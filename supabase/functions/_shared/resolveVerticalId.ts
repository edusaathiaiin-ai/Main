/**
 * supabase/functions/_shared/resolveVerticalId.ts
 *
 * Deno version of the canonical vertical ID resolver.
 * See website/src/lib/resolveVerticalId.ts for full documentation.
 *
 * Usage in edge functions:
 *   import { resolveVerticalId } from '../_shared/resolveVerticalId.ts'
 *   const verticalId = await resolveVerticalId(slug, adminClient)
 */

// deno-lint-ignore no-explicit-any
type SupabaseAdminClient = any;

const slugCache = new Map<string, string>();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a Saathi slug OR UUID to a confirmed vertical UUID.
 * Returns null if not found — always check before inserting.
 */
export async function resolveVerticalId(
  slugOrId: string | null | undefined,
  admin: SupabaseAdminClient,
): Promise<string | null> {
  if (!slugOrId) return null;
  if (UUID_REGEX.test(slugOrId)) return slugOrId;
  if (slugCache.has(slugOrId)) return slugCache.get(slugOrId)!;

  const { data, error } = await admin
    .from('verticals')
    .select('id')
    .eq('slug', slugOrId)
    .single();

  if (error || !data) {
    console.error(
      `[resolveVerticalId] Cannot resolve: "${slugOrId}"`,
      error?.message,
    );
    return null;
  }

  slugCache.set(slugOrId, data.id);
  return data.id;
}

/**
 * Same as resolveVerticalId but throws instead of returning null.
 * Use when the vertical MUST exist for the operation to proceed.
 */
export async function requireVerticalId(
  slugOrId: string | null | undefined,
  admin: SupabaseAdminClient,
): Promise<string> {
  const id = await resolveVerticalId(slugOrId, admin);
  if (!id) {
    throw new Error(
      `[requireVerticalId] Cannot resolve vertical: "${slugOrId}". ` +
      `Check that this slug exists in the verticals table.`,
    );
  }
  return id;
}
