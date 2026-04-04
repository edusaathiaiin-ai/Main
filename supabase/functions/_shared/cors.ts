/**
 * _shared/cors.ts
 *
 * Origin-locked CORS headers for all browser-facing Edge Functions.
 *
 * Why not '*':
 *   Wildcard CORS lets any site trigger credentialed requests to your API.
 *   By echoing back only known origins the browser enforces the restriction —
 *   requests from unknown domains receive a CORS error before any data lands.
 *
 * How it works:
 *   If the request Origin is in the allowlist, echo it back exactly.
 *   Otherwise, fall back to the primary production domain.
 *   The browser will block the response for any origin that doesn't match.
 *   'Vary: Origin' tells CDNs/proxies not to cache the header across origins.
 *
 * Server-to-server calls (webhooks, crons) are unaffected — they don't
 * enforce CORS, so this header is simply ignored by those callers.
 */

const ALLOWED_ORIGINS = new Set([
  'https://www.edusaathiai.in',
  'https://edusaathiai.in',
  'http://localhost:3000',
  'http://localhost:3001',
]);

const PRIMARY_ORIGIN = 'https://www.edusaathiai.in';

/**
 * Returns CORS headers with the correct Allow-Origin for this request.
 * Drop this into every browser-facing Edge Function handler.
 */
export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : PRIMARY_ORIGIN;
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin',
  };
}
