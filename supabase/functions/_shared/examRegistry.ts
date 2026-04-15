// Mirror of website/src/constants/exams.ts for Edge Functions.
// Edge Functions cannot import from the Next app — keep ids in sync
// when the canonical registry changes. Slim shape: only what the chat
// system prompt + classifier need.

export type EdgeExamEntry = {
  id:               string
  name:             string
  full_name:        string
  next_date:        string         // ISO 'YYYY-MM-DD'
  syllabus_topics:  string[]
}

export const EXAM_REGISTRY: ReadonlyArray<EdgeExamEntry> = [
  {
    id: 'cat',
    name: 'CAT',
    full_name: 'Common Admission Test',
    next_date: '2026-11-29',
    syllabus_topics: [
      'Quantitative Aptitude', 'Data Interpretation', 'Logical Reasoning',
      'Verbal Ability', 'Reading Comprehension', 'Number Systems',
      'Geometry & Mensuration', 'Algebra', 'Arithmetic', 'Paragraph Summary',
    ],
  },
  {
    id: 'clat',
    name: 'CLAT',
    full_name: 'Common Law Admission Test',
    next_date: '2026-12-01',
    syllabus_topics: [
      'English Language', 'Current Affairs & GK', 'Legal Reasoning',
      'Logical Reasoning', 'Quantitative Techniques', 'Constitutional Law Basics',
      'Contract Law Basics', 'Comprehension Passages', 'Fact Inference Judgment',
      'Critical Reasoning',
    ],
  },
  {
    id: 'neet_ug',
    name: 'NEET UG',
    full_name: 'National Eligibility Entrance Test (Undergraduate)',
    next_date: '2026-05-03',
    syllabus_topics: [
      'Physics — Mechanics', 'Physics — Thermodynamics', 'Physics — Optics & Modern Physics',
      'Chemistry — Physical Chemistry', 'Chemistry — Organic Chemistry', 'Chemistry — Inorganic Chemistry',
      'Biology — Cell Biology', 'Biology — Genetics & Evolution', 'Biology — Human Physiology',
      'Biology — Ecology',
    ],
  },
  {
    id: 'neet_pg',
    name: 'NEET PG',
    full_name: 'National Eligibility Entrance Test (Postgraduate)',
    next_date: '2026-03-15',
    syllabus_topics: [
      'Medicine & Allied Specialties', 'Surgery & Allied Specialties',
      'Obstetrics & Gynaecology', 'Paediatrics', 'Preventive & Social Medicine',
      'Pharmacology', 'Pathology', 'Microbiology', 'Anatomy', 'Physiology',
    ],
  },
  {
    id: 'jee_main',
    name: 'JEE Main',
    full_name: 'Joint Entrance Examination Main',
    next_date: '2027-01-20',
    syllabus_topics: [
      'Physics — Mechanics', 'Physics — Electricity & Magnetism', 'Physics — Modern Physics',
      'Chemistry — Physical Chemistry', 'Chemistry — Organic Chemistry', 'Chemistry — Inorganic Chemistry',
      'Mathematics — Calculus', 'Mathematics — Algebra', 'Mathematics — Coordinate Geometry',
      'Mathematics — Trigonometry',
    ],
  },
  {
    id: 'jee_advanced',
    name: 'JEE Advanced',
    full_name: 'Joint Entrance Examination Advanced',
    next_date: '2026-05-24',
    syllabus_topics: [
      'Physics — Mechanics & Waves', 'Physics — Optics & Modern Physics',
      'Physics — Electricity & Magnetism', 'Chemistry — Physical Chemistry',
      'Chemistry — Organic Reactions', 'Chemistry — Inorganic Chemistry',
      'Mathematics — Calculus & Differential Equations', 'Mathematics — Algebra & Matrices',
      'Mathematics — Coordinate Geometry', 'Mathematics — Probability & Statistics',
    ],
  },
  {
    id: 'gate',
    name: 'GATE',
    full_name: 'Graduate Aptitude Test in Engineering',
    next_date: '2027-02-07',
    syllabus_topics: [
      'Engineering Mathematics', 'General Aptitude', 'Core Subject Paper 1',
      'Core Subject Paper 2', 'Thermodynamics', 'Fluid Mechanics',
      'Strength of Materials', 'Control Systems', 'Digital Electronics',
      'Data Structures & Algorithms',
    ],
  },
  {
    id: 'upsc_prelims',
    name: 'UPSC Prelims',
    full_name: 'UPSC Civil Services Preliminary Examination',
    next_date: '2026-06-07',
    syllabus_topics: [
      'Indian History & Culture', 'Indian & World Geography', 'Indian Polity & Governance',
      'Indian Economy', 'Environment & Ecology', 'Science & Technology',
      'Current Affairs', 'General Science', 'CSAT — Comprehension',
      'CSAT — Logical Reasoning & Maths',
    ],
  },
  {
    id: 'upsc_mains',
    name: 'UPSC Mains',
    full_name: 'UPSC Civil Services Main Examination',
    next_date: '2026-09-20',
    syllabus_topics: [
      'Essay Paper', 'General Studies 1 — History & Society',
      'General Studies 2 — Governance & IR', 'General Studies 3 — Economy & Environment',
      'General Studies 4 — Ethics', 'Optional Paper 1', 'Optional Paper 2',
      'Indian Language Paper', 'English Paper', 'Answer Writing Practice',
    ],
  },
  {
    id: 'ssc_cgl',
    name: 'SSC CGL',
    full_name: 'Staff Selection Commission Combined Graduate Level',
    next_date: '2026-09-01',
    syllabus_topics: [
      'Quantitative Aptitude', 'English Language', 'General Intelligence & Reasoning',
      'General Awareness', 'Statistics', 'General Studies — Finance',
      'Data Analysis', 'Arithmetic', 'Geometry', 'Algebra',
    ],
  },
  {
    id: 'ca_foundation',
    name: 'CA Foundation',
    full_name: 'Chartered Accountancy Foundation Examination',
    next_date: '2026-05-15',
    syllabus_topics: [
      'Principles & Practice of Accounting', 'Business Laws',
      'Business Correspondence & Reporting', 'Business Mathematics',
      'Logical Reasoning & Statistics', 'Business Economics',
      'Business & Commercial Knowledge', 'Journal & Ledger',
      'Partnership Accounts', 'Company Accounts',
    ],
  },
  {
    id: 'ugc_net',
    name: 'UGC NET',
    full_name: 'University Grants Commission National Eligibility Test',
    next_date: '2026-06-15',
    syllabus_topics: [
      'Teaching & Research Aptitude', 'Reasoning Ability', 'Comprehension',
      'Divergent Thinking', 'Communication', 'ICT in Education',
      'People & Environment', 'Higher Education System',
      'Subject Paper — Core Topics', 'Research Methodology',
    ],
  },
  {
    id: 'gre',
    name: 'GRE',
    full_name: 'Graduate Record Examination',
    next_date: '2026-12-31',
    syllabus_topics: [
      'Verbal Reasoning', 'Quantitative Reasoning', 'Analytical Writing',
      'Vocabulary in Context', 'Reading Comprehension', 'Text Completion',
      'Sentence Equivalence', 'Arithmetic & Algebra', 'Geometry & Data Analysis',
      'Issue & Argument Essays',
    ],
  },
  {
    id: 'gmat',
    name: 'GMAT',
    full_name: 'Graduate Management Admission Test',
    next_date: '2026-12-31',
    syllabus_topics: [
      'Quantitative Reasoning', 'Verbal Reasoning', 'Data Insights',
      'Analytical Writing', 'Critical Reasoning', 'Reading Comprehension',
      'Sentence Correction', 'Data Sufficiency', 'Problem Solving',
      'Integrated Reasoning',
    ],
  },
  {
    id: 'fmge',
    name: 'FMGE',
    full_name: 'Foreign Medical Graduate Examination',
    next_date: '2026-06-20',
    syllabus_topics: [
      'Anatomy', 'Physiology', 'Biochemistry', 'Pharmacology', 'Pathology',
      'Microbiology', 'Medicine', 'Surgery', 'Obstetrics & Gynaecology',
      'Preventive & Social Medicine',
    ],
  },
];

export function getExamById(id: string): EdgeExamEntry | undefined {
  return EXAM_REGISTRY.find((e) => e.id === id);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export function daysUntilExam(examId: string, now: Date = new Date()): number | null {
  const exam = getExamById(examId);
  if (!exam) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(exam.next_date);
  if (!m) return null;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const today = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

export function humanizeTimeToGo(days: number): string {
  if (days < 0) return `${Math.abs(days)} days past`;
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days <= 14) return `${days} days away`;
  if (days <= 60) return `${Math.round(days / 7)} weeks away`;
  const months = Math.round(days / 30);
  if (months === 1) return '1 month away';
  if (months <= 11) return `${months} months away`;
  return 'about a year away';
}

export type ExamPhase =
  | 'preparation' | 'final_revision' | 'exam_week' | 'exam_day' | 'past';

export function getExamPhase(examId: string, now: Date = new Date()): ExamPhase | null {
  const days = daysUntilExam(examId, now);
  if (days === null) return null;
  if (days < 0) return 'past';
  if (days === 0) return 'exam_day';
  if (days <= 7) return 'exam_week';
  if (days <= 30) return 'final_revision';
  return 'preparation';
}

// Build the # EXAM CONTEXT block injected into the chat system prompt.
// Returns empty string if student has no exam target or it's outside [1, 365].
export function buildExamContextBlock(
  examTargetId: string | null | undefined,
  topTopics: ReadonlyArray<string> | null | undefined,
  now: Date = new Date()
): string {
  if (!examTargetId) return '';
  const exam = getExamById(examTargetId);
  if (!exam) return '';
  const days = daysUntilExam(examTargetId, now);
  if (days === null || days < 1 || days > 365) return '';

  const phase = getExamPhase(examTargetId, now);
  const humanized = humanizeTimeToGo(days);

  const recent = (topTopics ?? [])
    .map((t) => t?.trim().toLowerCase())
    .filter((t): t is string => Boolean(t));
  const covered: string[] = [];
  const notTouched: string[] = [];
  for (const topic of exam.syllabus_topics) {
    const t = topic.toLowerCase();
    const hit = recent.some((s) => t.includes(s) || s.includes(t));
    if (hit) covered.push(topic); else notTouched.push(topic);
  }

  const coverageLine = covered.length > 0
    ? `Topics covered together so far: ${covered.slice(0, 5).join(', ')}.`
    : 'No syllabus topics have been touched together yet.';
  const gapLine = notTouched.length > 0
    ? `Syllabus areas not yet covered: ${notTouched.slice(0, 5).join(', ')}.`
    : 'Full syllabus has been touched at least once.';

  return `
# EXAM CONTEXT
The student is preparing for: ${exam.name} (${exam.full_name})
Days until exam: ${days} (${humanized}). Phase: ${phase}.
${coverageLine}
${gapLine}

Calibrate your guidance to this exam: when relevant, suggest syllabus
areas worth focusing on, reference time remaining, and naturally bridge
today's topic to exam preparation. Do not be preachy. Do not mention the
exam in every response — weave it in when the student's question opens
the door. The student wakes up thinking about this exam; honour that
without dwelling on the countdown.
`.trim();
}
