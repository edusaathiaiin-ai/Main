export type BotDefinition = {
  slot: 1 | 2 | 3 | 4 | 5
  name: string
  emoji: string
  color: string           // vivid accent for icon tint / active ring
  availableTo: Array<'student' | 'faculty' | 'public' | 'institution'>
  purpose: string
}

export const BOTS: BotDefinition[] = [
  {
    slot: 1,
    name: 'Study Notes',
    emoji: '📘',
    color: '#38BDF8',     // sky blue
    availableTo: ['student', 'faculty'],
    purpose: 'Structured notes, syllabus-aware, saves to profile',
  },
  {
    slot: 2,
    name: 'Exam Prep',
    emoji: '⚡',
    color: '#FBBF24',     // vivid amber
    availableTo: ['student'],
    purpose: 'MCQ, past patterns, timed mock Q&A, weak area tracking',
  },
  {
    slot: 3,
    name: 'Interest Explorer',
    emoji: '🔭',
    color: '#A78BFA',     // violet
    availableTo: ['student'],
    purpose: 'Driven by future_subjects + future_research_area',
  },
  {
    slot: 4,
    name: 'UPSC Saathi',
    emoji: '🏛️',
    color: '#34D399',     // emerald
    availableTo: ['student'],
    purpose: 'UPSC optional prep, RSS-aware, answer writing',
  },
  {
    slot: 5,
    name: 'Citizen Guide',
    emoji: '🧭',
    color: '#FB923C',     // orange
    availableTo: ['student', 'faculty', 'public', 'institution'],
    purpose: 'Plain-language explainer, jargon-free always',
  },
]
