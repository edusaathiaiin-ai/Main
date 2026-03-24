/**
 * lib/instantSoulCalibration.ts
 *
 * Runs ONCE at profile creation.
 * Sets correct soul defaults so the bot is RIGHT from message 1.
 *
 * Pure TypeScript — no React, no Deno, no side effects.
 * Imported by web onboarding (Next.js) and copied inline to Edge Functions.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type AcademicLevel =
  | 'diploma'
  | 'bachelor'
  | 'masters'
  | 'phd'
  | 'professional'
  | 'postdoc'
  | 'competitive'
  | 'professional_learner'
  | 'exploring';

export type FlameStage = 'cold' | 'spark' | 'flame' | 'fire' | 'wings';
export type CareerDiscoveryStage = 'unaware' | 'exploring' | 'interested' | 'committed';
export type AmbitionLevel = 'low' | 'medium' | 'high' | 'very_high';

export type InstantCalibration = {
  depth_calibration: number;           // 0–100 complexity score
  peer_mode: boolean;                  // true for PhD/postdoc
  exam_mode: boolean;                  // true for competitive exam students
  ambition_level: AmbitionLevel;
  flame_stage: FlameStage;
  career_discovery_stage: CareerDiscoveryStage;
  prior_knowledge_base: string[];
};

export type CalibrationParams = {
  academicLevel: AcademicLevel;
  currentYear: number | null;
  totalYears: number | null;
  examTarget: string | null;
  previousDegree: string | null;
};

// ── Bachelor depth by year progress ──────────────────────────────────────────

function computeBachelorDepth(year: number | null, total: number | null): number {
  if (!year || !total || total === 0) return 40;
  const progress = year / total;
  if (progress <= 0.25) return 25;   // 1st year — just arrived
  if (progress <= 0.50) return 38;   // 2nd year — foundations solidifying
  if (progress <= 0.75) return 50;   // 3rd year — building fluency
  return 60;                         // final year — ready for depth
}

// ── Calibration maps ──────────────────────────────────────────────────────────

const DEPTH_MAP: Record<AcademicLevel, number | null> = {
  diploma:             25,
  bachelor:            null,   // computed from year/total
  masters:             70,
  phd:                 88,
  professional:        55,
  postdoc:             92,
  competitive:         50,
  professional_learner: 60,
  exploring:           30,
};

const AMBITION_MAP: Record<AcademicLevel, AmbitionLevel> = {
  diploma:             'medium',
  bachelor:            'medium',
  masters:             'high',
  phd:                 'very_high',
  professional:        'high',
  postdoc:             'very_high',
  competitive:         'high',
  professional_learner: 'medium',
  exploring:           'low',
};

const FLAME_MAP: Record<AcademicLevel, FlameStage> = {
  diploma:             'cold',
  bachelor:            'cold',      // discover over time
  masters:             'flame',     // already committed to specialisation
  phd:                 'fire',      // definitely on fire
  professional:        'flame',
  postdoc:             'wings',     // already flying
  competitive:         'flame',     // committed to exam
  professional_learner: 'spark',
  exploring:           'cold',
};

const DISCOVERY_MAP: Record<AcademicLevel, CareerDiscoveryStage> = {
  diploma:             'unaware',
  bachelor:            'unaware',
  masters:             'interested',   // chose specialisation deliberately
  phd:                 'committed',    // research direction set
  professional:        'interested',
  postdoc:             'committed',
  competitive:         'committed',    // exam is the goal
  professional_learner: 'exploring',
  exploring:           'unaware',
};

const HIGH_AMBITION_EXAMS = new Set(['UPSC', 'GATE', 'NEET', 'CA', 'CLAT', 'NET', 'Bar Exam']);

// ── Main export ───────────────────────────────────────────────────────────────

export function instantCalibrate(params: CalibrationParams): InstantCalibration {
  const { academicLevel, currentYear, totalYears, examTarget, previousDegree } = params;

  // Depth
  const rawDepth = DEPTH_MAP[academicLevel];
  const depth_calibration =
    rawDepth !== null
      ? rawDepth
      : computeBachelorDepth(currentYear, totalYears);

  // Exam mode — either competitive level OR exam target is a high-stakes exam
  const exam_mode =
    academicLevel === 'competitive' ||
    (examTarget !== null && HIGH_AMBITION_EXAMS.has(examTarget));

  // Boost ambition if high-stakes exam
  const base_ambition = AMBITION_MAP[academicLevel] ?? 'medium';
  const ambition_level: AmbitionLevel =
    exam_mode && base_ambition === 'medium' ? 'high' : base_ambition;

  // Prior knowledge from previous degree
  const prior_knowledge_base: string[] = [];
  if (previousDegree?.trim()) {
    prior_knowledge_base.push(previousDegree.trim());
  }
  if (academicLevel === 'masters' || academicLevel === 'phd' || academicLevel === 'postdoc') {
    prior_knowledge_base.push('undergraduate fundamentals');
  }
  if (academicLevel === 'postdoc') {
    prior_knowledge_base.push('doctoral research methodology');
  }

  return {
    depth_calibration,
    peer_mode: academicLevel === 'phd' || academicLevel === 'postdoc',
    exam_mode,
    ambition_level,
    flame_stage:            FLAME_MAP[academicLevel] ?? 'cold',
    career_discovery_stage: DISCOVERY_MAP[academicLevel] ?? 'unaware',
    prior_knowledge_base,
  };
}

// ── UI helper — total years per level ────────────────────────────────────────

export const LEVEL_TOTAL_YEARS: Record<AcademicLevel, number> = {
  diploma:             3,
  bachelor:            4,   // default; 5 for MBBS/B.Arch/LLB
  masters:             2,
  phd:                 5,
  professional:        5,
  postdoc:             3,
  competitive:         2,
  professional_learner: 1,
  exploring:           1,
};

// ── Card definitions for onboarding UI ───────────────────────────────────────

export type AcademicLevelCard = {
  id: AcademicLevel;
  emoji: string;
  title: string;
  subtitle: string;
  durationHint: string;
  color: string;
  yearQuestion: string | null;
  yearOptions: string[];
  mapToRole: 'student' | 'public';
};

export const ACADEMIC_LEVEL_CARDS: AcademicLevelCard[] = [
  {
    id: 'diploma',
    emoji: '📜',
    title: 'Diploma / Certificate',
    subtitle: 'Polytechnic, ITI, skill certificate',
    durationHint: '1–3 years',
    color: '#0891B2',
    yearQuestion: 'Which year are you in?',
    yearOptions: ['1st Year', '2nd Year', '3rd Year', 'Final Year'],
    mapToRole: 'student',
  },
  {
    id: 'bachelor',
    emoji: '🎓',
    title: "Bachelor's Degree",
    subtitle: 'B.Tech, MBBS, LLB, B.Sc, B.Com, BBA…',
    durationHint: '3–5 years',
    color: '#4F46E5',
    yearQuestion: 'Which year are you in?',
    yearOptions: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year / Final'],
    mapToRole: 'student',
  },
  {
    id: 'masters',
    emoji: '🔬',
    title: "Master's Degree",
    subtitle: 'M.Tech, MBA, M.Sc, LLM, M.Com, MCA…',
    durationHint: '1–3 years',
    color: '#7C3AED',
    yearQuestion: 'Which year?',
    yearOptions: ['1st Year', '2nd Year', '3rd Year / Final'],
    mapToRole: 'student',
  },
  {
    id: 'phd',
    emoji: '🧪',
    title: 'PhD / Doctorate',
    subtitle: 'Doctoral research, thesis work',
    durationHint: '3–7 years',
    color: '#BE185D',
    yearQuestion: 'Which year of PhD?',
    yearOptions: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year +'],
    mapToRole: 'student',
  },
  {
    id: 'professional',
    emoji: '⚕️',
    title: 'Professional Programme',
    subtitle: 'MBBS, LLB, CA, CS, ICWA, B.Arch…',
    durationHint: '3–7 years',
    color: '#059669',
    yearQuestion: 'Which stage?',
    yearOptions: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year +', 'Internship'],
    mapToRole: 'student',
  },
  {
    id: 'competitive',
    emoji: '📖',
    title: 'Competitive Exam Prep',
    subtitle: 'UPSC, GATE, NEET, CA, CLAT, NET…',
    durationHint: 'Full-time preparation',
    color: '#D97706',
    yearQuestion: 'Which exam are you targeting?',
    yearOptions: ['UPSC', 'GATE', 'NEET PG', 'NEET UG', 'CA Final', 'CLAT', 'NET/SET', 'JEE', 'Bar Exam', 'Other'],
    mapToRole: 'student',
  },
  {
    id: 'professional_learner',
    emoji: '💼',
    title: 'Working Professional',
    subtitle: 'Upskilling while working',
    durationHint: 'Executive / part-time study',
    color: '#0F766E',
    yearQuestion: null,
    yearOptions: [],
    mapToRole: 'student',
  },
  {
    id: 'exploring',
    emoji: '🌱',
    title: 'Just Exploring',
    subtitle: 'Curious learner, no current enrolment',
    durationHint: 'At your own pace',
    color: '#65A30D',
    yearQuestion: null,
    yearOptions: [],
    mapToRole: 'public',
  },
];
