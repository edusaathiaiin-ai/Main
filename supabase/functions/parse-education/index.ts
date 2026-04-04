/**
 * supabase/functions/parse-education/index.ts
 *
 * Education Parser Edge Function
 *
 * JWT-protected POST endpoint.
 * Body: { rawInput: string }
 *
 * Flow:
 *   1. Verify JWT → get user_id
 *   2. Call Claude to extract structured fields from free text
 *   3. Fuzzy-match institution against colleges table (pg_trgm)
 *   4. Fuzzy-match degree against courses table (pg_trgm)
 *   5. Compute confidence score (0–100)
 *   6. Return structured result + save to profiles
 *
 * Handles: typos, abbreviations, Hindi/Gujarati mixing,
 *          "2nd yr bpharm lm college" → full structured data
 *
 * Deploy: supabase functions deploy parse-education
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rateLimit.ts';
import { corsHeaders } from '../_shared/cors.ts';

// ── Env ───────────────────────────────────────────────────────────────────────

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY        = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const ANTHROPIC_API_KEY        = Deno.env.get('ANTHROPIC_API_KEY') ?? '';


// ── Types ─────────────────────────────────────────────────────────────────────

type ClaudeExtraction = {
  year: number | null;
  degree: string | null;
  institution: string | null;
  city: string | null;
  saathi: string | null;
};

type CollegeRow = {
  id: string;
  name: string;
  city: string;
  state: string;
  university: string | null;
  naac_grade: string | null;
  college_type: string | null;
  score: number;
};

type CourseRow = {
  id: string;
  name: string;
  saathi_slug: string | null;
  year_wise_subjects: Record<string, Record<string, string[]>> | null;
  score: number;
};

type ParseResponse = {
  parsed: ClaudeExtraction;
  college: CollegeRow | null;
  course: CourseRow | null;
  confidence: number;
  subjects: Record<string, string[]> | null;   // the matched year's subjects
  saathi_suggestion: string | null;
  alternatives: CollegeRow[];
};

// ── Claude extraction ─────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an education parser for Indian colleges and universities.
Extract from the student's free text the following fields:
- year_of_study: integer — which year they are in (1, 2, 3, 4, 5). Final year → last year of degree.
- degree_name: abbreviated form (e.g. "B.Pharm", "LLB", "MBBS", "B.Tech CSE", "BBA", "B.Com", "MBA", "B.Sc Nursing", "B.Arch")
- institution_name: college/university name as written or corrected from common abbreviations
- city: city of the institution if mentioned or implied
- saathi_suggestion: one of the EdUsaathiAI Saathi slugs: kanoonsaathi, medicosaathi, pharmasaathi, nursingsaathi, psychsaathi, compsaathi, elecsaathi, mechsaathi, civilsaathi, chemsaathi, biosaathi, bizsaathi, finsaathi, mktsaathi, hrsaathi, archsaathi, historysaathi, econsaathi, maathsaathi, envirosathi, chemengg saathi, biotechsaathi, aerospacesaathi, electronicssaathi

Rules:
- Return ONLY a valid JSON object. No markdown, no explanation.
- Handle typos, abbreviations, Hindi/Gujarati mixing gracefully.
- "bpharm" → "B.Pharm", "llb" → "LLB", "mbbs" → "MBBS", "cse" / "comp sci" → "B.Tech CSE"
- "lm college" / "lm pharmacy" → "LM College of Pharmacy"
- "final yr" / "last year" → last year of the degree (4 for B.Tech, 3 for LLB, 5 for MBBS)
- "1st" / "first" / "fresher" → 1
- Set null for any field you cannot determine.
- Never hallucinate institution names — only output what's clearly implied.
- Degree-to-saathi mappings: "chemical engineering"/"chem engg"/"chemE" → "chemengg saathi"; "biotechnology"/"biotech" → "biotechsaathi"; "aerospace"/"aeronautical" → "aerospacesaathi"; "electronics" (without "computer") / "e&tc" / "telecommunication" → "electronicssaathi"; "electronics and computer" → compsaathi; ECE → ask user to confirm.

Examples:
Input: "2nd yr bpharm lm college ahmedabad"
Output: {"year":2,"degree":"B.Pharm","institution":"LM College of Pharmacy","city":"Ahmedabad","saathi_suggestion":"pharmasaathi"}

Input: "final year llb"
Output: {"year":3,"degree":"LLB","institution":null,"city":null,"saathi_suggestion":"kanoonsaathi"}

Input: "3rd year mbbs aiims delhi"
Output: {"year":3,"degree":"MBBS","institution":"AIIMS New Delhi","city":"New Delhi","saathi_suggestion":"medicosaathi"}

Input: "mba 1st sem iit bombay"
Output: {"year":1,"degree":"MBA","institution":"IIT Bombay","city":"Mumbai","saathi_suggestion":"bizsaathi"}

Input: "BE CSE 4th year VIT vellore"
Output: {"year":4,"degree":"B.Tech CSE","institution":"Vellore Institute of Technology","city":"Vellore","saathi_suggestion":"compsaathi"}

Input: "3rd year B.Tech chemical engineering NIT Surat"
Output: {"year":3,"degree":"B.Tech Chemical Engineering","institution":"NIT Surat","city":"Surat","saathi_suggestion":"chemengg saathi"}

Input: "2nd year Biotechnology Amity"
Output: {"year":2,"degree":"B.Tech Biotechnology","institution":"Amity University","city":null,"saathi_suggestion":"biotechsaathi"}

Input: "1st year aerospace IIT Bombay"
Output: {"year":1,"degree":"B.Tech Aerospace Engineering","institution":"IIT Bombay","city":"Mumbai","saathi_suggestion":"aerospacesaathi"}

Input: "B.Tech Electronics 3rd year SPCE"
Output: {"year":3,"degree":"B.Tech Electronics Engineering","institution":"SPCE","city":null,"saathi_suggestion":"electronicssaathi"}`;

async function callClaude(rawInput: string): Promise<ClaudeExtraction> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',      // cheapest + fastest — enough for extraction
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: rawInput }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const text: string = data.content?.[0]?.text ?? '{}';

  try {
    // Strip any accidental markdown fences
    const clean = text.replace(/```json?/gi, '').replace(/```/g, '').trim();
    return JSON.parse(clean) as ClaudeExtraction;
  } catch {
    console.error('[parse-education] Claude returned non-JSON:', text);
    return { year: null, degree: null, institution: null, city: null, saathi: null };
  }
}

// ── Confidence scoring ────────────────────────────────────────────────────────

function computeConfidence(
  college: CollegeRow | null,
  course: CourseRow | null,
  year: number | null,
  extracted: ClaudeExtraction,
): number {
  let score = 0;

  if (college) {
    if (college.score >= 0.95) score += 40;       // exact / near-exact match
    else if (college.score >= 0.8) score += 30;   // strong fuzzy
    else if (college.score >= 0.5) score += 20;   // moderate fuzzy
    else score += 10;                              // weak match (alias hit)

    // City corroboration
    if (
      extracted.city &&
      college.city &&
      college.city.toLowerCase().includes(extracted.city.toLowerCase())
    ) score += 10;
  }

  if (course) {
    if (course.score >= 0.9) score += 30;         // exact abbreviation match
    else if (course.score >= 0.6) score += 20;    // fuzzy
  }

  if (year !== null && year >= 1 && year <= 5) score += 20;

  return Math.min(score, 100);
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── 1. Verify JWT ──────────────────────────────────────────────────────────

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const jwt = authHeader.slice(7);

  // Use anon client to verify the user's token
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit: 10 parse calls per user per minute (onboarding only — very generous)
  const allowed = await checkRateLimit('parse-education', user.id, 10, 60);
  if (!allowed) return rateLimitResponse(CORS_HEADERS);

  // ── 2. Parse body ──────────────────────────────────────────────────────────

  let rawInput: string;
  try {
    const body = await req.json();
    rawInput = (body?.rawInput ?? '').toString().trim().slice(0, 500);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!rawInput) {
    return new Response(JSON.stringify({ error: 'rawInput is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── 3. Call Claude ─────────────────────────────────────────────────────────

  let extracted: ClaudeExtraction;
  try {
    extracted = await callClaude(rawInput);
  } catch (e) {
    console.error('[parse-education] Claude call failed:', e);
    extracted = { year: null, degree: null, institution: null, city: null, saathi: null };
  }

  console.log('[parse-education] Claude extracted:', JSON.stringify(extracted));

  // ── 4. Fuzzy-match institution in DB ───────────────────────────────────────

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let collegeCandidates: CollegeRow[] = [];
  const institutionQuery = extracted.institution ?? rawInput;

  if (institutionQuery) {
    const { data: collegeData, error: collegeErr } = await admin.rpc(
      'search_colleges',
      { query_text: institutionQuery, result_limit: 5 },
    );

    if (collegeErr) {
      // Fallback: raw SQL approach if RPC doesn't exist yet
      console.warn('[parse-education] RPC search_colleges not found, using inline query');
      const { data: fallback } = await admin
        .from('colleges')
        .select('id, name, city, state, university, naac_grade, college_type')
        .or(
          `name.ilike.%${institutionQuery}%,aliases.cs.{${institutionQuery}}`
        )
        .limit(5);

      collegeCandidates = (fallback ?? []).map((c) => ({ ...c, score: 0.5 }));
    } else {
      collegeCandidates = (collegeData ?? []) as CollegeRow[];
    }
  }

  const bestCollege: CollegeRow | null = collegeCandidates[0] ?? null;
  const alternatives: CollegeRow[] = collegeCandidates.slice(1);

  // ── 5. Fuzzy-match degree in courses ──────────────────────────────────────

  let bestCourse: CourseRow | null = null;
  const degreeQuery = extracted.degree ?? '';

  if (degreeQuery) {
    const { data: courseData, error: courseErr } = await admin.rpc(
      'search_courses',
      { query_text: degreeQuery, result_limit: 3 },
    );

    if (courseErr) {
      // Fallback
      console.warn('[parse-education] RPC search_courses not found, using inline query');
      const { data: fallback } = await admin
        .from('courses')
        .select('id, name, saathi_slug, year_wise_subjects')
        .or(
          `abbreviations.cs.{${degreeQuery}},common_aliases.cs.{${degreeQuery.toLowerCase()}},name.ilike.%${degreeQuery}%`
        )
        .limit(3);

      if (fallback && fallback.length > 0) {
        bestCourse = { ...fallback[0], score: 0.5 } as CourseRow;
      }
    } else {
      bestCourse = (courseData?.[0] ?? null) as CourseRow | null;
    }
  }

  // ── 6. Confidence ─────────────────────────────────────────────────────────

  const confidence = computeConfidence(bestCollege, bestCourse, extracted.year, extracted);

  // ── 7. Extract subjects for the detected year ─────────────────────────────

  let subjects: Record<string, string[]> | null = null;

  if (bestCourse?.year_wise_subjects && extracted.year) {
    const yearKey = String(extracted.year);
    const yearData = bestCourse.year_wise_subjects[yearKey];
    if (yearData) subjects = yearData as Record<string, string[]>;
  }

  // ── 8. Determine saathi suggestion (course takes priority over Claude) ─────

  const saathiSuggestion: string | null =
    bestCourse?.saathi_slug ?? extracted.saathi ?? null;

  // ── 9. Save parse result to profiles (fire-and-forget) ────────────────────

  admin.from('profiles').update({
    raw_education_input: rawInput,
    parsed_college_id:   bestCollege?.id ?? null,
    parsed_course_id:    bestCourse?.id ?? null,
    parsed_year:         extracted.year ?? null,
    parse_confidence:    confidence / 100,
    parse_confirmed:     false,
  }).eq('id', user.id).then(({ error }: { error: { message: string } | null }) => {
    if (error) console.warn('[parse-education] profile update failed:', error.message);
  });

  // ── 10. Return ─────────────────────────────────────────────────────────────

  const response: ParseResponse = {
    parsed: extracted,
    college: bestCollege,
    course: bestCourse
      ? {
          id:                  bestCourse.id,
          name:                bestCourse.name,
          saathi_slug:         bestCourse.saathi_slug,
          year_wise_subjects:  bestCourse.year_wise_subjects,
          score:               bestCourse.score,
        }
      : null,
    confidence,
    subjects,
    saathi_suggestion: saathiSuggestion,
    alternatives,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
