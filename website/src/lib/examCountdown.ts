// Pure utilities for exam-aware Saathi awareness.
// All date math in IST (exam dates are India-based; midnight IST is the
// boundary). Tests should mock `now` to keep results deterministic.

import { EXAM_REGISTRY, getExamById, type ExamEntry } from '@/constants/exams'

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000

function todayInIST(now: Date = new Date()): Date {
  // Get the IST calendar date as a UTC midnight Date for clean diffing.
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()))
}

function parseExamDate(iso: string): Date | null {
  // Exam dates in the registry are 'YYYY-MM-DD'. Treat as IST midnight.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return null
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

// ── days until exam ──────────────────────────────────────────────────────
// Negative = in the past. Zero = today.
export function daysUntilExam(examId: string, now: Date = new Date()): number | null {
  const exam = getExamById(examId)
  if (!exam) return null
  const target = parseExamDate(exam.next_date)
  if (!target) return null
  const today = todayInIST(now)
  const diffMs = target.getTime() - today.getTime()
  return Math.round(diffMs / (24 * 60 * 60 * 1000))
}

// ── exam phase ───────────────────────────────────────────────────────────
// preparation        — > 30 days
// final_revision     — 8-30 days
// exam_week          — 1-7 days
// exam_day           — 0
// past               — < 0
export type ExamPhase =
  | 'preparation'
  | 'final_revision'
  | 'exam_week'
  | 'exam_day'
  | 'past'

export function getExamPhase(examId: string, now: Date = new Date()): ExamPhase | null {
  const days = daysUntilExam(examId, now)
  if (days === null) return null
  if (days < 0) return 'past'
  if (days === 0) return 'exam_day'
  if (days <= 7) return 'exam_week'
  if (days <= 30) return 'final_revision'
  return 'preparation'
}

// ── milestone — discrete touchpoints for cron-driven nudges ──────────────
// Returns the milestone label IF today crosses one of the canonical
// thresholds. Used by the nudge cron (Phase 2). The IceBreaker doesn't
// rely on this — it uses the raw days count for natural language.
export type Milestone =
  | 'T-180'
  | 'T-90'
  | 'T-60'
  | 'T-30'
  | 'T-14'
  | 'T-7'
  | 'T-3'
  | 'T-1'
  | 'exam_day'
  | null

const MILESTONE_THRESHOLDS: Array<{ days: number; label: Exclude<Milestone, null> }> = [
  { days: 180, label: 'T-180' },
  { days: 90,  label: 'T-90' },
  { days: 60,  label: 'T-60' },
  { days: 30,  label: 'T-30' },
  { days: 14,  label: 'T-14' },
  { days: 7,   label: 'T-7' },
  { days: 3,   label: 'T-3' },
  { days: 1,   label: 'T-1' },
  { days: 0,   label: 'exam_day' },
]

export function getMilestone(examId: string, now: Date = new Date()): Milestone {
  const days = daysUntilExam(examId, now)
  if (days === null) return null
  const hit = MILESTONE_THRESHOLDS.find((m) => m.days === days)
  return hit?.label ?? null
}

// ── humanised time-to-go phrase ──────────────────────────────────────────
// Used in IceBreaker copy + system prompt. Returns a string the Saathi can
// drop in naturally: "6 months away", "12 days away", "tomorrow", "today".
export function humanizeTimeToGo(days: number): string {
  if (days < 0) return `${Math.abs(days)} days past`
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days <= 14) return `${days} days away`
  if (days <= 60) {
    const weeks = Math.round(days / 7)
    return `${weeks} weeks away`
  }
  const months = Math.round(days / 30)
  if (months === 1) return '1 month away'
  if (months <= 11) return `${months} months away`
  return `about a year away`
}

// ── topic coverage diff — crude string overlap is OK for v1 ─────────────
// `topTopics` comes from student_soul.top_topics[] (AI-extracted after
// every session). We treat a syllabus topic as "covered" if any of the
// student's recent topics contains it (case-insensitive substring), or if
// the syllabus topic contains the student topic. Misses nuance, catches
// the obvious wins ("Quantitative Aptitude" vs "Data Interpretation").
export type TopicCoverage = {
  covered: string[]
  notTouched: string[]
}

export function getTopicCoverage(
  exam: ExamEntry,
  topTopics: ReadonlyArray<string> | null | undefined
): TopicCoverage {
  const recent = (topTopics ?? [])
    .map((t) => t?.trim().toLowerCase())
    .filter((t): t is string => Boolean(t))

  const covered: string[] = []
  const notTouched: string[] = []

  for (const topic of exam.syllabus_topics) {
    const t = topic.toLowerCase()
    const hit = recent.some((s) => t.includes(s) || s.includes(t))
    if (hit) covered.push(topic)
    else notTouched.push(topic)
  }
  return { covered, notTouched }
}

// ── helper: should countdown surface in IceBreaker? ──────────────────────
export function shouldShowCountdown(
  examId: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!examId) return false
  const days = daysUntilExam(examId, now)
  if (days === null) return false
  return days >= 1 && days <= 365
}

// Re-export so consumers only need one import.
export { EXAM_REGISTRY, getExamById }
