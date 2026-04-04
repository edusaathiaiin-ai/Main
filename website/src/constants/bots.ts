export type BotDefinition = {
  slot: 1 | 2 | 3 | 4 | 5
  name: string
  availableTo: Array<'student' | 'faculty' | 'public' | 'institution'>
  purpose: string
}

export const BOTS: BotDefinition[] = [
  {
    slot: 1,
    name: 'Study Notes',
    availableTo: ['student', 'faculty'],
    purpose: 'Structured notes, syllabus-aware, saves to profile',
  },
  {
    slot: 2,
    name: 'Exam Prep',
    availableTo: ['student'],
    purpose: 'MCQ, past patterns, timed mock Q&A, weak area tracking',
  },
  {
    slot: 3,
    name: 'Interest Explorer',
    availableTo: ['student'],
    purpose: 'Driven by future_subjects + future_research_area',
  },
  {
    slot: 4,
    name: 'UPSC Saathi',
    availableTo: ['student'],
    purpose: 'UPSC optional prep, RSS-aware, answer writing',
  },
  {
    slot: 5,
    name: 'Citizen Guide',
    availableTo: ['student', 'faculty', 'public', 'institution'],
    purpose: 'Plain-language explainer, jargon-free always',
  },
]
