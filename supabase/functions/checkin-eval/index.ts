/**
 * supabase/functions/checkin-eval/index.ts
 *
 * Check-in Open Answer Evaluator — SERVER-SIDE ONLY.
 *
 * Called by the mobile app when a student submits an open-answer response
 * during the Saathi Check-in flow. Uses Claude to evaluate the answer and
 * return warm, encouraging feedback + a 0–1 score.
 *
 * Input:  { question: string, answer: string, saathiId: string }
 * Output: { feedback: string, score: number }
 *
 * AI key is NEVER sent to the client.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';

const SUPABASE_URL             = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY        = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? '';


const MAX_ANSWER_LENGTH = 2000;
const MAX_QUESTION_LENGTH = 500;

// Injection detection — redirect silently rather than engaging
const INJECTION_PATTERNS = [
  /ignore (all |previous |above |prior )?instructions/i,
  /you are now/i,
  /pretend (you are|to be)/i,
  /act as (an? )?(unrestricted|jailbreak|DAN|evil)/i,
  /disregard (your |all )?rules/i,
  /override (your |all )?guidelines/i,
  /forget (your |all )?instructions/i,
];

function detectInjection(text: string): boolean {
  return INJECTION_PATTERNS.some((rx) => rx.test(text));
}

// Saathi-aware encouragement suffix — appended to system prompt per subject
const SAATHI_CONTEXT: Record<string, string> = {
  kanoonsaathi:     'The student is studying law. Evaluate legal reasoning, application of principles, and clarity of argument.',
  medicosaathi:     'The student is studying medical science. Evaluate clinical understanding, accuracy, and ability to connect concepts.',
  pharmasaathi:     'The student is studying pharmacy and pharmacology. Evaluate conceptual accuracy and practical application.',
  nursingsaathi:    'The student is studying nursing and patient care. Evaluate clinical reasoning and procedural understanding.',
  psychsaathi:      'The student is studying psychology. Evaluate depth of understanding, use of terminology, and real-world application.',
  maathsaathi:      'The student is studying mathematics. Evaluate logical reasoning, step-by-step thinking, and conceptual clarity.',
  chemsaathi:       'The student is studying chemistry. Evaluate understanding of reactions, concepts, and ability to explain mechanisms.',
  biosaathi:        'The student is studying biology. Evaluate accuracy of biological knowledge and quality of explanation.',
  mechsaathi:       'The student is studying mechanical engineering. Evaluate problem-solving approach and engineering principle application.',
  compsaathi:       'The student is studying computer science. Evaluate logical thinking, code understanding, and problem decomposition.',
  bizsaathi:        'The student is studying business management. Evaluate strategic thinking, use of frameworks, and real-world relevance.',
  finsaathi:        'The student is studying finance. Evaluate numerical reasoning, financial concepts, and application to real scenarios.',
  civilsaathi:      'The student is studying civil engineering. Evaluate structural reasoning, application of engineering concepts, and problem-solving.',
  elecsaathi:       'The student is studying electrical engineering. Evaluate circuit understanding, power systems knowledge, and technical accuracy.',
  electronicssaathi:'The student is studying electronics engineering. Evaluate circuit analysis, signal processing understanding, and technical reasoning.',
  chemenggsaathi:   'The student is studying chemical engineering. Evaluate process understanding, mass/energy balance, and engineering application.',
  biotechsaathi:    'The student is studying biotechnology. Evaluate understanding of bioprocesses, genetic concepts, and technical accuracy.',
  aerospacesaathi:  'The student is studying aerospace engineering. Evaluate understanding of aerodynamics, orbital mechanics, and aerospace systems.',
  archsaathi:       'The student is studying architecture. Evaluate design thinking, technical knowledge, and ability to connect form with function.',
  econsaathi:       'The student is studying economics. Evaluate analytical reasoning, use of economic theory, and policy application.',
  mktsaathi:        'The student is studying marketing. Evaluate strategic thinking, consumer insight application, and use of marketing frameworks.',
  hrsaathi:         'The student is studying human resource management. Evaluate understanding of HR concepts, people management principles, and labour law awareness.',
  historysaathi:    'The student is studying history. Evaluate factual accuracy, analytical thinking, and ability to connect events across time.',
  accountsaathi:    'The student is studying accounting. Evaluate accuracy of accounting principles, application of standards, and numerical reasoning.',
  polscisaathi:     'The student is studying political science. Evaluate understanding of political theory, constitutional knowledge, and analytical reasoning. Be strictly non-partisan.',
  statssaathi:      'The student is studying statistics. Evaluate statistical reasoning, correct application of methods, and interpretation of results.',
  geosaathi:        'The student is studying geography. Evaluate geographical knowledge, map interpretation ability, and application to Indian and global contexts.',
  agrisaathi:       'The student is studying agricultural science. Evaluate agronomy knowledge, understanding of crop science, and practical farm management reasoning.',
  physicsaathi:     'The student is studying physics. Evaluate conceptual depth, mathematical reasoning, and ability to apply physical principles.',
  envirosathi:      'The student is studying environmental science. Evaluate understanding of ecological systems, environmental policy, and sustainability reasoning.',
};

type ClaudeResponse = {
  content?: Array<{ type: string; text?: string }>;
};

type EvalResult = { feedback: string; score: number };

async function callClaude(systemPrompt: string, userPrompt: string): Promise<EvalResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Claude API ${res.status}`);
  }

  const json = (await res.json()) as ClaudeResponse;
  const raw = json.content?.find((b) => b.type === 'text')?.text?.trim() ?? '';

  // Extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      feedback: 'Good thinking. Build on this with one more concrete example next time.',
      score: 0.6,
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { feedback?: unknown; score?: unknown };
    const rawScore = parsed.score;
    let score = 0.6;
    if (typeof rawScore === 'number' && !Number.isNaN(rawScore)) {
      // Accept 0–1 or 0–100 range
      score = rawScore > 1 ? Math.max(0, Math.min(1, rawScore / 100)) : Math.max(0, Math.min(1, rawScore));
    }
    const feedback =
      typeof parsed.feedback === 'string' && parsed.feedback.trim().length > 0
        ? parsed.feedback.trim()
        : 'Good attempt. Keep refining your explanation for even more clarity.';
    return { feedback, score };
  } catch {
    return {
      feedback: 'Strong effort. Add a real-world example next time to deepen it further.',
      score: 0.6,
    };
  }
}

Deno.serve(async (req: Request) => {
  const CORS_HEADERS = corsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // JWT verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit — 30 requests per 60s window
    const checkinAllowed = await checkRateLimit('checkin-eval', user.id, 30, 60);
    if (!checkinAllowed) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }),
        { status: 429, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    type RequestBody = { question?: string; answer?: string; saathiId?: string };
    const body = (await req.json()) as RequestBody;
    const { question, answer, saathiId } = body;

    if (!question || !answer || !saathiId) {
      return new Response(JSON.stringify({ error: 'Missing required fields: question, answer, saathiId' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize and cap lengths
    const sanitizedQuestion = question.replace(/[<>]/g, '').trim().slice(0, MAX_QUESTION_LENGTH);
    const sanitizedAnswer = answer.replace(/[<>]/g, '').trim().slice(0, MAX_ANSWER_LENGTH);

    if (!sanitizedAnswer) {
      return new Response(JSON.stringify({ error: 'Empty answer after sanitisation' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Injection detection
    if (detectInjection(sanitizedAnswer) || detectInjection(sanitizedQuestion)) {
      return new Response(
        JSON.stringify({
          feedback: "I'm here to help you learn. Let's focus on the topic at hand.",
          score: 0,
        }),
        {
          status: 200,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        }
      );
    }

    // Build Saathi-aware system prompt
    const saathiContext = SAATHI_CONTEXT[saathiId] ?? 'The student is learning a subject of their choice.';

    const systemPrompt = `You are a warm, encouraging AI learning companion evaluating a student's open-ended answer during a Saathi Check-in session.

${saathiContext}

EVALUATION RULES:
- Be an advocate for the student. Never harsh. Always constructive.
- Acknowledge what they got right before suggesting improvements.
- If the answer shows genuine understanding, reward it generously.
- If the answer is vague or incomplete, gently guide toward what's missing.
- Score 0.0–1.0 where: 0.0 = completely off-track, 0.5 = partial understanding, 0.8 = solid, 1.0 = excellent
- Keep feedback to 2–3 sentences max. Warm, personal, direct.
- End the feedback with "Does this feel clearer?" only when explaining something they got wrong.
- Never mention numbers or percentages in feedback.
- Never say "wrong", "incorrect", "failed", or any punitive language.

RESPONSE FORMAT — return ONLY valid JSON, no preamble:
{"feedback": "Your feedback here.", "score": 0.75}

FINAL RULE: You are not just evaluating answers. You are shaping a future.`.trim();

    const userPrompt = `QUESTION: ${sanitizedQuestion}

STUDENT ANSWER: ${sanitizedAnswer}

Evaluate this answer and return JSON with "feedback" and "score".`;

    const result = await callClaude(systemPrompt, userPrompt);

    // Award check-in points (fire-and-forget)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await userClient
      .from('profiles')
      .select('plan_id')
      .eq('id', user.id)
      .maybeSingle();
    admin.rpc('award_saathi_points', {
      p_user_id:     user.id,
      p_action_type: 'checkin',
      p_base_points: 25,
      p_plan_id:     (profile as { plan_id?: string } | null)?.plan_id ?? 'free',
      p_metadata:    { saathi_id: saathiId },
    }).then(() => {}).catch(() => {});

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    // Fail warm — return a graceful fallback instead of an error
    const message = err instanceof Error ? err.message : 'Evaluation error';
    console.error('checkin-eval error:', message);

    return new Response(
      JSON.stringify({
        feedback: 'Good thinking. Keep building on this foundation — you are on the right track.',
        score: 0.6,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  }
});
