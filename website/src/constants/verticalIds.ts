/**
 * Static UUID ↔ slug mapping for all 24 Saathi verticals.
 *
 * Source: SELECT id, slug FROM verticals ORDER BY slug;
 * Applied: 2026-04-03 — verticals.id converted from TEXT slug to proper UUID.
 *
 * Use toSlug()      — when reading  primary_saathi_id → need slug for SAATHIS.find / edge fns
 * Use toVerticalUuid() — when writing primary_saathi_id / vertical_id → need UUID for DB FK
 */

export const SLUG_TO_UUID: Record<string, string> = {
  'aerospacesaathi':   '5ec9f47c-36b5-418f-a9b1-ebe8ca519b9e',
  'archsaathi':        '066cf79f-6988-4b1b-9023-3bb1a95cf1ef',
  'biosaathi':         '766c728f-0ac5-47b8-977e-3d53171befef',
  'biotechsaathi':     '4a27efab-9389-4be4-83c4-c94186d3b8a5',
  'bizsaathi':         'b44bcc52-f5c9-4d6c-8ded-6e9f0ea4e6f9',
  'chemengg-saathi':   '0492c74e-0d65-4cb0-b862-16222c08116c',
  'chemsaathi':        '4f1c2dc8-e8ef-465c-9d85-60693614d2ca',
  'civilsaathi':       'ae58dc64-c007-4e86-91de-9fef02d6ed9e',
  'compsaathi':        '7d035944-518c-4226-98cb-4afc84dc170a',
  'econsaathi':        '3ceed581-23e7-430d-9bc5-cc3c1a6c1525',
  'elecsaathi':        'c9050111-cb49-4807-a067-01f71d08d0b9',
  'electronicssaathi': '516d3ac4-80e0-49a5-8ceb-2262c8b4f74c',
  'envirosaathi':      '91cd2776-064e-49a0-a943-473aab99c681',
  'finsaathi':         '66c4593f-2e5e-4b0b-99f7-9aceb432cd93',
  'historysaathi':     '4b17ee05-843d-4834-ae06-bdb00de88698',
  'hrsaathi':          '8bb0ee78-cee4-4a38-85fe-3216ad7223de',
  'kanoonsaathi':      '2b3d9904-71d9-4275-a3f1-4bbdbf15e0c9',
  'maathsaathi':       '3938e9ca-27f3-496c-b257-9085c88b6086',
  'mechsaathi':        'fc2d4095-7570-4e70-94d4-133b02d92f02',
  'medicosaathi':      '04a40fcd-dff7-4f4b-9318-4fc9ced52ff2',
  'mktsaathi':         '3a1d5d47-8f74-41c0-a65f-a9f6bb9ac513',
  'nursingsaathi':     '3ed543a3-b8a6-4eb7-a3db-aff77b441561',
  'pharmasaathi':      'da86768e-14ab-4614-b579-7f4915b2ceca',
  'psychsaathi':       '58751e29-7335-4810-aee6-aed7653d024a',
};

export const UUID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_UUID).map(([slug, uuid]) => [uuid, slug]),
);

/**
 * Convert a primary_saathi_id value (UUID) to its slug.
 * Safe to call with either UUID or slug — returns slug either way.
 * Returns null if input is null/undefined.
 */
export function toSlug(primarySaathiId: string | null | undefined): string | null {
  if (!primarySaathiId) return null;
  return UUID_TO_SLUG[primarySaathiId] ?? primarySaathiId; // fallback: already a slug
}

/**
 * Convert a saathi slug to its vertical UUID (for DB writes).
 * Returns null if slug is unknown.
 */
export function toVerticalUuid(slug: string | null | undefined): string | null {
  if (!slug) return null;
  return SLUG_TO_UUID[slug] ?? null;
}
