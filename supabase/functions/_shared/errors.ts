/**
 * Safe error message for client responses.
 * In development, returns the actual error message for debugging.
 * In production, returns the fallback message to avoid leaking internals.
 */
export function safeError(err: unknown, fallback: string): string {
  if (Deno.env.get('APP_ENV') === 'development') {
    return err instanceof Error ? err.message : fallback;
  }
  return fallback;
}
