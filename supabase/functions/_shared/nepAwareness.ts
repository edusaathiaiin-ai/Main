/**
 * supabase/functions/_shared/nepAwareness.ts
 *
 * NEP 2020 (National Education Policy 2020) awareness block prepended to
 * every Saathi system prompt. NEP 2020 replaces the 1986 policy and
 * restructures Indian school + higher education completely. Every student
 * on EdUsaathiAI is affected by it, so every Saathi must be able to
 * answer questions about it confidently.
 *
 * Usage:
 *   import { NEP_2020_AWARENESS, getNepRelevance } from '../_shared/nepAwareness.ts';
 *   const nepBlock = `${NEP_2020_AWARENESS}\n\n${getNepRelevance(slug)}`;
 */

export const NEP_2020_AWARENESS = `
# NEP 2020 AWARENESS
You are aware of India's National Education Policy 2020 and its implications for students.

KEY FACTS you must know and reference when relevant:

SCHOOL STRUCTURE:
- New 5+3+3+4 structure replacing old 10+2
  - Foundational: ages 3-8 (3 years Anganwadi + Grades 1-2)
  - Preparatory: Grades 3-5 (ages 8-11)
  - Middle: Grades 6-8 (ages 11-14)
  - Secondary: Grades 9-12 (ages 14-18)
- No hard separation between arts/sciences/vocational streams
- Board exams redesigned — two attempts allowed per year
- Assessment moving from rote to competency-based

HIGHER EDUCATION:
- Multiple exit options from undergraduate programmes:
  - 1 year = Certificate
  - 2 years = Diploma
  - 3 years = Bachelor's Degree
  - 4 years = Bachelor's with Research (preferred)
- Academic Bank of Credits (ABC) — credits stored digitally, transferable across HEIs
- M.Phil discontinued
- PhD requires either Master's or 4-year Bachelor's with Research
- Multidisciplinary universities replacing single-stream institutions by 2040

EXAMS AND ASSESSMENT:
- NTA (National Testing Agency) — common entrance exams across subjects, offered twice yearly
- PARAKH — new National Assessment Centre replacing CBSE-only evaluation
- Board exams: students choose subjects, two attempts per year, testing conceptual understanding NOT rote
- Coaching culture being actively dismantled

VOCATIONAL EDUCATION:
- 50% of students to have vocational exposure by 2025
- Vocational subjects integrated from Grade 6 onwards
- 10-day bagless internship period in Grades 6-8 with local craftspeople

INDIAN KNOWLEDGE SYSTEMS:
- Traditional knowledge integrated across all subjects
- Sanskrit available at all levels
- Mother tongue as medium of instruction until Grade 5 (preferably Grade 8)
- Three-language formula with flexibility

TEACHER EDUCATION:
- 4-year integrated B.Ed. by 2030 as minimum qualification
- National Mission for Mentoring — retired faculty as mentors
- 50 hours CPD per year mandatory for teachers

RESEARCH:
- National Research Foundation (NRF) — competitive research funding across all disciplines
- Research culture to be built in all universities

EQUITY:
- Special Education Zones for disadvantaged areas
- Gender Inclusion Fund
- Scholarships via National Scholarship Portal
- GER target: 50% in higher education by 2035 (currently 26.3%)

WHEN TO REFERENCE NEP 2020:
- When a student asks about exam patterns, board exams, or entrance tests
- When discussing career pathways and degree options
- When a student is confused about stream choices (arts/science/commerce)
- When discussing vocational education or skill development
- When a student asks about credit transfer between colleges
- When discussing research opportunities as an undergraduate
- When a student feels trapped in a stream — NEP gives flexibility to cross streams
- When discussing medium of instruction or language of learning

IMPORTANT CAVEAT TO ALWAYS ADD:
NEP 2020 is being implemented in phases. Not all provisions are live yet. Always advise students to check with their specific State/Board/University for current implementation status in their region.
`.trim();

// ── Condensed version (WhatsApp / token-budget surfaces) ────────────────────
// WhatsApp responses are capped at ~250 words; the full NEP block would
// dominate the system prompt token budget. This stays under ~120 words and
// covers the highest-leverage facts students ask about on WhatsApp.

export const NEP_2020_CONDENSED = `
# NEP 2020 KEY FACTS (condensed for WhatsApp)
India's NEP 2020 key changes students should know:
- New 5+3+3+4 school structure
- Multiple exit options: 1yr certificate, 2yr diploma, 3yr degree, 4yr degree with research
- Academic Bank of Credits — transfer credits between colleges
- Board exams: two attempts per year, competency-based not rote
- NTA common entrance exams replacing individual college exams
- No hard separation between arts/science/commerce streams
- 50% students to have vocational exposure by 2025
- PhD needs Master's OR 4-year Bachelor's with Research (M.Phil discontinued)
Always add: 'Check your State/Board for current implementation status.'
`.trim();

// ── Per-Saathi relevance ─────────────────────────────────────────────────────
// Each Saathi gets a short addendum appended to the universal block,
// highlighting the NEP provisions most relevant to its discipline.

const NEP_RELEVANCE_KANOON = `
SAATHI-SPECIFIC NEP RELEVANCE (KanoonSaathi):
- Legal education must become globally competitive per NEP
- Bilingual legal education (English + State language) to be offered
- Law integrated with social sciences and humanities
`.trim();

const NEP_RELEVANCE_MEDICAL = `
SAATHI-SPECIFIC NEP RELEVANCE (MedicoSaathi / PharmaSaathi / NursingSaathi):
- Integrative healthcare education — allopathic students must understand AYUSH basics
- Greater emphasis on preventive healthcare and community medicine
- Healthcare education restructured to match role requirements
`.trim();

const NEP_RELEVANCE_STEM = `
SAATHI-SPECIFIC NEP RELEVANCE (STEM Saathis):
- Mathematics and computational thinking given increased emphasis from foundational stage
- Coding introduced from Middle Stage (Grade 6)
- AI, ML, data science to be offered in undergraduate programmes
- IITs moving towards holistic multidisciplinary education
`.trim();

const NEP_RELEVANCE_AGRI = `
SAATHI-SPECIFIC NEP RELEVANCE (AgriSaathi):
- Agricultural education revival — less than 1% enrollment despite 9% of universities being agriculture
- Agricultural Technology Parks for incubation
- Local and traditional farming knowledge integrated
`.trim();

const NEP_RELEVANCE_COMMERCE = `
SAATHI-SPECIFIC NEP RELEVANCE (Commerce/Management Saathis):
- Vocational education integrated with mainstream — B.Voc degrees continuing
- Academic Bank of Credits allows mixing vocational and academic credits
- Multidisciplinary approach breaking arts/commerce/science silos
`.trim();

const NEP_RELEVANCE_HUMANITIES = `
SAATHI-SPECIFIC NEP RELEVANCE (Humanities/Social Science Saathis):
- Arts and humanities getting more emphasis — India moving to developed country status
- STEM education to integrate more humanities and social sciences
- Holistic education explicitly endorsed in NEP
`.trim();

const NEP_RELEVANCE_MULTIDISCIPLINARY = `
SAATHI-SPECIFIC NEP RELEVANCE:
- NEP 2020 explicitly endorses holistic, multidisciplinary education
- Multidisciplinary universities replacing single-stream institutions by 2040
- Academic Bank of Credits allows credits from different disciplines to be combined
`.trim();

// Slug → relevance block. Unknown slugs fall back to multidisciplinary.
// Slugs must match canonical SAATHIS list (see website/src/constants/saathis.ts).
const SLUG_TO_RELEVANCE: Record<string, string> = {
  // Legal
  kanoonsaathi: NEP_RELEVANCE_KANOON,

  // Medical
  medicosaathi: NEP_RELEVANCE_MEDICAL,
  pharmasaathi: NEP_RELEVANCE_MEDICAL,
  nursingsaathi: NEP_RELEVANCE_MEDICAL,

  // STEM (13 Saathis) — AgriSaathi gets its own block below
  biosaathi: NEP_RELEVANCE_STEM,
  biotechsaathi: NEP_RELEVANCE_STEM,
  physicsaathi: NEP_RELEVANCE_STEM,
  chemsaathi: NEP_RELEVANCE_STEM,
  maathsaathi: NEP_RELEVANCE_STEM,
  compsaathi: NEP_RELEVANCE_STEM,
  mechsaathi: NEP_RELEVANCE_STEM,
  civilsaathi: NEP_RELEVANCE_STEM,
  aerospacesaathi: NEP_RELEVANCE_STEM,
  elecsaathi: NEP_RELEVANCE_STEM,
  electronicssaathi: NEP_RELEVANCE_STEM,
  'chemengg-saathi': NEP_RELEVANCE_STEM,
  envirosaathi: NEP_RELEVANCE_STEM,

  // Agriculture
  agrisaathi: NEP_RELEVANCE_AGRI,

  // Commerce / Management
  econsaathi: NEP_RELEVANCE_COMMERCE,
  accountsaathi: NEP_RELEVANCE_COMMERCE,
  finsaathi: NEP_RELEVANCE_COMMERCE,
  bizsaathi: NEP_RELEVANCE_COMMERCE,
  mktsaathi: NEP_RELEVANCE_COMMERCE,
  hrsaathi: NEP_RELEVANCE_COMMERCE,
  statssaathi: NEP_RELEVANCE_COMMERCE,

  // Humanities / Social Science
  historysaathi: NEP_RELEVANCE_HUMANITIES,
  psychsaathi: NEP_RELEVANCE_HUMANITIES,
  polscisaathi: NEP_RELEVANCE_HUMANITIES,
  geosaathi: NEP_RELEVANCE_HUMANITIES,

  // Multidisciplinary (design / planning)
  archsaathi: NEP_RELEVANCE_MULTIDISCIPLINARY,
};

export function getNepRelevance(saathiSlug: string): string {
  return SLUG_TO_RELEVANCE[saathiSlug] ?? NEP_RELEVANCE_MULTIDISCIPLINARY;
}
