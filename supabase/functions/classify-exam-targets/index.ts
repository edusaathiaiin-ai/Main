/**
 * supabase/functions/classify-exam-targets/index.ts
 *
 * One-shot LLM classifier — maps existing free-text profiles.exam_target
 * values to canonical EXAM_REGISTRY ids.
 *
 * Run pattern:
 *   - Admin invokes via dashboard or curl with admin JWT.
 *   - Picks all profiles where exam_target IS NOT NULL AND exam_target_id IS NULL.
 *   - Sends each batch to Groq with the canonical exam list + a strict JSON
 *     schema. Confidence < 0.70 → leave id NULL (student picks on next login).
 *   - Writes exam_target_id + exam_target_year (year auto-derived from
 *     EXAM_REGISTRY.next_date — bumps to following year if already past).
 *
 * Idempotent. Re-running only touches still-NULL rows.
 *
 * IMPORTANT: EXAM_REGISTRY here is intentionally duplicated from
 * website/src/constants/exams.ts. Edge Functions cannot import from the
 * Next app. When the registry changes, update both — or factor it later
 * into a shared JSON file under supabase/_registry/.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const CONFIDENCE_THRESHOLD = 0.70;
const BATCH_SIZE = 25;

// Mirror of website/src/constants/exams.ts — keep ids in sync.
const EXAM_REGISTRY: ReadonlyArray<{
  id: string;
  name: string;
  full_name: string;
  next_date: string;
}> = [
  { id: 'cat',            name: 'CAT',           full_name: 'Common Admission Test',                                   next_date: '2026-11-29' },
  { id: 'clat',           name: 'CLAT',          full_name: 'Common Law Admission Test',                               next_date: '2026-12-01' },
  { id: 'neet_ug',        name: 'NEET UG',       full_name: 'National Eligibility Entrance Test (Undergraduate)',     next_date: '2026-05-03' },
  { id: 'neet_pg',        name: 'NEET PG',       full_name: 'National Eligibility Entrance Test (Postgraduate)',      next_date: '2026-03-15' },
  { id: 'jee_main',       name: 'JEE Main',      full_name: 'Joint Entrance Examination Main',                        next_date: '2027-01-20' },
  { id: 'jee_advanced',   name: 'JEE Advanced',  full_name: 'Joint Entrance Examination Advanced',                    next_date: '2026-05-24' },
  { id: 'gate',           name: 'GATE',          full_name: 'Graduate Aptitude Test in Engineering',                  next_date: '2027-02-07' },
  { id: 'upsc_prelims',   name: 'UPSC Prelims',  full_name: 'UPSC Civil Services Preliminary Examination',            next_date: '2026-06-07' },
  { id: 'upsc_mains',     name: 'UPSC Mains',    full_name: 'UPSC Civil Services Main Examination',                   next_date: '2026-09-20' },
  { id: 'ssc_cgl',        name: 'SSC CGL',       full_name: 'Staff Selection Commission Combined Graduate Level',     next_date: '2026-09-01' },
  { id: 'ca_foundation',  name: 'CA Foundation', full_name: 'Chartered Accountancy Foundation Examination',           next_date: '2026-05-15' },
  { id: 'ugc_net',        name: 'UGC NET',       full_name: 'University Grants Commission National Eligibility Test', next_date: '2026-06-15' },
  { id: 'gre',            name: 'GRE',           full_name: 'Graduate Record Examination',                            next_date: '2026-12-31' },
  { id: 'gmat',           name: 'GMAT',          full_name: 'Graduate Management Admission Test',                     next_date: '2026-12-31' },
  { id: 'fmge',           name: 'FMGE',          full_name: 'Foreign Medical Graduate Examination',                   next_date: '2026-06-20' },
];

function inferYear(examId: string): number | null {
  const exam = EXAM_REGISTRY.find((e) => e.id === examId);
  if (!exam) return null;
  const examDate = new Date(exam.next_date + 'T00:00:00Z');
  return examDate.getTime() < Date.now()
    ? examDate.getUTCFullYear() + 1
    : examDate.getUTCFullYear();
}

type Candidate = { user_id: string; exam_target: string };
type Classification = { user_id: string; exam_id: string | null; confidence: number };

async function classifyBatch(candidates: Candidate[]): Promise<Classification[]> {
  if (candidates.length === 0) return [];

  const examList = EXAM_REGISTRY
    .map((e) => `- ${e.id}: ${e.name} (${e.full_name})`)
    .join('\n');

  const items = candidates
    .map((c, i) => `${i + 1}. user_id="${c.user_id}" raw="${c.exam_target.replace(/"/g, "'")}"`)
    .join('\n');

  const prompt = `You are classifying free-text exam targets into canonical exam IDs.

CANONICAL EXAMS:
${examList}

Each input below is a free-text string a student wrote when asked their target exam.
For each, return the matching canonical id and your confidence (0.0 to 1.0).

Rules:
- "UPSC" with no other context → "upsc_prelims" (most students prep for prelims first).
- "NEET" with no other context → "neet_ug".
- "JEE" with no other context → "jee_main".
- "CA" with no other context → "ca_foundation".
- "engineering entrance" → "jee_main".
- "medical entrance" → "neet_ug".
- "civil services" → "upsc_prelims".
- If the input is None / empty / "no" / "not preparing" → exam_id null, confidence 1.0.
- If you genuinely can't decide → exam_id null, confidence < 0.70.

Return STRICT JSON: an array of objects { user_id, exam_id, confidence }.
No prose, no markdown fences. The user_id values are the exact strings given.

INPUTS:
${items}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'You are a precise classifier that returns strict JSON.' },
        { role: 'user', content: prompt + '\n\nReturn JSON shaped as: { "results": [ ... ] }' },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API ${res.status}: ${text}`);
  }

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = json.choices?.[0]?.message?.content ?? '{}';
  let parsed: { results?: Classification[] };
  try {
    parsed = JSON.parse(content) as { results?: Classification[] };
  } catch {
    return candidates.map((c) => ({ user_id: c.user_id, exam_id: null, confidence: 0 }));
  }

  const results = Array.isArray(parsed.results) ? parsed.results : [];
  // Validate each row's exam_id against the registry.
  const validIds = new Set(EXAM_REGISTRY.map((e) => e.id));
  return results.map((r): Classification => ({
    user_id: String(r.user_id),
    exam_id: r.exam_id && validIds.has(r.exam_id) ? r.exam_id : null,
    confidence: typeof r.confidence === 'number' ? r.confidence : 0,
  }));
}

serve(async (req: Request) => {
  const CORS = corsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // Admin-only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, CORS);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401, CORS);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: caller } = await admin.from('profiles').select('role').eq('id', user.id).single();
    if (!caller || caller.role !== 'admin') return json({ error: 'Forbidden' }, 403, CORS);

    if (!GROQ_API_KEY) return json({ error: 'GROQ_API_KEY not set' }, 500, CORS);

    // Pick candidates
    const { data: profiles, error: fetchError } = await admin
      .from('profiles')
      .select('id, exam_target')
      .not('exam_target', 'is', null)
      .neq('exam_target', '')
      .neq('exam_target', 'None')
      .is('exam_target_id', null)
      .limit(BATCH_SIZE);

    if (fetchError) return json({ error: fetchError.message }, 500, CORS);
    if (!profiles || profiles.length === 0) {
      return json({ ok: true, classified: 0, low_confidence: 0, batch_size: 0 }, 200, CORS);
    }

    const candidates: Candidate[] = profiles.map((p) => ({
      user_id: String(p.id),
      exam_target: String(p.exam_target ?? ''),
    }));

    const classifications = await classifyBatch(candidates);

    let classified = 0;
    let lowConfidence = 0;
    for (const c of classifications) {
      if (!c.exam_id || c.confidence < CONFIDENCE_THRESHOLD) {
        lowConfidence++;
        continue;
      }
      const year = inferYear(c.exam_id);
      const { error: updateError } = await admin
        .from('profiles')
        .update({
          exam_target_id: c.exam_id,
          exam_target_year: year,
        })
        .eq('id', c.user_id);
      if (!updateError) classified++;
    }

    return json(
      {
        ok: true,
        batch_size: candidates.length,
        classified,
        low_confidence: lowConfidence,
        threshold: CONFIDENCE_THRESHOLD,
      },
      200,
      CORS,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return json({ error: msg }, 500, corsHeaders(req));
  }
});

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}
