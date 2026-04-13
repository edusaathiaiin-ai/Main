/**
 * PostHog capture helper for Supabase Edge Functions (Deno).
 *
 * Uses the public Capture API directly (HTTP POST) — no SDK needed. The project
 * API key is safe to embed server-side; it only allows /capture, not reads.
 *
 * Usage:
 *   import { posthogCapture } from '../_shared/posthog.ts'
 *   await posthogCapture(userId, 'payment_succeeded', { plan_id, amount_paise })
 *
 * Fire-and-forget: never throws, never blocks. If PostHog is down or the key is
 * missing, the call silently no-ops. Server events are never the critical path.
 *
 * Privacy rules (CLAUDE.md §25):
 * - distinctId = Supabase auth.users.id (UUID, not PII)
 * - Never send chat message content — only message_len / token counts
 * - Never send email, phone, or full_name
 */

const POSTHOG_KEY  = Deno.env.get('POSTHOG_API_KEY')  ?? Deno.env.get('NEXT_PUBLIC_POSTHOG_KEY') ?? ''
const POSTHOG_HOST = Deno.env.get('POSTHOG_HOST')     ?? 'https://us.i.posthog.com'

export async function posthogCapture(
  distinctId: string,
  event: string,
  properties: Record<string, unknown> = {},
): Promise<void> {
  if (!POSTHOG_KEY || !distinctId) return

  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:     POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties:  { ...properties, $lib: 'edge-function' },
        timestamp:   new Date().toISOString(),
      }),
    })
  } catch {
    // Silently swallow — analytics must never break the edge function.
  }
}

/**
 * Update PostHog user properties without firing a user-facing event.
 * Uses the `$set` event which PostHog interprets as a person property update.
 */
export async function posthogSetPersonProps(
  distinctId: string,
  properties: Record<string, unknown>,
): Promise<void> {
  if (!POSTHOG_KEY || !distinctId) return
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:     POSTHOG_KEY,
        event:       '$set',
        distinct_id: distinctId,
        properties:  { $set: properties, $lib: 'edge-function' },
        timestamp:   new Date().toISOString(),
      }),
    })
  } catch {
    // Silently swallow.
  }
}
