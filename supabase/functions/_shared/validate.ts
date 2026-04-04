/**
 * _shared/validate.ts
 *
 * Server-side validation helpers for Edge Functions.
 * Frontend validation is UI polish — this is the real defence.
 */

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** All valid Saathi slugs — used as DB vertical_id slug form and in system prompts. */
export const SAATHI_SLUGS = new Set([
  'kanoonsaathi', 'maathsaathi', 'chemsaathi', 'biosaathi', 'pharmasaathi',
  'medicosaathi', 'nursingsaathi', 'psychsaathi', 'mechsaathi', 'civilsaathi',
  'elecsaathi', 'compsaathi', 'envirosathi', 'bizsaathi', 'finsaathi',
  'mktsaathi', 'hrsaathi', 'archsaathi', 'historysaathi', 'econsaathi',
  'chemengg saathi', 'biotechsaathi', 'aerospacesaathi', 'electronicssaathi',
]);

/** Returns true if the value is a valid UUID v4. */
export function isUUID(v: unknown): v is string {
  return typeof v === 'string' && UUID_REGEX.test(v);
}

/** Returns true if value is a non-empty string within the max byte length. */
export function isNonEmptyString(v: unknown, maxLen: number): v is string {
  return typeof v === 'string' && v.trim().length > 0 && v.length <= maxLen;
}

/** Returns true if value is a known Saathi slug. */
export function isSaathiSlug(v: unknown): v is string {
  return typeof v === 'string' && SAATHI_SLUGS.has(v);
}

/** Returns true if value is a valid ISO 8601 date-time string. */
export function isISODate(v: unknown): v is string {
  if (typeof v !== 'string') return false;
  const d = new Date(v);
  return !Number.isNaN(d.getTime());
}

/**
 * Strip HTML tags and encode characters that enable XSS.
 * Use before inserting user text into HTML email bodies or system prompts.
 */
export function sanitize(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/** Validate a value is one of a fixed set of strings (enum allowlist). */
export function isOneOf<T extends string>(v: unknown, allowed: readonly T[]): v is T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v);
}
