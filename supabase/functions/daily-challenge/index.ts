/**
 * supabase/functions/daily-challenge/index.ts
 *
 * Daily Challenge Engine — SERVER-SIDE ONLY.
 *
 * GET  ?saathi_id=X  → return today's challenge + user's attempt (if any)
 * POST { saathi_id, challenge_id, selected_option } → save attempt, return streak
 *
 * Challenge is generated via Groq on first request of the day for that vertical.
 * Cached in daily_challenges table (one row per vertical per day).
 * AI key is NEVER sent to the client.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { isSaathiSlug, isUUID } from '../_shared/validate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';


function getTodayIST(): string {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return ist.toISOString().split('T')[0];
}

const SAATHI_SUBJECTS: Record<string, string> = {
  kanoonsaathi: 'Indian law, constitutional provisions, IPC, CrPC, legal concepts and landmark cases',
  maathsaathi: 'mathematics — calculus, algebra, trigonometry, probability, coordinate geometry',
  chemsaathi: 'chemistry — organic reactions, periodic table, chemical bonding, thermodynamics',
  biosaathi: 'biology — cell biology, genetics, evolution, human physiology, ecology',
  pharmasaathi: 'pharmacology — drug mechanisms, pharmacokinetics, drug classes, therapeutics',
  medicosaathi: 'medicine — anatomy, pathology, clinical concepts, diagnostic reasoning',
  nursingsaathi: 'nursing — patient care, clinical procedures, pharmacology, anatomy',
  psychsaathi: 'psychology — theories, cognitive biases, developmental psychology, mental health',
  mechsaathi: 'mechanical engineering — thermodynamics, fluid mechanics, machine design, manufacturing',
  civilsaathi: 'civil engineering — structural analysis, fluid mechanics, geotechnical, construction',
  elecsaathi: 'electrical engineering — circuits, signal processing, power systems, control systems',
  compsaathi: 'computer science — data structures, algorithms, OS, DBMS, networking',
  envirosaathi: 'environmental science — pollution, ecology, sustainability, climate science',
  bizsaathi: 'business management — strategy, operations, organisational behaviour, marketing',
  finsaathi: 'finance — financial markets, accounting, investment analysis, corporate finance',
  mktsaathi: 'marketing — consumer behaviour, brand management, digital marketing, market research',
  hrsaathi: 'human resources — talent management, labour law, organisational development',
  archsaathi: 'architecture — design principles, history of architecture, building materials, urban planning',
  historysaathi: 'history — Indian history, world history, historiography, civilisations',
  econsaathi: 'economics — micro, macro, Indian economy, public finance, development economics',
  physisaathi: 'physics — mechanics, electromagnetism, optics, modern physics, thermodynamics',
  biotechsaathi: 'biotechnology — molecular biology, genetic engineering, fermentation, bioprocessing',
  aerosaathi: 'aerospace engineering — aerodynamics, propulsion, flight mechanics, aircraft structures',
  aerospacesaathi: 'aerospace engineering — aerodynamics, propulsion, flight mechanics, aircraft structures',
  chemenggsaathi: 'chemical engineering — mass transfer, reaction engineering, process design',
  electronicssaathi: 'electronics — semiconductor devices, digital circuits, microprocessors, VLSI',
};

type GeneratedChallenge = {
  question: string;
  options: string[];
  correct_option: number;
  explanation: string;
  topic: string;
  difficulty: string;
};

async function generateChallenge(saathiId: string): Promise<GeneratedChallenge> {
  const subject = SAATHI_SUBJECTS[saathiId] ?? 'general knowledge relevant to Indian higher education';

  const prompt = `Generate a single challenging multiple-choice question for a student studying: ${subject}.

Requirements:
- The question must test real conceptual understanding, not just memorisation.
- Exactly 4 answer options labelled A, B, C, D.
- One correct answer.
- Explanation must be educational and 1-2 sentences.
- Difficulty: medium (suitable for college-level students).
- Topic should be specific (e.g. "Article 21" not just "Law").

Respond ONLY with valid JSON in this exact format — no markdown, no extra text:
{
  "question": "...",
  "options": ["option A text", "option B text", "option C text", "option D text"],
  "correct_option": 0,
  "explanation": "...",
  "topic": "...",
  "difficulty": "medium"
}

correct_option is the 0-based index of the correct option (0=A, 1=B, 2=C, 3=D).`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 400,
    }),
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json() as { choices: { message: { content: string } }[] };
  const raw = data.choices[0]?.message?.content ?? '{}';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned) as GeneratedChallenge;
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
      status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return json({ error: 'Unauthorized' }, 401);

  // Rate limit — 10 requests per 60s window
  const challengeAllowed = await checkRateLimit('daily-challenge', user.id, 10, 60);
  if (!challengeAllowed) {
    return json({ error: 'Rate limit exceeded. Please slow down.' }, 429);
  }

  const today = getTodayIST();

  // ── GET: fetch today's challenge ─────────────────────────────────────────────
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const rawSaathiId = url.searchParams.get('saathi_id');
    if (!rawSaathiId || !isSaathiSlug(rawSaathiId)) {
      return json({ error: 'saathi_id is required and must be a valid Saathi slug' }, 400);
    }
    const saathiId = rawSaathiId;

    // Find or generate today's challenge
    let { data: challenge } = await serviceClient
      .from('daily_challenges')
      .select('*')
      .eq('vertical_id', saathiId)
      .eq('challenge_date', today)
      .maybeSingle();

    if (!challenge) {
      const generated = await generateChallenge(saathiId);
      const { data: inserted, error: insertErr } = await serviceClient
        .from('daily_challenges')
        .insert({
          vertical_id: saathiId,
          challenge_date: today,
          question: generated.question,
          options: generated.options,
          correct_option: generated.correct_option,
          explanation: generated.explanation,
          topic: generated.topic ?? saathiId,
          difficulty: generated.difficulty ?? 'medium',
        })
        .select()
        .single();

      if (insertErr) {
        // Another request may have inserted concurrently — fetch again
        const { data: retry } = await serviceClient
          .from('daily_challenges')
          .select('*')
          .eq('vertical_id', saathiId)
          .eq('challenge_date', today)
          .maybeSingle();
        challenge = retry;
      } else {
        challenge = inserted;
      }
    }

    if (!challenge) return json({ error: 'Failed to load challenge' }, 500);

    // Get user's existing attempt
    const { data: attempt } = await userClient
      .from('daily_challenge_attempts')
      .select('*')
      .eq('user_id', user.id)
      .eq('challenge_id', challenge.id)
      .maybeSingle();

    // Only reveal correct_option if user has already attempted
    const safeChallenge = attempt
      ? challenge
      : { ...challenge, correct_option: -1, explanation: '' };

    return json({ challenge: safeChallenge, attempt: attempt ?? null });
  }

  // ── POST: save attempt + calculate streak ────────────────────────────────────
  if (req.method === 'POST') {
    const body = await req.json() as {
      challenge_id: string;
      selected_option: number;
    };

    const { challenge_id, selected_option } = body;
    if (!challenge_id || selected_option === undefined) {
      return json({ error: 'Missing fields' }, 400);
    }
    if (!isUUID(challenge_id)) {
      return json({ error: 'Invalid challenge_id' }, 400);
    }
    if (typeof selected_option !== 'number' || !Number.isInteger(selected_option) || selected_option < 0 || selected_option > 3) {
      return json({ error: 'selected_option must be 0, 1, 2, or 3' }, 400);
    }

    // Fetch the challenge (need correct_option)
    const { data: challenge } = await serviceClient
      .from('daily_challenges')
      .select('correct_option, explanation, question, options, topic, difficulty, challenge_date, vertical_id')
      .eq('id', challenge_id)
      .single();

    if (!challenge) return json({ error: 'Challenge not found' }, 404);
    const is_correct = selected_option === challenge.correct_option;

    // Calculate streak: count consecutive days with a correct attempt
    const { data: recentAttempts } = await userClient
      .from('daily_challenge_attempts')
      .select('attempted_at, is_correct')
      .eq('user_id', user.id)
      .order('attempted_at', { ascending: false })
      .limit(30);

    let streak = is_correct ? 1 : 0;
    if (is_correct && recentAttempts && recentAttempts.length > 0) {
      const dates = new Set(
        recentAttempts
          .filter((a) => a.is_correct)
          .map((a) => (a.attempted_at as string).split('T')[0])
      );
      let checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - 1);
      while (dates.has(checkDate.toISOString().split('T')[0])) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      }
    }

    // Insert attempt (upsert in case of retry)
    const { error: insertErr } = await userClient
      .from('daily_challenge_attempts')
      .upsert({
        user_id: user.id,
        challenge_id,
        selected_option,
        is_correct,
        streak_count: streak,
      }, { onConflict: 'user_id,challenge_id' });

    if (insertErr) return json({ error: 'Failed to save attempt' }, 500);

    return json({
      is_correct,
      streak,
      correct_option: challenge.correct_option,
      explanation: challenge.explanation,
    });
  }

  return json({ error: 'Method not allowed' }, 405);
});
