/**
 * Security event logger — writes to public.security_events (migration 134).
 *
 * Week 1: observe only. No blocking, no rate-limiting, no IP bans here.
 * The middleware + protected API handlers call logSecurityEvent() so that
 * a ledger of "who hit what without credentials" builds up for review.
 *
 * Edge Runtime-safe: uses fetch directly (no Supabase SDK).
 * Never throws — all errors are swallowed to console.
 */

type Severity = 'info' | 'warn' | 'critical'

export type SecurityEventType =
  | 'anon_hit_protected'
  | 'bad_origin'
  | 'honeypot_triggered'
  | 'rate_anomaly'

export interface SecurityEventPayload {
  event_type: SecurityEventType | string
  severity?: Severity
  user_id?: string | null
  ip?: string | null
  path: string
  method: string
  origin?: string | null
  referer?: string | null
  user_agent?: string | null
  country?: string | null
  metadata?: Record<string, unknown> | null
}

// Legitimate origins. Keep loose for Week 1 — tightening comes in Week 2
// based on what actually shows up in bad_origin logs.
export const ORIGIN_ALLOWLIST: readonly string[] = [
  'https://www.edusaathiai.in',
  'https://edusaathiai.in',
  'https://edusaathiai-admin.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
]

// Vercel preview URLs follow *-edusaathiai.vercel.app — allow the family.
const VERCEL_PREVIEW_RE = /^https:\/\/[a-z0-9-]+-edusaathiai\.vercel\.app$/i

export function isAllowedOrigin(origin: string | null | undefined): boolean {
  if (!origin) return true // absent Origin = server-to-server / native app — not suspicious
  if (ORIGIN_ALLOWLIST.includes(origin)) return true
  if (VERCEL_PREVIEW_RE.test(origin)) return true
  return false
}

/** Pull observability fields off request headers. Works for NextRequest + standard Request. */
export function extractRequestContext(headers: Headers, pathname: string, method: string): {
  path: string
  method: string
  ip: string | null
  origin: string | null
  referer: string | null
  user_agent: string | null
  country: string | null
} {
  const fwd = headers.get('x-forwarded-for')
  const ip = fwd ? fwd.split(',')[0].trim() : headers.get('x-real-ip')
  return {
    path: pathname,
    method,
    ip: ip && ip.length > 0 ? ip : null,
    origin: headers.get('origin'),
    referer: headers.get('referer'),
    user_agent: truncate(headers.get('user-agent'), 500),
    country: headers.get('x-vercel-ip-country'),
  }
}

function truncate(s: string | null, max: number): string | null {
  if (!s) return null
  return s.length > max ? s.slice(0, max) : s
}

// Any metadata key containing one of these substrings (case-insensitive) is
// replaced with '[REDACTED]' before storage. Guards against callers
// accidentally passing session cookies, JWTs, OTPs, emails, phone numbers.
const REDACT_KEYS = ['password', 'token', 'key', 'secret', 'email', 'phone'] as const

/** Shallow-redact PII-ish keys from a metadata object. Never throws. */
export function sanitizeMetadata(
  meta: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!meta) return {}
  return Object.fromEntries(
    Object.entries(meta).map(([k, v]) => [
      k,
      REDACT_KEYS.some((r) => k.toLowerCase().includes(r)) ? '[REDACTED]' : v,
    ]),
  )
}

/**
 * Fire-and-forget insert. Callers should pass the returned promise to
 * Next's `after()` in middleware/route handlers, or simply ignore it.
 * Never throws; any error goes to console.
 */
export async function logSecurityEvent(payload: SecurityEventPayload): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    // Missing service role key — log locally so dev noise is visible.
    console.warn('[security] SUPABASE_SERVICE_ROLE_KEY missing; event dropped', payload.event_type)
    return
  }

  try {
    const res = await fetch(`${url}/rest/v1/security_events`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: payload.event_type,
        severity: payload.severity ?? 'info',
        user_id: payload.user_id ?? null,
        ip: payload.ip ?? null,
        path: payload.path,
        method: payload.method,
        origin: payload.origin ?? null,
        referer: payload.referer ?? null,
        user_agent: payload.user_agent ?? null,
        country: payload.country ?? null,
        metadata: payload.metadata ?? null,
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[security] insert failed', res.status, body.slice(0, 200))
    }
  } catch (err) {
    console.error('[security] log threw', err instanceof Error ? err.message : err)
  }

  // Escalate critical events to Sentry. Dynamic import so Sentry stays out of
  // the edge bundle on cold paths. Never throws — Sentry is optional.
  if ((payload.severity ?? 'info') === 'critical') {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.captureMessage(`Security: ${payload.event_type}`, {
        level: 'error',
        extra: {
          ip: payload.ip,
          path: payload.path,
          method: payload.method,
          origin: payload.origin,
          user_id: payload.user_id,
          metadata: payload.metadata,
        },
      })
    } catch (err) {
      console.error('[security] Sentry capture failed', err instanceof Error ? err.message : err)
    }
  }
}
