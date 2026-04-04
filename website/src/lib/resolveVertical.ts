/**
 * @deprecated
 *
 * Compatibility shim — preserves the original one-arg call signature
 * for existing callers (QuestionFeed, faculty/live/create).
 *
 * New code should import from '@/lib/resolveVerticalId' and pass
 * the supabase client explicitly:
 *
 *   import { resolveVerticalId } from '@/lib/resolveVerticalId'
 *   const id = await resolveVerticalId(slug, supabase)
 */

import { createClient } from '@/lib/supabase/client'
import { resolveVerticalId as _resolve } from '@/lib/resolveVerticalId'

/** One-arg shim — creates its own supabase client internally. */
export async function resolveVerticalId(
  slugOrId: string | null | undefined
): Promise<string | null> {
  const supabase = createClient()
  return _resolve(slugOrId, supabase)
}
