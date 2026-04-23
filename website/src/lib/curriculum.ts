// ─────────────────────────────────────────────────────────────────────────────
// curriculum.ts — university-curriculum-aware helpers for onboarding
//
// Powers the "Student picks university + degree + year → subjects appear
// from DB → Saathi matched + soul pre-populated" flow. Reads from the
// pre-seeded university_syllabi table (624 papers across major programmes).
//
// Adapted import: the codebase uses the existing @/lib/supabase/client
// singleton factory instead of @supabase/auth-helpers-nextjs (not installed
// in this project). Same typed Supabase client, same capabilities.
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
  saathiSlug: string | null
}

export async function getCurriculum(
  universityName: string,
  degree: string,
  specialisation: string | null,
  year: number
): Promise<CurriculumResult> {
  const supabase = createClient()

  // Semesters for this year (year 1 = sem 1+2, year 2 = sem 3+4 etc)
  const semStart = (year - 1) * 2 + 1
  const semEnd = semStart + 1

  // Helper to query
  async function query(uniName: string, spec?: string | null) {
    let q = supabase
      .from('university_syllabi')
      .select('*')
      .eq('university_name', uniName)
      .eq('degree', degree)
      .in('semester', [semStart, semEnd])
      .not('paper_type', 'eq', 'practical') // exclude practicals from display
      .order('semester', { ascending: true })
      .order('paper_type', { ascending: true })

    if (spec) q = q.eq('specialisation', spec)
    return q
  }

  // 1. Exact university match
  const { data: exact } = await query(universityName, specialisation)
  if (exact?.length) {
    return {
      subjects: exact,
      source: 'university_specific',
      saathiSlug: getMostFrequentSaathi(exact)
    }
  }

  // 2. AICTE fallback for B.Tech
  if (degree === 'B.Tech' || degree === 'B.E.') {
    const { data: aicte } = await query('AICTE Model Curriculum', specialisation)
    if (aicte?.length) {
      return {
        subjects: aicte,
        source: 'aicte_model',
        saathiSlug: getMostFrequentSaathi(aicte)
      }
    }
  }

  // 3. PCI fallback for B.Pharm
  if (degree === 'B.Pharm') {
    const { data: pci } = await query('PCI Model Curriculum', null)
    if (pci?.length) {
      return {
        subjects: pci,
        source: 'pci_model',
        saathiSlug: 'pharmasaathi'
      }
    }
  }

  // 4. UGC fallback for B.Sc / B.Com / B.A.
  if (['B.Sc', 'B.Com', 'B.A.'].includes(degree)) {
    const { data: ugc } = await query('UGC Model Curriculum', specialisation)
    if (ugc?.length) {
      return {
        subjects: ugc,
        source: 'ugc_model',
        saathiSlug: getMostFrequentSaathi(ugc)
      }
    }
  }

  // 5. BCI fallback for LLB
  if (degree === 'LLB' || degree === 'LL.B.') {
    const { data: bci } = await query('Gujarat University', null)
    if (bci?.length) {
      return {
        subjects: bci,
        source: 'bci_model',
        saathiSlug: 'kanoonsaathi'
      }
    }
  }

  // 6. No match — manual entry
  return { subjects: [], source: 'manual_entry', saathiSlug: null }
}

function getMostFrequentSaathi(subjects: SyllabusEntry[]): string {
  // Find the most common primary_saathi in core subjects
  const coreSubs = subjects.filter(s => s.paper_type === 'core')
  const counts: Record<string, number> = {}
  const target = coreSubs.length ? coreSubs : subjects
  target.forEach(s => {
    counts[s.primary_saathi] = (counts[s.primary_saathi] ?? 0) + 1
  })
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'compsaathi'
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
