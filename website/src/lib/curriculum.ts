// ─────────────────────────────────────────────────────────────────────────────
// curriculum.ts — university-curriculum-aware helpers for onboarding
//
// Powers the "Student picks university + degree + year → subjects appear
// from DB → Saathi matched + soul pre-populated" flow. Reads from the
// pre-seeded university_syllabi table (680+ papers across major programmes).
//
// Philosophy (explicit user directive, April 2026):
//   "Branches multiply, Saathis stay at 30."
//   New specialisations (Mechatronics, Automobile, B.Plan, etc.) must
//   always map back to one of the 30 canonical Saathis. The Saathi gets
//   "broader context understanding" through the CURRICULUM CONTEXT block
//   in the chat system prompt — it knows it's speaking to a Mechatronics
//   or B.Plan student without a new Saathi being minted.
//
// Two resolution paths run in parallel:
//   1. Subject list  → DB `university_syllabi` (waterfall: exact uni →
//      AICTE/PCI/UGC/BCI model fallback → empty = manual entry).
//   2. Saathi match  → DB `primary_saathi` tags when rows exist, otherwise
//      `resolveSaathi(degree, specialisation)` as deterministic safety net.
//      `resolveSaathi` is also exported for other call sites that need
//      the same mapping without a DB round-trip.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/client'

export type SyllabusEntry = {
  id: string
  university_name: string
  degree: string
  specialisation: string | null
  year: number
  semester: number
  paper_code: string | null
  paper_name: string
  paper_type: string
  credits: number | null
  primary_saathi: string
  framework: string
}

export type CurriculumResult = {
  subjects: SyllabusEntry[]
  source: 'university_specific' | 'aicte_model' | 'ugc_model' | 'pci_model' | 'bci_model' | 'manual_entry'
  /** Never null. `manual_entry` still resolves to a Saathi via `resolveSaathi()`. */
  saathiSlug: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Degree aliases — DB query only. B.E. curriculum is identical to AICTE B.Tech
// in Indian context; the UI stores the student's chosen label unchanged and
// only the Supabase query normalises.
// ─────────────────────────────────────────────────────────────────────────────
const DEGREE_ALIASES: Record<string, string> = {
  'B.E.': 'B.Tech',
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialisation → Saathi mapping. Deterministic safety net for when
// `university_syllabi` has no row for a given (degree, specialisation) pair,
// or when we want to override DB-derived routing for degrees where branch
// collapses are explicit (Mechatronics → mechsaathi, etc.).
//
// Keys are stored lowercase-normalised; lookup uses the same normalisation.
// ─────────────────────────────────────────────────────────────────────────────
const SPEC_TO_SAATHI: Record<string, string> = {
  // Engineering — branches collapse aggressively
  'computer science and engineering': 'compsaathi',
  'computer science': 'compsaathi',
  'information technology': 'compsaathi',
  'artificial intelligence': 'compsaathi',
  'machine learning': 'compsaathi',
  'data science': 'compsaathi',
  'electrical engineering': 'elecsaathi',
  'electronics and communication engineering': 'electronicssaathi',
  'electronics engineering': 'electronicssaathi',
  'mechanical engineering': 'mechsaathi',
  'mechatronics engineering': 'mechsaathi',
  'automobile engineering': 'mechsaathi',
  'industrial engineering': 'mechsaathi',
  // Robotics + AI curricula are compute-dominant (ML, vision, planning).
  // Matches the data team's per-paper tagging (25/33 compsaathi in AICTE seed).
  'robotics and artificial intelligence': 'compsaathi',
  // Urban & Regional Planning — user's explicit merge directive: B.Plan → ArchSaathi.
  // DB rows are civil-dominant (design/structural papers); code rule overrides.
  'urban and regional planning': 'archsaathi',
  'civil engineering': 'civilsaathi',
  'chemical engineering': 'chemengg-saathi',
  'biotechnology': 'biotechsaathi',
  'aeronautical engineering': 'aerospacesaathi',
  'aerospace engineering': 'aerospacesaathi',
  'environmental engineering': 'envirosaathi',
  'agricultural engineering': 'agrisaathi',
  // Pure sciences
  'physics': 'physicsaathi',
  'applied physics': 'physicsaathi',
  'chemistry': 'chemsaathi',
  'mathematics': 'maathsaathi',
  'applied mathematics': 'maathsaathi',
  'biology': 'biosaathi',
  'botany': 'biosaathi',
  'zoology': 'biosaathi',
  'biochemistry': 'biosaathi',
  'microbiology': 'biosaathi',
  'statistics': 'statssaathi',
  // Humanities / social
  'economics': 'econsaathi',
  'political science': 'polscisaathi',
  'history': 'historysaathi',
  'psychology': 'psychsaathi',
  'sociology': 'polscisaathi',          // nearest soul neighbour
  'english literature': 'historysaathi', // nearest humanities anchor
  // Commerce / management
  'finance': 'finsaathi',
  'marketing': 'mktsaathi',
  'hr': 'hrsaathi',
  'human resources': 'hrsaathi',
  'operations': 'bizsaathi',
  'international business': 'bizsaathi',
  'it': 'compsaathi',
  'accounting': 'accountsaathi',
}

// ─────────────────────────────────────────────────────────────────────────────
// Degree → Saathi mapping. Used when no specialisation is selected, or when
// the specialisation string doesn't match anything in SPEC_TO_SAATHI.
// ─────────────────────────────────────────────────────────────────────────────
const DEGREE_TO_SAATHI: Record<string, string> = {
  'B.Plan': 'archsaathi',
  'B.Pharm': 'pharmasaathi',
  'MBBS': 'medicosaathi',
  'B.Sc Nursing': 'nursingsaathi',
  'LLB': 'kanoonsaathi',
  'LL.B.': 'kanoonsaathi',
  'BA LLB': 'kanoonsaathi',
  'LLM': 'kanoonsaathi',
  'BBA': 'bizsaathi',
  'MBA': 'bizsaathi',
  'B.Com': 'accountsaathi',
  'B.A.': 'historysaathi',
  'B.Sc': 'physicsaathi',  // broadest natural-sciences anchor (overridden by specialisation)
  'B.Tech': 'compsaathi',
  'B.E.': 'compsaathi',
  'M.Tech': 'compsaathi',
  'M.Sc': 'physicsaathi',
  'Diploma': 'compsaathi',
  'Other': 'compsaathi',
}

/**
 * Deterministic degree+specialisation → Saathi slug resolver.
 * Guarantees every student gets matched to one of the 30 canonical Saathis,
 * even when no curriculum rows exist in the DB.
 */
export function resolveSaathi(degree: string, specialisation: string | null): string {
  if (specialisation) {
    const key = specialisation.trim().toLowerCase()
    if (SPEC_TO_SAATHI[key]) return SPEC_TO_SAATHI[key]
    // Fuzzy contains — handles "Mechatronics" loosely matching "mechatronics engineering"
    for (const [specKey, slug] of Object.entries(SPEC_TO_SAATHI)) {
      if (key.includes(specKey) || specKey.includes(key)) return slug
    }
  }
  return DEGREE_TO_SAATHI[degree] ?? 'compsaathi'
}

export async function getCurriculum(
  universityName: string,
  degree: string,
  specialisation: string | null,
  year: number
): Promise<CurriculumResult> {
  const supabase = createClient()
  const queryDegree = DEGREE_ALIASES[degree] ?? degree

  // Semesters for this year (year 1 = sem 1+2, year 2 = sem 3+4 etc)
  const semStart = (year - 1) * 2 + 1
  const semEnd = semStart + 1

  async function query(uniName: string, useDegree: string, spec?: string | null) {
    let q = supabase
      .from('university_syllabi')
      .select('*')
      .eq('university_name', uniName)
      .eq('degree', useDegree)
      .in('semester', [semStart, semEnd])
      .not('paper_type', 'eq', 'practical') // exclude practicals from display
      .order('semester', { ascending: true })
      .order('paper_type', { ascending: true })

    if (spec) q = q.eq('specialisation', spec)
    return q
  }

  // `saathiSlug` is always driven by resolveSaathi() — the user's architectural
  // rule "branches multiply, Saathis stay at 30" is authoritative for the top-
  // level match. The DB's per-paper `primary_saathi` tagging is still valuable
  // for downstream soul signal (via enrolled_subjects in the system prompt and
  // struggle_topics inference) but does NOT determine which Saathi the student
  // interacts with — otherwise B.Plan students route to CivilSaathi (dominant
  // tag in the AICTE Urban Planning seed) instead of ArchSaathi.
  const saathiSlug = resolveSaathi(degree, specialisation)

  // 1. Exact university match
  const { data: exact } = await query(universityName, queryDegree, specialisation)
  if (exact?.length) {
    return { subjects: exact, source: 'university_specific', saathiSlug }
  }

  // 2. AICTE fallback — B.Tech (incl. B.E. alias) and B.Plan
  if (queryDegree === 'B.Tech' || queryDegree === 'B.Plan') {
    const { data: aicte } = await query('AICTE Model Curriculum', queryDegree, specialisation)
    if (aicte?.length) {
      return { subjects: aicte, source: 'aicte_model', saathiSlug }
    }
  }

  // 3. PCI fallback for B.Pharm
  if (degree === 'B.Pharm') {
    const { data: pci } = await query('PCI Model Curriculum', queryDegree, null)
    if (pci?.length) {
      return { subjects: pci, source: 'pci_model', saathiSlug }
    }
  }

  // 4. UGC fallback for B.Sc / B.Com / B.A.
  if (['B.Sc', 'B.Com', 'B.A.'].includes(degree)) {
    const { data: ugc } = await query('UGC Model Curriculum', queryDegree, specialisation)
    if (ugc?.length) {
      return { subjects: ugc, source: 'ugc_model', saathiSlug }
    }
  }

  // 5. BCI fallback for LLB (routed via the Gujarat University rows)
  if (degree === 'LLB' || degree === 'LL.B.') {
    const { data: bci } = await query('Gujarat University', queryDegree, null)
    if (bci?.length) {
      return { subjects: bci, source: 'bci_model', saathiSlug }
    }
  }

  // 6. No curriculum match — still resolve a Saathi so the student is routed,
  //    and subject list is empty (AcademicJourneyStep offers manual entry).
  return { subjects: [], source: 'manual_entry', saathiSlug }
}

// Get unique degrees available for a university
export async function getDegreesForUniversity(universityName: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('university_syllabi')
    .select('degree, specialisation')
    .eq('university_name', universityName)
  const unique = [...new Set(data?.map(d =>
    d.specialisation ? `${d.degree} — ${d.specialisation}` : d.degree
  ))]
  return unique
}
