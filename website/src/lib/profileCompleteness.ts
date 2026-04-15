// Profile completeness scoring — 100 points total
// Used by the onboarding form to show live progress.

export type SoulCompletenessData = {
  name: string
  city: string
  educationParsed: boolean // true when parse-education returned successfully
  subjects: string[]
  learningStyle: string
  dream: string
  examTarget: string
  interests: string[]
}

const WEIGHTS = {
  name: 15,
  city: 10,
  educationParsed: 20,
  subjects: 15,
  learningStyle: 15,
  dream: 15,
  examTarget: 5,
  interests: 5,
} as const

export function computeProfileCompleteness(data: SoulCompletenessData): number {
  let score = 0
  if (data.name.trim().length > 0) score += WEIGHTS.name
  if (data.city.trim().length > 0) score += WEIGHTS.city
  if (data.educationParsed) score += WEIGHTS.educationParsed
  if (data.subjects.length > 0) score += WEIGHTS.subjects
  if (data.learningStyle.length > 0) score += WEIGHTS.learningStyle
  if (data.dream.trim().length > 10) score += WEIGHTS.dream
  if (data.examTarget.length > 0 && data.examTarget !== '')
    score += WEIGHTS.examTarget
  if (data.interests.length > 0) score += WEIGHTS.interests
  return Math.min(score, 100)
}

export function getMilestoneLabel(pct: number): string {
  if (pct <= 0) return 'Just getting started'
  if (pct < 30) return 'Just getting started'
  if (pct < 60) return 'Getting to know you'
  if (pct < 80) return 'Soul taking shape ✦'
  if (pct < 100) return 'Almost fully calibrated'
  return 'Your Saathi knows you ✓'
}

export function getSubmitButtonLabel(pct: number): string {
  if (pct < 40) return 'Start my journey →'
  if (pct < 70) return `Begin with ${pct}% soul →`
  if (pct < 100) return 'Almost there — begin →'
  return "My Saathi knows me — let's go! ✓"
}

// ─────────────────────────────────────────────────────────────────────────────
// Runtime completeness (live Profile + Soul)
//
// `computeProfileCompleteness` above scores the in-form onboarding shape.
// `getProfileCompleteness` below scores the live DB shape — used by features
// that need to react to a student's profile state at runtime:
//   - IceBreaker (gate: skip <30%, soft-tone 30-69%, full magic ≥70%)
//   - Board posting gate (require ≥60% to post)
//   - WhatsApp upsell (show only if <60%)
//   - Profile page completeness indicator
//   - Admin user list (per-user completeness column)
//
// Weights sum to exactly 100. Adjust deliberately — every consumer
// downstream calibrates against this scale.
// ─────────────────────────────────────────────────────────────────────────────

export type CompletenessProfile = {
  full_name?:         string | null
  city?:              string | null
  institution_name?:  string | null
  academic_level?:    string | null
  current_subjects?:  string[] | null
  wa_phone?:          string | null
  primary_saathi_id?: string | null
}

export type CompletenessSoul = {
  future_research_area?: string | null
}

export type CompletenessFieldKey =
  | 'full_name'
  | 'city'
  | 'institution_name'
  | 'academic_level'
  | 'current_subjects'
  | 'future_research_area'
  | 'wa_phone'
  | 'primary_saathi_id'

type FieldDef = {
  key:      CompletenessFieldKey
  label:    string
  weight:   number
  href:     string
  present:  (p: CompletenessProfile, s?: CompletenessSoul | null) => boolean
}

export const COMPLETENESS_FIELDS: ReadonlyArray<FieldDef> = [
  {
    key:     'institution_name',
    label:   'Your institution',
    weight:  20,
    href:    '/profile#institution',
    present: (p) => !!p.institution_name?.trim(),
  },
  {
    key:     'full_name',
    label:   'Your name',
    weight:  15,
    href:    '/profile#name',
    present: (p) => !!p.full_name?.trim(),
  },
  {
    key:     'academic_level',
    label:   'What you study',
    weight:  15,
    href:    '/profile#academic',
    present: (p) => !!p.academic_level?.trim(),
  },
  {
    key:     'current_subjects',
    label:   'Your subjects',
    weight:  15,
    href:    '/profile#subjects',
    present: (p) => (p.current_subjects?.length ?? 0) > 0,
  },
  {
    key:     'city',
    label:   'Your city',
    weight:  10,
    href:    '/profile#location',
    present: (p) => !!p.city?.trim(),
  },
  {
    key:     'future_research_area',
    label:   'Your research dream',
    weight:  10,
    href:    '/profile#research',
    present: (_p, s) => !!s?.future_research_area?.trim(),
  },
  {
    key:     'wa_phone',
    label:   'WhatsApp number',
    weight:  10,
    href:    '/profile#whatsapp',
    present: (p) => !!p.wa_phone?.trim(),
  },
  {
    key:     'primary_saathi_id',
    label:   'Primary Saathi',
    weight:  5,
    href:    '/profile#saathi',
    present: (p) => !!p.primary_saathi_id,
  },
]

export function getProfileCompleteness(
  profile: CompletenessProfile | null | undefined,
  soul?: CompletenessSoul | null
): number {
  if (!profile) return 0
  let score = 0
  for (const field of COMPLETENESS_FIELDS) {
    if (field.present(profile, soul)) score += field.weight
  }
  return score
}

export function getMissingFields(
  profile: CompletenessProfile | null | undefined,
  soul?: CompletenessSoul | null
): Array<{ key: CompletenessFieldKey; label: string; weight: number; href: string }> {
  if (!profile) {
    return COMPLETENESS_FIELDS.map(({ key, label, weight, href }) => ({ key, label, weight, href }))
  }
  return COMPLETENESS_FIELDS
    .filter((f) => !f.present(profile, soul))
    .map(({ key, label, weight, href }) => ({ key, label, weight, href }))
}

// Calibrated thresholds — change here, every consumer follows.
export const COMPLETENESS_THRESHOLDS = {
  ICEBREAKER_MIN:  30,
  ICEBREAKER_EXAM: 60,   // exam-aware variant fires when student also has exam_target_id + valid days
  ICEBREAKER_FULL: 70,
  BOARD_POST:      60,
  WA_UPSELL_BELOW: 60,
} as const
