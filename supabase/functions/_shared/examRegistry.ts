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

// Derive sitting year from the registry's next_date — bump to the following
// year if next_date has already passed. Null if the id isn't in the registry.
export function inferExamYear(examId: string, now: Date = new Date()): number | null {
  const exam = getExamById(examId);
  if (!exam) return null;
  const examDate = new Date(exam.next_date + 'T00:00:00Z');
  return examDate.getTime() < now.getTime()
    ? examDate.getUTCFullYear() + 1
    : examDate.getUTCFullYear();
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Takes a date string directly (ISO YYYY-MM-DD). Mirrors the web util
// shape — callers resolve student-known date vs registry default before
// calling this. Returns null if the string is malformed.
export function daysUntilExam(examDate: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(examDate);
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
  | 'early'        // >180 days — build foundations
  | 'preparation'  // 90-180 days — structured study
  | 'intensive'    // 30-90 days — serious focus
  | 'final'        // 7-30 days — final stretch
  | 'exam_week'    // 1-7 days — trust preparation
  | 'exam_day'     // 0 days
  | 'past';        // negative days

export function getExamPhase(daysLeft: number): ExamPhase {
  if (daysLeft < 0)    return 'past';
  if (daysLeft === 0)  return 'exam_day';
  if (daysLeft <= 7)   return 'exam_week';
  if (daysLeft <= 30)  return 'final';
  if (daysLeft <= 90)  return 'intensive';
  if (daysLeft <= 180) return 'preparation';
  return 'early';
}

export function getTopicDelta(
  soulTopics: ReadonlyArray<string>,
  examTopics: ReadonlyArray<string>,
): { covered: string[]; notTouched: string[] } {
  const covered = examTopics.filter((t) =>
    soulTopics.some((s) =>
      s.toLowerCase().includes(t.toLowerCase().split(' ')[0]),
    ),
  );
  const notTouched = examTopics.filter((t) => !covered.includes(t));
  return { covered, notTouched };
}

// Build the # EXAM CONTEXT block injected into the chat system prompt.
// Gate: both exam_target_id AND exam_target_date required. Returns empty
// string otherwise, or when the resolved date is outside [1, 365] days.
export function buildExamContextBlock(
  examTargetId: string | null | undefined,
  examTargetDate: string | null | undefined,
  topTopics: ReadonlyArray<string> | null | undefined,
  now: Date = new Date()
): string {
  if (!examTargetId || !examTargetDate) return '';
  const exam = getExamById(examTargetId);
  if (!exam) return '';
  const daysLeft = daysUntilExam(examTargetDate, now);
  if (daysLeft === null || daysLeft < 1 || daysLeft > 365) return '';

  const phase = getExamPhase(daysLeft);
  const { covered, notTouched } = getTopicDelta(topTopics ?? [], exam.syllabus_topics);

  return `
# EXAM CONTEXT
Student is preparing for: ${exam.full_name} (${exam.name})
Days remaining: ${daysLeft}
Current phase: ${phase}
${covered.length > 0 ? `Topics covered so far: ${covered.slice(0, 3).join(', ')}` : 'No topics tracked yet'}
${notTouched.length > 0 ? `Topics not yet touched: ${notTouched.slice(0, 3).join(', ')}` : ''}

Weave exam awareness naturally into responses when relevant.
Prioritise high-yield topics for this phase.
If student drifts far off-topic, gently redirect.
Never be preachy about the exam — just aware.
`.trim();
}
