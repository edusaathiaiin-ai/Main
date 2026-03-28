/**
 * supabase/functions/_shared/sentry.ts
 *
 * Lightweight Sentry reporter for Deno edge functions.
 * Uses Sentry's HTTP store API — no SDK dependency needed.
 *
 * Usage:
 *   import { captureError, captureEvent } from '../_shared/sentry.ts';
 *   captureError(err, { tags: { function: 'chat' }, extra: { userId } });
 */

const SENTRY_DSN = Deno.env.get('SENTRY_DSN') ?? '';

/** Parse DSN into store URL + auth header. Returns null if DSN is missing. */
function parseDsn(dsn: string): { storeUrl: string; authHeader: string } | null {
  try {
    const url = new URL(dsn);
    const key     = url.username;
    const host    = url.hostname;
    const project = url.pathname.replace('/', '');
    return {
      storeUrl:   `https://${host}/api/${project}/store/`,
      authHeader: `Sentry sentry_key=${key},sentry_version=7,sentry_client=edusaathiai-edge/1.0`,
    };
  } catch {
    return null;
  }
}

type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

type SentryContext = {
  level?: SentryLevel;
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  fingerprint?: string[];
};

/** Fire-and-forget — never throws, never blocks the response. */
async function send(payload: Record<string, unknown>): Promise<void> {
  const parsed = parseDsn(SENTRY_DSN);
  if (!parsed) return; // DSN not configured — skip silently

  try {
    await fetch(parsed.storeUrl, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': parsed.authHeader,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Never let Sentry reporting crash the function
  }
}

function basePayload(level: SentryLevel, ctx: SentryContext) {
  return {
    event_id:  crypto.randomUUID().replace(/-/g, ''),
    timestamp: new Date().toISOString(),
    platform:  'javascript',
    runtime:   { name: 'deno', version: Deno.version.deno },
    level,
    tags:      { environment: Deno.env.get('APP_ENV') ?? 'production', ...ctx.tags },
    extra:     ctx.extra ?? {},
    fingerprint: ctx.fingerprint,
  };
}

/** Capture an Error object — shows full stack trace in Sentry. */
export function captureError(err: unknown, ctx: SentryContext = {}): void {
  const level = ctx.level ?? 'error';
  const message = err instanceof Error ? err.message : String(err);
  const stack   = err instanceof Error ? (err.stack ?? '') : '';

  void send({
    ...basePayload(level, ctx),
    exception: {
      values: [{
        type:       err instanceof Error ? err.constructor.name : 'Error',
        value:      message,
        stacktrace: {
          frames: stack.split('\n').slice(1).map(line => ({ filename: line.trim() })),
        },
      }],
    },
  });
}

/** Capture a named event (no stack trace) — for business events like payment failures. */
export function captureEvent(message: string, ctx: SentryContext = {}): void {
  const level = ctx.level ?? 'info';

  void send({
    ...basePayload(level, ctx),
    message,
  });
}
