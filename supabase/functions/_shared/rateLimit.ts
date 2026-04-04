/**
 * _shared/rateLimit.ts
 *
 * Lightweight Upstash Redis rate limiter for Supabase Edge Functions.
 * Uses INCR + EXPIRE pattern — no Upstash SDK needed (plain fetch).
 *
 * Usage:
 *   const ok = await checkRateLimit('board-answer', userId, 10, 60);
 *   if (!ok) return new Response('Too many requests', { status: 429 });
 *
 * Fails open when Upstash is not configured — never blocks legitimate traffic
 * due to missing env vars.
 */

const UPSTASH_URL   = Deno.env.get('UPSTASH_REDIS_REST_URL')   ?? '';
const UPSTASH_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN') ?? '';

/**
 * Check and increment rate limit counter.
 *
 * @param namespace  - function name or prefix, e.g. 'board-answer'
 * @param identifier - user ID or IP address
 * @param maxRequests - max allowed in the window
 * @param windowSeconds - rolling window size in seconds
 * @returns true if request is allowed, false if rate limited
 */
export async function checkRateLimit(
  namespace: string,
  identifier: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return true; // fail open

  const key = `rl:${namespace}:${identifier}`;

  try {
    const incrRes = await fetch(`${UPSTASH_URL}/incr/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    });

    if (!incrRes.ok) return true;

    const { result } = await incrRes.json() as { result?: number };
    const count = Number(result ?? 0);

    // Set TTL only on first request in window
    if (count === 1) {
      fetch(`${UPSTASH_URL}/expire/${encodeURIComponent(key)}/${windowSeconds}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      }).catch(() => {});
    }

    return count <= maxRequests;
  } catch {
    return true; // fail open
  }
}

/** Pre-built 429 response with CORS headers. */
export function rateLimitResponse(corsHeaders: Record<string, string> = {}): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': '60',
        ...corsHeaders,
      },
    },
  );
}
