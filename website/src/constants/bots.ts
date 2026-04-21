export type BotRole = 'student' | 'faculty' | 'public' | 'institution'

export type BotDefinition = {
  slot: 1 | 2 | 3 | 4 | 5
  id: string
  name: string
  emoji: string
  color: string
  availableTo: BotRole[]
  purpose: string
  description?: string
}

export const BOTS: BotDefinition[] = [
  {
    slot: 1,
    id: 'study-notes',
    name: 'Study Notes',
    emoji: '📘',
    color: '#38BDF8',
    availableTo: ['student', 'faculty'],
    purpose: 'Structured notes, syllabus-aware, saves to profile',
  },
  {
    slot: 2,
    id: 'exam-prep',
    name: 'Exam Prep',
    emoji: '⚡',
    color: '#FBBF24',
    availableTo: ['student'],
    purpose: 'MCQ, past patterns, timed mock Q&A, weak area tracking',
  },
  {
    slot: 3,
    id: 'interest-explorer',
    name: 'Interest Explorer',
    emoji: '🔭',
    color: '#A78BFA',
    availableTo: ['student'],
    purpose: 'Driven by future_subjects + future_research_area',
  },
  {
    slot: 4,
    id: 'upsc-saathi',
    name: 'UPSC Saathi',
    emoji: '🏛️',
    color: '#34D399',
    availableTo: ['student'],
    purpose: 'UPSC optional prep, RSS-aware, answer writing',
  },
  {
    slot: 5,
    id: 'citizen-guide',
    name: 'Citizen Guide',
    emoji: '🧭',
    color: '#FB923C',
    availableTo: ['student', 'faculty', 'public', 'institution'],
    purpose: 'Plain-language explainer, jargon-free always',
  },
]

// ─── Faculty modes ─────────────────────────────────────────────────────────
// Same 5-slot shape as BOTS so BotSelector / SaathiHeader stay branch-free
// beyond a single `const bots = isFaculty ? FACULTY_BOTS : BOTS`.
//
// System-prompt branching keyed by `slot` on the Edge Function side — see
// supabase/functions/_shared/facultyPrompts.ts

export const FACULTY_BOTS: BotDefinition[] = [
  {
    slot: 1,
    id: 'my-saathi',
    name: 'My Saathi',
    emoji: '🎓',
    color: '#38BDF8',
    availableTo: ['faculty'],
    purpose: 'Peer-level chat with your subject Saathi',
    description: 'Collegial, research-grade. No student-facing simplification.',
  },
  {
    slot: 2,
    id: 'lesson-prep',
    name: 'Lesson Prep',
    emoji: '📝',
    color: '#FBBF24',
    availableTo: ['faculty'],
    purpose: 'Plan lectures, structure topics, create examples',
    description: 'Outlines, learning objectives, engaging examples for your next class.',
  },
  {
    slot: 3,
    id: 'research-companion',
    name: 'Research',
    emoji: '🔬',
    color: '#A78BFA',
    availableTo: ['faculty'],
    purpose: 'Literature review, paper ideas, research queries',
    description: 'Inline PubMed citations, paper suggestions, hypothesis framing.',
  },
  {
    slot: 4,
    id: 'student-insight',
    name: 'Student Insight',
    emoji: '📊',
    color: '#34D399',
    availableTo: ['faculty'],
    purpose: 'Aggregate patterns of where students struggle in your subject',
    description: 'Anonymised, k=5 minimum. Never individual data.',
  },
  {
    slot: 5,
    id: 'question-paper',
    name: 'Question Paper',
    emoji: '📋',
    color: '#FB923C',
    availableTo: ['faculty'],
    purpose: 'Draft questions, MCQs, case studies conversationally',
    description: 'Chat here to draft. Hand off to the formal Question Paper page for export.',
  },
]

export function botsForRole(role: BotRole | 'student' | null | undefined): BotDefinition[] {
  return role === 'faculty' ? FACULTY_BOTS : BOTS
}
