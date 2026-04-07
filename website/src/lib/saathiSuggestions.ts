// ─── Soul-matched Saathi suggestion engine ───────────────────────────────────
// Accepts enrolledSlugs (already converted from UUIDs at call site).
// Returns top N suggestions with reasons.

import { SAATHIS } from '@/constants/saathis'

type SoulProfile = {
  academic_level?:        string | null
  institution_name?:      string | null
  future_subjects?:       string[] | null
  future_research_area?:  string | null
  interests?:             string[] | null
}

export type SaathiSuggestion = {
  saathi:  typeof SAATHIS[0]
  score:   number
  reasons: string[]
}

// ─── Subject keyword → Saathi SLUG mapping ────────────────────────────────────

const SUBJECT_SAATHI_MAP: Record<string, string[]> = {
  mathematics:          ['maathsaathi'],
  maths:                ['maathsaathi'],
  calculus:             ['maathsaathi'],
  statistics:           ['statssaathi', 'maathsaathi'],
  stats:                ['statssaathi'],
  'data science':       ['statssaathi', 'compsaathi'],
  physics:              ['physicsaathi', 'maathsaathi', 'mechsaathi'],
  'engineering physics':['physicsaathi'],
  chemistry:            ['chemsaathi', 'pharmasaathi'],
  'organic chemistry':  ['chemsaathi'],
  biology:              ['biosaathi', 'biotechsaathi'],
  'computer science':   ['compsaathi', 'electronicssaathi'],
  programming:          ['compsaathi'],
  algorithms:           ['compsaathi'],
  electronics:          ['elecsaathi', 'electronicssaathi'],
  electrical:           ['elecsaathi'],
  mechanical:           ['mechsaathi'],
  civil:                ['civilsaathi'],
  chemical:             ['chemsaathi', 'chemengg-saathi'],
  aerospace:            ['aerospacesaathi'],
  biotechnology:        ['biotechsaathi'],
  environmental:        ['envirosaathi'],
  anatomy:              ['medicosaathi', 'nursingsaathi'],
  physiology:           ['medicosaathi'],
  pharmacology:         ['pharmasaathi', 'medicosaathi'],
  nursing:              ['nursingsaathi'],
  economics:            ['econsaathi', 'finsaathi'],
  finance:              ['finsaathi'],
  accounting:           ['accountsaathi', 'finsaathi'],
  accounts:             ['accountsaathi'],
  'financial accounting':['accountsaathi'],
  management:           ['bizsaathi', 'hrsaathi'],
  marketing:            ['mktsaathi'],
  'human resources':    ['hrsaathi'],
  law:                  ['kanoonsaathi'],
  history:              ['historysaathi'],
  psychology:           ['psychsaathi'],
  architecture:         ['archsaathi'],
  'political science':  ['polscisaathi'],
  'political theory':   ['polscisaathi'],
  politics:             ['polscisaathi'],
  geography:            ['geosaathi'],
  'human geography':    ['geosaathi'],
  'physical geography': ['geosaathi'],
  agriculture:          ['agrisaathi'],
  agronomy:             ['agrisaathi'],
  horticulture:         ['agrisaathi'],
  'soil science':       ['agrisaathi'],
  upsc:                 ['kanoonsaathi', 'historysaathi', 'polscisaathi',
                         'geosaathi', 'econsaathi', 'envirosaathi', 'agrisaathi'],
  'general studies':    ['historysaathi', 'polscisaathi', 'geosaathi',
                         'econsaathi', 'envirosaathi'],
  sociology:            ['psychsaathi', 'polscisaathi'],
}

// ─── Course type → Saathi SLUG clusters ──────────────────────────────────────

const COURSE_CLUSTERS: Record<string, string[]> = {
  'b.tech': ['maathsaathi', 'physicsaathi', 'chemsaathi', 'mechsaathi',
             'elecsaathi', 'compsaathi', 'electronicssaathi',
             'chemengg-saathi', 'aerospacesaathi', 'biotechsaathi', 'envirosaathi'],
  'btech':  ['maathsaathi', 'physicsaathi', 'chemsaathi', 'mechsaathi',
             'elecsaathi', 'compsaathi', 'electronicssaathi',
             'chemengg-saathi', 'aerospacesaathi', 'biotechsaathi', 'envirosaathi'],
  'b.e':    ['maathsaathi', 'physicsaathi', 'mechsaathi', 'elecsaathi', 'compsaathi'],
  'b.sc':   ['physicsaathi', 'chemsaathi', 'biosaathi', 'maathsaathi',
             'statssaathi', 'envirosaathi', 'biotechsaathi', 'agrisaathi'],
  'bsc':    ['physicsaathi', 'chemsaathi', 'biosaathi', 'maathsaathi',
             'statssaathi', 'envirosaathi', 'biotechsaathi', 'agrisaathi'],
  'mbbs':   ['medicosaathi', 'pharmasaathi', 'biosaathi'],
  'b.pharm':['pharmasaathi', 'chemsaathi', 'biosaathi'],
  'mba':    ['bizsaathi', 'finsaathi', 'mktsaathi', 'hrsaathi', 'econsaathi'],
  'bba':    ['bizsaathi', 'finsaathi', 'mktsaathi'],
  'b.com':  ['accountsaathi', 'finsaathi', 'econsaathi', 'bizsaathi', 'mktsaathi'],
  'bcom':   ['accountsaathi', 'finsaathi', 'econsaathi', 'bizsaathi', 'mktsaathi'],
  'llb':    ['kanoonsaathi'],
  'b.arch': ['archsaathi', 'civilsaathi'],
  'ba':     ['historysaathi', 'psychsaathi', 'polscisaathi',
             'geosaathi', 'econsaathi'],
  'm.sc':   ['physicsaathi', 'chemsaathi', 'biosaathi', 'statssaathi', 'maathsaathi'],
  'msc':    ['physicsaathi', 'chemsaathi', 'biosaathi', 'statssaathi', 'maathsaathi'],
  'ma':     ['historysaathi', 'polscisaathi', 'psychsaathi', 'geosaathi'],
  'b.sc agriculture': ['agrisaathi', 'biosaathi', 'chemsaathi', 'envirosaathi'],
  'agriculture':      ['agrisaathi'],
}

// ─── Main scorer ─────────────────────────────────────────────────────────────
// enrolledSlugs: SLUGS of already-enrolled Saathis (converted from UUIDs
//                via toSlug() BEFORE calling this function)

export function getSaathiSuggestions(
  enrolledSlugs:   string[],   // ← SLUGS, not UUIDs
  soul:            SoulProfile,
  count = 3,
): SaathiSuggestion[] {
  // Filter using slugs — SAATHIS.id is always a slug
  const unenrolled = SAATHIS.filter((s) => !enrolledSlugs.includes(s.id))
  if (unenrolled.length === 0) return []

  const scored: SaathiSuggestion[] = unenrolled.map((saathi) => {
    let score = 0
    const reasons: string[] = []

    // Future subjects
    if (soul.future_subjects?.length) {
      for (const subject of soul.future_subjects) {
        const lower = subject.toLowerCase()
        for (const [keyword, slugs] of Object.entries(SUBJECT_SAATHI_MAP)) {
          if (lower.includes(keyword) && slugs.includes(saathi.id)) {
            score += 50
            reasons.push(`Matches your interest in ${subject}`)
            break
          }
        }
      }
    }

    // Future research area
    if (soul.future_research_area) {
      const lower = soul.future_research_area.toLowerCase()
      for (const [keyword, slugs] of Object.entries(SUBJECT_SAATHI_MAP)) {
        if (lower.includes(keyword) && slugs.includes(saathi.id)) {
          score += 40
          reasons.push('Aligns with your research interest')
          break
        }
      }
    }

    // Institution / course cluster
    const instLower = (soul.institution_name ?? '').toLowerCase()
    for (const [courseKey, slugs] of Object.entries(COURSE_CLUSTERS)) {
      if (instLower.includes(courseKey) && slugs.includes(saathi.id)) {
        score += 30
        reasons.push(`Common for ${courseKey.toUpperCase()} students`)
        break
      }
    }

    // Postgrad boost
    if (soul.academic_level === 'master' || soul.academic_level === 'phd') {
      const researchSaathis = ['biotechsaathi', 'envirosaathi', 'psychsaathi', 'econsaathi']
      if (researchSaathis.includes(saathi.id)) {
        score += 15
        reasons.push('Popular among postgrad students')
      }
    }

    // UPSC interest
    if (soul.interests?.some((i) => i.toLowerCase().includes('upsc'))) {
      const upscSaathis = ['kanoonsaathi', 'historysaathi', 'econsaathi', 'envirosaathi']
      if (upscSaathis.includes(saathi.id)) {
        score += 35
        reasons.push('Strong for UPSC preparation')
      }
    }

    if (score === 0) {
      score = 5
      reasons.push('Expands your learning potential')
    }

    return { saathi, score, reasons: [...new Set(reasons)].slice(0, 2) }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, count)
}
