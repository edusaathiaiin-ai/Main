// ─────────────────────────────────────────────────────────────────────────────
// ratelimit.ts — lightweight Upstash Redis rate limiter for Next.js API routes.
//
// Twin of supabase/functions/_shared/rateLimit.ts (Deno-side). Uses the same
// INCR + EXPIRE pattern via plain fetch — no SDK required. Fails open when
// Upstash env vars are missing so local dev never blocks.
//
// Usage:
//   import { checkRateLimit, rateLimitResponse, clientIp } from '@/lib/ratelimit'
//   const ok = await checkRateLimit('institutions-search', clientIp(req), 30, 60)
//   if (!ok) return rateLimitResponse()
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'

const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL   ?? ''
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? ''

/**
 * Increment a rolling-window counter and compare against the cap.
 *
 * @param namespace     e.g. 'institutions-search'
 * @param identifier    user_id or client IP
 * @param maxRequests   allowed requests within the window
 * @param windowSeconds window size in seconds
 * @returns true = allowed, false = rate-limited
 */
export async function checkRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return true // fail open

  const key = `rl:${namespace}:${identifier}`
  try {
    const incr = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      cache:   'no-store',
    })
    if (!incr.ok) return true
    const { result } = await incr.json() as { result?: number }
    const count = Number(result ?? 0)

    // Set TTL on first request in window. Fire-and-forget — no need to await.
    if (count === 1) {
      void fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      }).catch(() => undefined)
    }

    return count <= maxRequests
  } catch {
    return true // fail open on any transport error
  }
}

/** Pre-built 429 response. */
export function rateLimitResponse(): NextResponse {
  return NextResponse.json(
    { error: 'Too many requests. Please slow down.' },
    { status: 429, headers: { 'Retry-After': '60' } },
  )
}

/**
 * Best-effort client IP. Vercel / most proxies set `x-forwarded-for` as a
 * comma-separated chain; the leftmost entry is the original client.
 */
export function clientIp(req: NextRequest | Request): string {
  const header =
    (req as NextRequest).headers?.get?.('x-forwarded-for') ??
    (req as Request).headers?.get?.('x-forwarded-for') ??
    ''
  const first = header.split(',')[0]?.trim()
  if (first) return first
  // Fallback — Vercel sets x-real-ip too
  const real =
    (req as NextRequest).headers?.get?.('x-real-ip') ??
    (req as Request).headers?.get?.('x-real-ip') ??
    ''
  return real || 'unknown'
}
