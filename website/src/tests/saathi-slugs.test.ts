/**
 * Saathi slug consistency test.
 *
 * Run:   npx jest saathi-slugs
 * Script: npm run test:saathis
 *
 * Must pass before every deploy.
 * Catches slug drift across constants, verticalIds, and the canonical list.
 */

import { SAATHIS } from '../constants/saathis'
import { SLUG_TO_UUID } from '../constants/verticalIds'

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
})
