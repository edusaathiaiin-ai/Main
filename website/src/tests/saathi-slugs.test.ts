/**
 * Saathi slug consistency test.
 *
 * Run:   npx jest saathi-slugs
 * Script: npm run test:saathis
 *
 * Must pass before every deploy.
 * Catches slug drift across constants, verticalIds, and the canonical list.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SAATHIS } from '../constants/saathis'
import { SLUG_TO_UUID } from '../constants/verticalIds'
// Also audit the Expo-app SAATHIS array at repo root — it must use the
// same canonical slugs because both the website and Expo app resolve against
// the same Supabase `verticals.slug` column. A drift here would break Expo
// routing/UI once the mobile app launches.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SAATHIS: SAATHIS_EXPO } = require('../../../constants/saathis') as {
  SAATHIS: Array<{ id: string; name: string }>
}

// Text-mode audit for files we can't import directly (Deno edge functions,
// CSS). Reads raw file content; scans for every deprecated slug. A single
// match anywhere = test fails. Cheap, deterministic, no runtime coupling.
// __dirname = <repo>/website/src/tests → three `..` reaches the repo root
//   ..       = <repo>/website/src
//   ../..    = <repo>/website
//   ../../.. = <repo>
const REPO_ROOT = join(__dirname, '..', '..', '..')
function readRepoFile(...parts: string[]): string {
  return readFileSync(join(REPO_ROOT, ...parts), 'utf8')
}

// Single source of truth — 30 canonical slugs (DB authoritative)
const CANONICAL_SLUGS = [
  'accountsaathi',
  'aerospacesaathi',
  'agrisaathi',
  'archsaathi',
  'biosaathi',
  'biotechsaathi',
  'bizsaathi',
  'chemengg-saathi',
  'chemsaathi',
  'civilsaathi',
  'compsaathi',
  'econsaathi',
  'elecsaathi',
  'electronicssaathi',
  'envirosaathi',
  'finsaathi',
  'geosaathi',
  'historysaathi',
  'hrsaathi',
  'kanoonsaathi',
  'maathsaathi',
  'mechsaathi',
  'medicosaathi',
  'mktsaathi',
  'nursingsaathi',
  'pharmasaathi',
  'physicsaathi',
  'polscisaathi',
  'psychsaathi',
  'statssaathi',
]

// Known bad slugs that must never appear
const DEPRECATED_SLUGS = [
  'physisaathi',        // old typo → physicsaathi
  'aerosaathi',         // old typo → aerospacesaathi
  'envirosathi',        // missing 'a' → envirosaathi
  'chemenggsaathi',     // no hyphen → chemengg-saathi
  'chemengg saathi',    // space → chemengg-saathi
  'chemengg_saathi',    // underscore → chemengg-saathi
]

describe('Saathi slug consistency', () => {
  test('SAATHIS has exactly 30 entries', () => {
    expect(SAATHIS).toHaveLength(30)
  })

  test('SAATHIS slugs match canonical list exactly', () => {
    const actual = SAATHIS.map((s) => s.id).sort()
    const expected = [...CANONICAL_SLUGS].sort()
    expect(actual).toEqual(expected)
  })

  test('chemengg-saathi uses hyphen (not no-separator or space)', () => {
    const slugs = SAATHIS.map((s) => s.id)
    expect(slugs).toContain('chemengg-saathi')
    for (const bad of DEPRECATED_SLUGS) {
      expect(slugs).not.toContain(bad)
    }
  })

  test('SLUG_TO_UUID covers all 30 canonical slugs', () => {
    for (const slug of CANONICAL_SLUGS) {
      expect(SLUG_TO_UUID).toHaveProperty(slug)
      expect(typeof SLUG_TO_UUID[slug]).toBe('string')
      // Basic UUID format check
      expect(SLUG_TO_UUID[slug]).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
    }
  })

  test('SLUG_TO_UUID contains no deprecated slugs', () => {
    for (const bad of DEPRECATED_SLUGS) {
      expect(SLUG_TO_UUID).not.toHaveProperty(bad)
    }
  })

  test('SLUG_TO_UUID has no duplicate UUIDs', () => {
    const uuids = Object.values(SLUG_TO_UUID)
    const unique = new Set(uuids)
    expect(uuids.length).toBe(unique.size)
  })

  test('every SAATHI slug has a UUID mapping', () => {
    for (const saathi of SAATHIS) {
      expect(SLUG_TO_UUID).toHaveProperty(saathi.id)
    }
  })

  // ── Expo-app root constants must match website + DB ──────────────────
  test('Expo SAATHIS has exactly 30 entries', () => {
    expect(SAATHIS_EXPO).toHaveLength(30)
  })

  test('Expo SAATHIS slugs match canonical list exactly', () => {
    const actual = SAATHIS_EXPO.map((s) => s.id).sort()
    const expected = [...CANONICAL_SLUGS].sort()
    expect(actual).toEqual(expected)
  })

  test('Expo SAATHIS contains no deprecated slugs', () => {
    const slugs = SAATHIS_EXPO.map((s) => s.id)
    for (const bad of DEPRECATED_SLUGS) {
      expect(slugs).not.toContain(bad)
    }
  })

  // ── Text-mode audits for files Jest can't import directly ─────────────

  // Edge-function code (Deno) — read as text and check SUBJECT_GUARDRAILS keys.
  // A deprecated slug here means a student could pick a Saathi whose subject
  // boundary never fires → jailbreak risk.
  test('SUBJECT_GUARDRAILS (chat/guardrails.ts) has no deprecated slugs', () => {
    const src = readRepoFile('supabase/functions/chat/guardrails.ts')
    for (const bad of DEPRECATED_SLUGS) {
      // Match quoted usage: 'bad-slug' or "bad-slug" — avoids false hits in
      // comments/redirectMessage text that may mention a slug as trivia.
      const quoted = new RegExp(`['"]${escapeRegex(bad)}['"]`)
      expect(src).not.toMatch(quoted)
    }
    // Spot-check: every canonical slug is a key in the guardrails map.
    // TS object keys can be bare identifiers OR quoted strings — accept both.
    // Hyphenated slugs (chemengg-saathi) MUST be quoted; others may be bare.
    for (const slug of CANONICAL_SLUGS) {
      const needsQuotes = /[^a-z0-9_$]/.test(slug)
      const pattern = needsQuotes
        ? new RegExp(`['"]${escapeRegex(slug)}['"]\\s*:`)
        : new RegExp(`(?:^|[\\s,{])(?:['"]${escapeRegex(slug)}['"]|${escapeRegex(slug)})\\s*:`, 'm')
      expect(src).toMatch(pattern)
    }
  })

  // Edge-function code (Deno) — saathiPersonalities map keys.
  // Deprecated key here = slot-1 personality never loads for the student.
  test('saathiPersonalities (_shared) has no deprecated slugs', () => {
    const src = readRepoFile('supabase/functions/_shared/saathiPersonalities.ts')
    for (const bad of DEPRECATED_SLUGS) {
      const quoted = new RegExp(`['"]${escapeRegex(bad)}['"]`)
      expect(src).not.toMatch(quoted)
    }
  })

  // CSS — every per-Saathi theme is keyed via [data-saathi="slug"].
  // A deprecated slug in the CSS means a student's theme silently fails.
  test('globals.css has no deprecated data-saathi selectors', () => {
    const src = readRepoFile('website/src/app/globals.css')
    for (const bad of DEPRECATED_SLUGS) {
      const selector = new RegExp(`\\[data-saathi=["']${escapeRegex(bad)}["']\\]`)
      expect(src).not.toMatch(selector)
    }
  })
})

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
