// seed-aicte-mech-auto.mjs
// One-shot idempotent seeder for AICTE Mechatronics + Automobile Engineering
// B.Tech curriculum into `university_syllabi`.
//
// Why this script exists:
//   Per user directive (April 2026), branches multiply but Saathis stay at 30.
//   Mechatronics + Automobile both map to MechSaathi. The student-facing
//   effect: a Mechatronics student at any non-seeded university now gets real
//   subject context (not just a Saathi match + manual entry).
//
// Accuracy note:
//   These are AICTE-aligned model curricula based on the 2018 AICTE Model
//   Curriculum + standard industry branch breakdowns. Paper codes and
//   credit weights follow AICTE conventions but should be reviewed by a
//   subject-matter faculty before treating as authoritative. The
//   student-facing flow (subject chips in AcademicJourneyStep) lets the
//   student deselect any paper they don't actually study.
//
// Idempotent: deletes all AICTE rows for these two specialisations first,
// then re-inserts. Safe to re-run after tweaks. Does NOT touch rows for
// other specialisations or other universities.
//
// Run:  node scripts/seed-aicte-mech-auto.mjs
import { readFileSync } from 'fs';

function loadEnv() {
  const candidates = ['.env.local', 'website/.env.local', '../.env.local', 'admin/.env.local', '.env'];
  for (const path of candidates) {
    try {
      const parsed = Object.fromEntries(
        readFileSync(path, 'utf8').split('\n')
          .filter(l => l && !l.startsWith('#') && l.includes('='))
          .map(l => {
            const idx = l.indexOf('=');
            return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^["']|["']$/g, '')];
          })
      );
      if (parsed.SUPABASE_SERVICE_ROLE_KEY) return { ...process.env, ...parsed };
    } catch { /* try next */ }
  }
  return { ...process.env };
}

const env = loadEnv();
const url = env.SUPABASE_PROJECT_URL || env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_PROJECT_URL (or SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

// Year-1 common core — identical for both Mechatronics and Automobile.
const COMMON_YEAR1 = [
  { year: 1, semester: 1, paper_code: 'BS-MATH-101', paper_name: 'Engineering Mathematics I', paper_type: 'core', credits: 4 },
  { year: 1, semester: 1, paper_code: 'BS-PHY-101',  paper_name: 'Engineering Physics', paper_type: 'core', credits: 4 },
  { year: 1, semester: 1, paper_code: 'ES-EEE-101',  paper_name: 'Basic Electrical Engineering', paper_type: 'core', credits: 3 },
  { year: 1, semester: 1, paper_code: 'ES-CSE-101',  paper_name: 'Programming for Problem Solving', paper_type: 'core', credits: 3 },
  { year: 1, semester: 1, paper_code: 'HS-ENG-101',  paper_name: 'Communication Skills in English', paper_type: 'core', credits: 2 },
  { year: 1, semester: 1, paper_code: 'ES-EGD-101',  paper_name: 'Engineering Graphics and Design', paper_type: 'core', credits: 3 },
  { year: 1, semester: 2, paper_code: 'BS-MATH-102', paper_name: 'Engineering Mathematics II', paper_type: 'core', credits: 4 },
  { year: 1, semester: 2, paper_code: 'BS-CHE-101',  paper_name: 'Engineering Chemistry', paper_type: 'core', credits: 4 },
  { year: 1, semester: 2, paper_code: 'ES-MEC-101',  paper_name: 'Engineering Mechanics', paper_type: 'core', credits: 3 },
  { year: 1, semester: 2, paper_code: 'ES-MFG-101',  paper_name: 'Workshop Practice', paper_type: 'core', credits: 2 },
  { year: 1, semester: 2, paper_code: 'MC-ENV-101',  paper_name: 'Environmental Sciences', paper_type: 'core', credits: 2 },
  { year: 1, semester: 2, paper_code: 'HS-UNH-101',  paper_name: 'Universal Human Values', paper_type: 'core', credits: 2 },
];

const MECHATRONICS = [
  ...COMMON_YEAR1,
  // Semester 3
  { year: 2, semester: 3, paper_code: 'BS-MATH-201', paper_name: 'Engineering Mathematics III (Transforms & Probability)', paper_type: 'core', credits: 3 },
  { year: 2, semester: 3, paper_code: 'PC-MEC-201',  paper_name: 'Mechanics of Solids', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-MEC-202',  paper_name: 'Thermodynamics', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-ECE-201',  paper_name: 'Electronic Devices and Circuits', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-ECE-202',  paper_name: 'Digital Electronics and Logic Design', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-MEC-203',  paper_name: 'Manufacturing Processes', paper_type: 'core', credits: 3 },
  // Semester 4
  { year: 2, semester: 4, paper_code: 'PC-MEC-204',  paper_name: 'Fluid Mechanics and Machinery', paper_type: 'core', credits: 3 },
  { year: 2, semester: 4, paper_code: 'PC-MTR-201',  paper_name: 'Sensors and Transducers', paper_type: 'core', credits: 4 },
  { year: 2, semester: 4, paper_code: 'PC-ECE-203',  paper_name: 'Signals and Systems', paper_type: 'core', credits: 4 },
  { year: 2, semester: 4, paper_code: 'PC-MTR-202',  paper_name: 'Machine Design I', paper_type: 'core', credits: 3 },
  { year: 2, semester: 4, paper_code: 'PC-MEC-205',  paper_name: 'Materials Science and Engineering', paper_type: 'core', credits: 3 },
  { year: 2, semester: 4, paper_code: 'PC-MTR-203',  paper_name: 'Mechatronics Fundamentals', paper_type: 'core', credits: 3 },
  // Semester 5
  { year: 3, semester: 5, paper_code: 'PC-MTR-301',  paper_name: 'Control Systems', paper_type: 'core', credits: 4 },
  { year: 3, semester: 5, paper_code: 'PC-MTR-302',  paper_name: 'Microprocessors and Microcontrollers', paper_type: 'core', credits: 4 },
  { year: 3, semester: 5, paper_code: 'PC-MTR-303',  paper_name: 'Hydraulics and Pneumatics', paper_type: 'core', credits: 3 },
  { year: 3, semester: 5, paper_code: 'PC-MTR-304',  paper_name: 'CNC Technology and Programming', paper_type: 'core', credits: 3 },
  { year: 3, semester: 5, paper_code: 'PC-MTR-305',  paper_name: 'Industrial Electronics and Drives', paper_type: 'core', credits: 3 },
  { year: 3, semester: 5, paper_code: 'OE-MTR-301',  paper_name: 'Open Elective I', paper_type: 'elective', credits: 3 },
  // Semester 6
  { year: 3, semester: 6, paper_code: 'PC-MTR-306',  paper_name: 'Robotics and Automation', paper_type: 'core', credits: 4 },
  { year: 3, semester: 6, paper_code: 'PC-MTR-307',  paper_name: 'Embedded Systems Design', paper_type: 'core', credits: 4 },
  { year: 3, semester: 6, paper_code: 'PC-MTR-308',  paper_name: 'PLC and SCADA Systems', paper_type: 'core', credits: 3 },
  { year: 3, semester: 6, paper_code: 'PC-MTR-309',  paper_name: 'Mechatronic System Design', paper_type: 'core', credits: 3 },
  { year: 3, semester: 6, paper_code: 'PE-MTR-301',  paper_name: 'Professional Elective I', paper_type: 'elective', credits: 3 },
  { year: 3, semester: 6, paper_code: 'OE-MTR-302',  paper_name: 'Open Elective II', paper_type: 'elective', credits: 3 },
  // Semester 7
  { year: 4, semester: 7, paper_code: 'PC-MTR-401',  paper_name: 'Industrial Internet of Things (IIoT)', paper_type: 'core', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PC-MTR-402',  paper_name: 'AI and Machine Learning for Engineers', paper_type: 'core', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PC-MTR-403',  paper_name: 'Industrial Automation and Control', paper_type: 'core', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PE-MTR-401',  paper_name: 'Mobile Robotics', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PE-MTR-402',  paper_name: 'MEMS and Micro-manufacturing', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PR-MTR-401',  paper_name: 'Project Phase I', paper_type: 'core', credits: 4 },
  // Semester 8
  { year: 4, semester: 8, paper_code: 'PC-MTR-404',  paper_name: 'Automotive Mechatronics', paper_type: 'core', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PC-MTR-405',  paper_name: 'Quality Engineering and Management', paper_type: 'core', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PE-MTR-403',  paper_name: 'Biomedical Instrumentation', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PE-MTR-404',  paper_name: 'Smart Materials and Structures', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PR-MTR-402',  paper_name: 'Project Phase II', paper_type: 'core', credits: 6 },
  { year: 4, semester: 8, paper_code: 'PR-MTR-403',  paper_name: 'Internship', paper_type: 'core', credits: 2 },
];

const AUTOMOBILE = [
  ...COMMON_YEAR1,
  // Semester 3
  { year: 2, semester: 3, paper_code: 'BS-MATH-201', paper_name: 'Engineering Mathematics III', paper_type: 'core', credits: 3 },
  { year: 2, semester: 3, paper_code: 'PC-MEC-201',  paper_name: 'Mechanics of Solids', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-MEC-202',  paper_name: 'Thermodynamics', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-MEC-203',  paper_name: 'Manufacturing Processes', paper_type: 'core', credits: 3 },
  { year: 2, semester: 3, paper_code: 'PC-AUT-201',  paper_name: 'Internal Combustion Engines I', paper_type: 'core', credits: 4 },
  { year: 2, semester: 3, paper_code: 'PC-AUT-202',  paper_name: 'Basic Electronics for Automobile', paper_type: 'core', credits: 3 },
  // Semester 4
  { year: 2, semester: 4, paper_code: 'PC-MEC-204',  paper_name: 'Fluid Mechanics and Machinery', paper_type: 'core', credits: 3 },
  { year: 2, semester: 4, paper_code: 'PC-MEC-205',  paper_name: 'Materials Science and Engineering', paper_type: 'core', credits: 3 },
  { year: 2, semester: 4, paper_code: 'PC-AUT-203',  paper_name: 'Internal Combustion Engines II', paper_type: 'core', credits: 4 },
  { year: 2, semester: 4, paper_code: 'PC-AUT-204',  paper_name: 'Machine Drawing and Automotive Graphics', paper_type: 'core', credits: 3 },
  { year: 2, semester: 4, paper_code: 'PC-AUT-205',  paper_name: 'Theory of Machines', paper_type: 'core', credits: 4 },
  { year: 2, semester: 4, paper_code: 'PC-AUT-206',  paper_name: 'Heat Transfer', paper_type: 'core', credits: 3 },
  // Semester 5
  { year: 3, semester: 5, paper_code: 'PC-AUT-301',  paper_name: 'Automotive Chassis and Suspension', paper_type: 'core', credits: 4 },
  { year: 3, semester: 5, paper_code: 'PC-AUT-302',  paper_name: 'Automotive Transmission Systems', paper_type: 'core', credits: 4 },
  { year: 3, semester: 5, paper_code: 'PC-AUT-303',  paper_name: 'Vehicle Body Engineering', paper_type: 'core', credits: 3 },
  { year: 3, semester: 5, paper_code: 'PC-AUT-304',  paper_name: 'Automotive Electrical and Electronics', paper_type: 'core', credits: 4 },
  { year: 3, semester: 5, paper_code: 'PC-AUT-305',  paper_name: 'Automobile Fuels and Lubricants', paper_type: 'core', credits: 3 },
  { year: 3, semester: 5, paper_code: 'OE-AUT-301',  paper_name: 'Open Elective I', paper_type: 'elective', credits: 3 },
  // Semester 6
  { year: 3, semester: 6, paper_code: 'PC-AUT-306',  paper_name: 'Vehicle Dynamics', paper_type: 'core', credits: 4 },
  { year: 3, semester: 6, paper_code: 'PC-AUT-307',  paper_name: 'Automotive Pollution and Emission Control', paper_type: 'core', credits: 3 },
  { year: 3, semester: 6, paper_code: 'PC-AUT-308',  paper_name: 'CAD/CAM for Automotive Design', paper_type: 'core', credits: 3 },
  { year: 3, semester: 6, paper_code: 'PC-AUT-309',  paper_name: 'Automotive Safety Systems', paper_type: 'core', credits: 3 },
  { year: 3, semester: 6, paper_code: 'PE-AUT-301',  paper_name: 'Professional Elective I', paper_type: 'elective', credits: 3 },
  { year: 3, semester: 6, paper_code: 'OE-AUT-302',  paper_name: 'Open Elective II', paper_type: 'elective', credits: 3 },
  // Semester 7
  { year: 4, semester: 7, paper_code: 'PC-AUT-401',  paper_name: 'Hybrid and Electric Vehicles', paper_type: 'core', credits: 4 },
  { year: 4, semester: 7, paper_code: 'PC-AUT-402',  paper_name: 'Automotive Embedded Systems', paper_type: 'core', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PC-AUT-403',  paper_name: 'Automotive Aerodynamics', paper_type: 'core', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PE-AUT-401',  paper_name: 'Vehicle Maintenance and Servicing', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PE-AUT-402',  paper_name: 'Automotive Testing and Certification', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 7, paper_code: 'PR-AUT-401',  paper_name: 'Project Phase I', paper_type: 'core', credits: 4 },
  // Semester 8
  { year: 4, semester: 8, paper_code: 'PC-AUT-404',  paper_name: 'Autonomous and Connected Vehicles', paper_type: 'core', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PC-AUT-405',  paper_name: 'Automotive Production and Supply Chain', paper_type: 'core', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PE-AUT-403',  paper_name: 'Motor Sports Engineering', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PE-AUT-404',  paper_name: 'Tribology in Automobiles', paper_type: 'elective', credits: 3 },
  { year: 4, semester: 8, paper_code: 'PR-AUT-402',  paper_name: 'Project Phase II', paper_type: 'core', credits: 6 },
  { year: 4, semester: 8, paper_code: 'PR-AUT-403',  paper_name: 'Internship', paper_type: 'core', credits: 2 },
];

const specs = [
  { name: 'Mechatronics Engineering', papers: MECHATRONICS },
  { name: 'Automobile Engineering',   papers: AUTOMOBILE },
];

for (const { name, papers } of specs) {
  const delUrl = `${url}/rest/v1/university_syllabi`
    + `?university_name=eq.${encodeURIComponent('AICTE Model Curriculum')}`
    + `&specialisation=eq.${encodeURIComponent(name)}`;
  const delRes = await fetch(delUrl, { method: 'DELETE', headers });
  if (!delRes.ok) {
    console.error(`✗ DELETE failed for ${name}: ${delRes.status} ${await delRes.text()}`);
    process.exit(1);
  }
  console.log(`✓ Cleared existing AICTE ${name} rows`);

  const body = papers.map(p => ({
    university_name: 'AICTE Model Curriculum',
    degree: 'B.Tech',
    specialisation: name,
    year: p.year,
    semester: p.semester,
    paper_code: p.paper_code,
    paper_name: p.paper_name,
    paper_type: p.paper_type,
    credits: p.credits,
    primary_saathi: 'mechsaathi', // user directive: all Mech-family branches → MechSaathi
    framework: 'AICTE Model Curriculum',
  }));

  const insRes = await fetch(`${url}/rest/v1/university_syllabi`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!insRes.ok) {
    console.error(`✗ INSERT failed for ${name}: ${insRes.status} ${await insRes.text()}`);
    process.exit(1);
  }
  console.log(`✓ Inserted ${papers.length} AICTE ${name} rows`);
}

console.log('\nDone. Next step: run scripts/export-university-syllabi.mjs to refresh the seed snapshot.');
