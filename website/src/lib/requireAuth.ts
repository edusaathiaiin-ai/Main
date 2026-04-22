/**
 * requireAuth — standardized auth gate for protected API route handlers.
 *
 * Handles the gap that middleware alone cannot cover: routes inside
 * PUBLIC_PATHS (e.g. /api/classroom/*) that are publicly routed at the
 * middleware layer but internally require a signed-in user.
 *
 * Usage:
 *   export async function POST(req: NextRequest) {
 *     const auth = await requireAuth(req)
 *     if (auth instanceof NextResponse) return auth
 *     const { user, supabase } = auth
 *     // ... proceed with authenticated logic
 *   }
 *
 * On auth failure:
 *   - Writes a security_events row tagged metadata.route = 'handler-level'
 *     (distinguishes from middleware-caught events).
 *   - Returns a standard 401 JSON response.
 */

import { after, type NextRequest, NextResponse } from 'next/server'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import {
  extractRequestContext,
  logSecurityEvent,
  sanitizeMetadata,
} from '@/lib/security'

export interface AuthorizedRequest {
  user: User
  supabase: SupabaseClient
}

export async function requireAuth(
  req: NextRequest,
): Promise<AuthorizedRequest | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    const url = new URL(req.url)
    const ctx = extractRequestContext(req.headers, url.pathname, req.method)
    after(
      logSecurityEvent({
        event_type: 'anon_hit_protected',
        severity: 'warn',
        ...ctx,
        metadata: sanitizeMetadata({
          auth_error: error?.message ?? 'no_session',
          route: 'handler-level',
          path: url.pathname,
        }),
      }),
    )
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { user, supabase }
}
