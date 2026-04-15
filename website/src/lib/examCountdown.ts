// Exam-aware utilities — countdown, phase classification, milestone
// detection, phase-message composition, topic-coverage delta.
//
// Callers fetch the exam from @/constants/exams and pass the fields they
// need (date string, syllabus topics). Keeps this file a pure library —
// no runtime lookup, no side effects, easy to test with a mocked `today`.

import { EXAM_REGISTRY, type ExamEntry } from '@/constants/exams'

export type ExamPhase =
  | 'early'         // >180 days — build foundations
  | 'preparation'   // 90-180 days — structured study
  | 'intensive'     // 30-90 days — serious focus
  | 'final'         // 7-30 days — final stretch
  | 'exam_week'     // 1-7 days — trust preparation
  | 'exam_day'      // 0 days
  | 'past'          // negative days

export type ExamMilestone =
  | 'T-180' | 'T-90' | 'T-30' | 'T-14' | 'T-7' | 'T-3' | 'T-1' | 'exam_day' | null

export function daysUntilExam(examDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(examDate)
  target.setHours(0, 0, 0, 0)
  return Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getExamPhase(daysLeft: number): ExamPhase {
  if (daysLeft < 0)    return 'past'
  if (daysLeft === 0)  return 'exam_day'
  if (daysLeft <= 7)   return 'exam_week'
  if (daysLeft <= 30)  return 'final'
  if (daysLeft <= 90)  return 'intensive'
  if (daysLeft <= 180) return 'preparation'
  return 'early'
}

export function getMilestone(daysLeft: number): ExamMilestone {
  const milestones: Record<number, ExamMilestone> = {
    180: 'T-180', 90: 'T-90', 30: 'T-30',
    14: 'T-14', 7: 'T-7', 3: 'T-3', 1: 'T-1', 0: 'exam_day',
  }
  return milestones[daysLeft] ?? null
}

export function getPhaseMessage(phase: ExamPhase, examName: string, daysLeft: number): string {
  switch (phase) {
    case 'early':
      return `${examName} is ${Math.floor(daysLeft / 30)} months away. Good time to build foundations.`
    case 'preparation':
      return `${examName} is ${Math.floor(daysLeft / 30)} months away. Time to get structured.`
    case 'intensive':
      return `${examName} is ${daysLeft} days away. Let's get serious.`
    case 'final':
      return `${examName} is ${daysLeft} days away. Final stretch — stay focused.`
    case 'exam_week':
      return `${examName} is in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Trust your preparation.`
    case 'exam_day':
      return `${examName} is today. You've got this. ✦`
    case 'past':
      return `${examName} was ${Math.abs(daysLeft)} days ago.`
  }
}

export function getTopicDelta(
  soulTopics: string[],
  examTopics: string[],
): { covered: string[]; notTouched: string[] } {
  const covered = examTopics.filter((t) =>
    soulTopics.some((s) => s.toLowerCase().includes(t.toLowerCase().split(' ')[0])),
  )
  const notTouched = examTopics.filter((t) => !covered.includes(t))
  return { covered, notTouched }
}

// Auto-populated sitting date for a canonical exam — uses registry's
// next_date, bumps to the following year if that date has already passed.
// Returns null if the id isn't in the registry. Caller writes this to
// profiles.exam_target_date when the student picks (or is classified into)
// an exam without supplying their own sitting date.
export function inferExamDate(examId: string): string | null {
  const exam = EXAM_REGISTRY.find((e) => e.id === examId)
  if (!exam) return null
  const examDate = new Date(exam.next_date + 'T00:00:00Z')
  if (examDate.getTime() >= Date.now()) return exam.next_date
  // Past — bump year, keep month-day from next_date string.
  return `${examDate.getUTCFullYear() + 1}-${exam.next_date.slice(5)}`
}

// Re-export so a single import covers util + registry types for consumers.
export { EXAM_REGISTRY, type ExamEntry }
